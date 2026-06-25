import type {
  PlayerState,
  StatDelta,
  StatKey,
  Story,
  StoryNode,
  Choice,
  PersonalityArchetype,
  CaseFlow,
} from "@/types/story";
import { INITIAL_STATS } from "@/types/story";
import { DEFAULT_CASE_ID, getStory } from "@/data/cases";
import { computeBaselineMirrorIntegrity } from "@/lib/season-history";
import { personalizeNarrative } from "@/lib/executor-identity";

const STORAGE_PREFIX = "ai-will-executor-v04";

function storageKey(storyId: string): string {
  return `${STORAGE_PREFIX}:${storyId}`;
}

function mergeFlags(
  flags: string[],
  extra?: string[]
): string[] {
  if (!extra?.length) return flags;
  return [...new Set([...flags, ...extra])];
}

export function isOnboardingNode(story: Story, nodeId: string): boolean {
  return story.flow.onboardingNodeIds.includes(nodeId);
}

export function isHubNode(story: Story, nodeId: string): boolean {
  return nodeId === story.flow.hubNodeId;
}

export function createInitialState(
  story: Story,
  playerId: string
): PlayerState {
  const stats = { ...INITIAL_STATS };
  if (story.id === "case-d399") {
    stats.mirror_integrity = computeBaselineMirrorIntegrity();
  }
  const now = new Date().toISOString();
  return {
    storyId: story.id,
    playerId,
    currentNodeId: story.startNodeId,
    stats,
    viewedNodes: [story.startNodeId],
    choiceHistory: [],
    nodeChoices: {},
    flags: [],
    phase: "intro",
    endingId: null,
    verdictChoiceId: null,
    startedAt: now,
    completedAt: null,
    updatedAt: now,
  };
}

export function applyStatDelta(
  stats: Record<StatKey, number>,
  delta: StatDelta
): Record<StatKey, number> {
  const keys: StatKey[] = [
    "legal",
    "empathy",
    "suspicion",
    "public_trust",
    "social_stability",
    "truth_pressure",
    "mirror_integrity",
  ];
  const next = { ...stats };
  for (const key of keys) {
    if (delta[key] !== undefined) {
      next[key] += delta[key]!;
    }
  }
  return next;
}

export function negateStatDelta(delta: StatDelta): StatDelta {
  const result: StatDelta = {};
  const keys: StatKey[] = [
    "legal",
    "empathy",
    "suspicion",
    "public_trust",
    "social_stability",
    "truth_pressure",
    "mirror_integrity",
  ];
  for (const key of keys) {
    if (delta[key] !== undefined) {
      result[key] = -delta[key]!;
    }
  }
  return result;
}

export function hasStatOrFlagEffects(choice: Choice): boolean {
  return (
    choice.effects.legal !== undefined ||
    choice.effects.empathy !== undefined ||
    choice.effects.suspicion !== undefined ||
    choice.effects.public_trust !== undefined ||
    choice.effects.social_stability !== undefined ||
    choice.effects.truth_pressure !== undefined ||
    choice.effects.mirror_integrity !== undefined ||
    (choice.flags?.length ?? 0) > 0
  );
}

export function isNavigationChoice(choice: Choice): boolean {
  return choice.id === "back-console" || choice.id.endsWith("-back");
}

/** 僅供閱讀、單一「返回控制台」即可離開的節點 */
export function isReadOnlyNavigationNode(node: StoryNode | undefined): boolean {
  if (!node?.choices?.length || node.choices.length !== 1) return false;
  const only = node.choices[0];
  return isNavigationChoice(only) && !hasStatOrFlagEffects(only);
}

/** 節點是否需要玩家做出選擇（含閱讀後按返回、或證據/訪談的審查選項） */
export function nodeRequiresChoice(node: StoryNode | undefined): boolean {
  if (!node?.choices?.length) return false;
  if (isReadOnlyNavigationNode(node)) return false;
  if (node.choices.some(hasStatOrFlagEffects)) return true;
  return node.choices.every(isNavigationChoice);
}

export function isNodeChoicePending(
  state: PlayerState,
  story: Story,
  nodeId: string
): boolean {
  const node = story.nodes[nodeId];
  if (!state.viewedNodes.includes(nodeId)) return false;
  if (!nodeRequiresChoice(node)) return false;
  return !state.nodeChoices[nodeId];
}

function findChoiceOnNode(
  story: Story,
  nodeId: string,
  choiceId: string
): Choice | undefined {
  return story.nodes[nodeId]?.choices?.find((c) => c.id === choiceId);
}

function inferNodeChoicesFromHistory(
  story: Story,
  choiceHistory: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [nodeId, node] of Object.entries(story.nodes)) {
    const matches = (node.choices ?? []).filter((c) =>
      choiceHistory.includes(c.id)
    );
    if (matches.length === 0) continue;
    const last = matches.reduce((best, c) =>
      choiceHistory.lastIndexOf(c.id) > choiceHistory.lastIndexOf(best.id)
        ? c
        : best
    );
    result[nodeId] = last.id;
  }
  return result;
}

type ChoiceAction = {
  type: "CHOICE";
  choiceId: string;
  effects: StatDelta;
  nextNodeId?: string;
  flags?: string[];
};

function applyChoiceWithReversal(
  state: PlayerState,
  story: Story,
  nodeId: string,
  action: ChoiceAction
): Pick<PlayerState, "stats" | "flags" | "choiceHistory" | "nodeChoices"> {
  const node = story.nodes[nodeId];
  const newChoice = findChoiceOnNode(story, nodeId, action.choiceId);
  if (!node || !newChoice) {
    return {
      stats: applyStatDelta(state.stats, action.effects),
      flags: action.flags
        ? [...new Set([...state.flags, ...action.flags])]
        : state.flags,
      choiceHistory: [...state.choiceHistory, action.choiceId],
      nodeChoices: state.nodeChoices,
    };
  }

  let stats = state.stats;
  let flags = [...state.flags];
  let choiceHistory = [...state.choiceHistory];
  const nodeChoices = { ...state.nodeChoices };
  const prevChoiceId = nodeChoices[nodeId];

  if (hasStatOrFlagEffects(newChoice)) {
    if (prevChoiceId === action.choiceId) {
      return { stats, flags, choiceHistory, nodeChoices };
    }
    if (prevChoiceId) {
      const prevChoice = findChoiceOnNode(story, nodeId, prevChoiceId);
      if (prevChoice) {
        stats = applyStatDelta(stats, negateStatDelta(prevChoice.effects));
        if (prevChoice.flags) {
          flags = flags.filter((f) => !prevChoice.flags!.includes(f));
        }
        choiceHistory = choiceHistory.filter((id) => id !== prevChoiceId);
      }
    }
    stats = applyStatDelta(stats, action.effects);
    if (action.flags) {
      flags = [...new Set([...flags, ...action.flags])];
    }
    choiceHistory.push(action.choiceId);
    nodeChoices[nodeId] = action.choiceId;
  } else if (
    isNavigationChoice(newChoice) &&
    nodeRequiresChoice(node) &&
    !node.choices!.some(hasStatOrFlagEffects)
  ) {
    nodeChoices[nodeId] = action.choiceId;
  } else {
    stats = applyStatDelta(stats, action.effects);
    if (action.flags) {
      flags = [...new Set([...flags, ...action.flags])];
    }
    choiceHistory.push(action.choiceId);
  }

  return { stats, flags, choiceHistory, nodeChoices };
}

export function hasViewedAll(state: PlayerState, nodeIds: string[]): boolean {
  const viewed = new Set(state.viewedNodes);
  return nodeIds.every((id) => viewed.has(id));
}

function getInvestigation(flow: CaseFlow) {
  return flow.investigation;
}

export function hasCompletedAiInquiry(
  state: PlayerState,
  story: Story
): boolean {
  return hasViewedAll(state, getInvestigation(story.flow).aiNodeIds);
}

export function hasCompletedInvestigation(
  state: PlayerState,
  story: Story
): boolean {
  const inv = getInvestigation(story.flow);
  return (
    hasViewedAll(state, inv.evidenceNodeIds) &&
    hasViewedAll(state, inv.interviewNodeIds) &&
    hasViewedAll(state, inv.profileNodeIds) &&
    state.viewedNodes.includes(inv.briefNodeId) &&
    hasCompletedAiInquiry(state, story)
  );
}

export function hasCompletedCrossroads(
  state: PlayerState,
  story: Story
): boolean {
  return story.flow.crossroadChoicePrefixes.every((prefix) =>
    state.choiceHistory.some((id) => id.startsWith(prefix))
  );
}

export function canAccessContradictions(
  state: PlayerState,
  story: Story
): boolean {
  return hasCompletedInvestigation(state, story);
}

export function canAccessCrossroads(
  state: PlayerState,
  story: Story
): boolean {
  return state.viewedNodes.includes(story.flow.contradictionsNodeId);
}

export function canAccessVerdict(state: PlayerState, story: Story): boolean {
  return hasCompletedCrossroads(state, story);
}

export function getInvestigationProgress(
  state: PlayerState,
  story: Story
): {
  profiles: number;
  evidence: number;
  interviews: number;
  ai: boolean;
  brief: boolean;
} {
  const inv = getInvestigation(story.flow);
  const viewed = new Set(state.viewedNodes);
  return {
    brief: viewed.has(inv.briefNodeId),
    profiles: inv.profileNodeIds.filter((id) => viewed.has(id)).length,
    evidence: inv.evidenceNodeIds.filter((id) => viewed.has(id)).length,
    interviews: inv.interviewNodeIds.filter((id) => viewed.has(id)).length,
    ai: hasCompletedAiInquiry(state, story),
  };
}

function matchesHiddenFlags(
  rule: NonNullable<Story["flow"]["hiddenEnding"]>,
  flags: Set<string>
): boolean {
  const flagsOk =
    (!rule.requiredFlagsAny?.length ||
      rule.requiredFlagsAny.some((f) => flags.has(f))) &&
    (!rule.requiredFlagsAllGroups?.length ||
      rule.requiredFlagsAllGroups.every((group) =>
        group.some((f) => flags.has(f))
      ));
  return flagsOk;
}

export function canUnlockSecretVerdict(
  state: PlayerState,
  story: Story
): boolean {
  const rule = story.flow.hiddenEnding;
  if (!rule || !story.flow.secretVerdict) return false;

  const viewed = new Set(state.viewedNodes);
  const flags = new Set(state.flags);

  return (
    rule.requiredViewed.every((id) => viewed.has(id)) &&
    matchesHiddenFlags(rule, flags)
  );
}

export function canUnlockHiddenEnding(
  state: PlayerState,
  story: Story,
  verdictChoiceId: string
): boolean {
  const rule = story.flow.hiddenEnding;
  if (!rule) return false;

  const viewed = new Set(state.viewedNodes);
  const flags = new Set(state.flags);

  return (
    rule.requiredViewed.every((id) => viewed.has(id)) &&
    matchesHiddenFlags(rule, flags) &&
    rule.requiredVerdicts.includes(verdictChoiceId)
  );
}

export function resolveEnding(
  state: PlayerState,
  story: Story,
  verdictChoiceId: string
): string {
  const secret = story.flow.secretVerdict;
  if (secret && verdictChoiceId === secret.choiceId) {
    if (canUnlockHiddenEnding(state, story, verdictChoiceId)) {
      return story.flow.hiddenEnding!.endingId;
    }
    return secret.endingId;
  }

  if (canUnlockHiddenEnding(state, story, verdictChoiceId)) {
    return story.flow.hiddenEnding!.endingId;
  }

  const match = story.flow.verdictOptions.find(
    (v) => v.choiceId === verdictChoiceId
  );
  return match?.endingId ?? story.flow.verdictOptions[0]?.endingId ?? "ending-suspend";
}

export function resolvePersonality(
  state: PlayerState,
  archetypes: PersonalityArchetype[]
): PersonalityArchetype {
  const { stats, verdictChoiceId } = state;
  const byVerdict: Record<string, string> = {
    "verdict-public-review": "archetype-true-ending",
    "verdict-delete": "archetype-self-boundary-guard",
    "verdict-seal": "archetype-system-auditor",
    "verdict-supervised": "archetype-mirror-colleague",
    "verdict-takeover": "archetype-handover",
  };
  if (verdictChoiceId && byVerdict[verdictChoiceId]) {
    const verdictArchetype = archetypes.find(
      (a) => a.id === byVerdict[verdictChoiceId]
    );
    if (verdictArchetype) return verdictArchetype;
  }
  const matched = archetypes.filter((a) => a.condition(stats));
  if (matched.length > 0) {
    return matched[matched.length - 1];
  }
  return archetypes.find((a) => a.id === "archetype-grey")!;
}

export function getVerdictLabel(
  story: Story,
  verdictChoiceId: string | null
): string {
  if (!verdictChoiceId) return "—";
  const match = story.flow.verdictOptions.find(
    (v) => v.choiceId === verdictChoiceId
  );
  return match?.label ? personalizeNarrative(match.label) : "—";
}

export function saveGame(state: PlayerState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(state.storyId), JSON.stringify(state));
  } catch {
    // storage full or unavailable
  }
}


function migrateLegacySave(raw: string, storyId: string): PlayerState | null {
  try {
    const parsed = JSON.parse(raw) as PlayerState & { storyId?: string };
    if (!parsed.currentNodeId) return null;
    if (!parsed.storyId) parsed.storyId = storyId;
    if (!parsed.playerId) parsed.playerId = "legacy-local";
    if (!parsed.updatedAt) {
      parsed.updatedAt = parsed.startedAt ?? new Date().toISOString();
    }
    if (!parsed.phase) {
      const onboarding = new Set(["start", "case_login", "rules"]);
      parsed.phase = onboarding.has(parsed.currentNodeId) ? "intro" : "explore";
    }
    if (!parsed.flags) parsed.flags = [];
    if (!parsed.verdictChoiceId) parsed.verdictChoiceId = null;
    if (!parsed.nodeChoices) {
      const story = getStory(storyId);
      parsed.nodeChoices = story
        ? inferNodeChoicesFromHistory(story, parsed.choiceHistory ?? [])
        : {};
    }
    parsed.stats = { ...INITIAL_STATS, ...parsed.stats };
    return parsed;
  } catch {
    return null;
  }
}

export function loadGame(storyId: string): PlayerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(storageKey(storyId)) ??
      (storyId === DEFAULT_CASE_ID
        ? localStorage.getItem("ai-will-executor-v03-save")
        : null);
    if (!raw) return null;
    const parsed = migrateLegacySave(raw, storyId);
    if (!parsed || parsed.storyId !== storyId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(storyId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(storyId));
  if (storyId === DEFAULT_CASE_ID) {
    localStorage.removeItem("ai-will-executor-v03-save");
  }
}

export type GameAction =
  | { type: "NAVIGATE"; nodeId: string }
  | {
      type: "CHOICE";
      choiceId: string;
      effects: StatDelta;
      nextNodeId?: string;
      flags?: string[];
    }
  | { type: "VERDICT"; choiceId: string; effects: StatDelta }
  | { type: "RESET" };

function resolvePhase(
  story: Story,
  nodeId: string,
  choiceId?: string
): PlayerState["phase"] {
  const { flow } = story;
  if (nodeId === flow.verdictNodeId) return "verdict";
  if (choiceId?.startsWith("crossroad-")) return "crossroad";
  if (flow.onboardingNodeIds.includes(nodeId)) return "intro";
  if (flow.crossroadNodeIds.includes(nodeId)) return "crossroad";
  return "explore";
}

export function gameReducer(
  state: PlayerState,
  action: GameAction,
  story: Story
): PlayerState {
  const now = new Date().toISOString();
  const { flow } = story;

  switch (action.type) {
    case "NAVIGATE": {
      const viewed = state.viewedNodes.includes(action.nodeId)
        ? state.viewedNodes
        : [...state.viewedNodes, action.nodeId];
      const node = story.nodes[action.nodeId];
      const flags = mergeFlags(state.flags, node?.viewFlags);
      const phase = resolvePhase(story, action.nodeId);
      return {
        ...state,
        currentNodeId: action.nodeId,
        viewedNodes: viewed,
        flags,
        phase,
        updatedAt: now,
      };
    }

    case "CHOICE": {
      const nodeId = state.currentNodeId;
      const currentNode = story.nodes[nodeId];
      const nextNodeId = action.nextNodeId ?? state.currentNodeId;
      const nextNode = story.nodes[nextNodeId];
      const viewed = state.viewedNodes.includes(nextNodeId)
        ? state.viewedNodes
        : [...state.viewedNodes, nextNodeId];
      const stateWithCurrentFlags = {
        ...state,
        flags: mergeFlags(state.flags, currentNode?.viewFlags),
      };
      const applied = applyChoiceWithReversal(
        stateWithCurrentFlags,
        story,
        nodeId,
        action
      );
      const phase = resolvePhase(story, nextNodeId, action.choiceId);
      return {
        ...state,
        ...applied,
        flags: mergeFlags(applied.flags, nextNode?.viewFlags),
        currentNodeId: nextNodeId,
        viewedNodes: viewed,
        phase:
          phase === "intro" && nextNodeId === flow.hubNodeId ? "explore" : phase,
        updatedAt: now,
      };
    }

    case "VERDICT": {
      const finalStats = applyStatDelta(state.stats, action.effects);
      const endingId = resolveEnding(
        { ...state, stats: finalStats },
        story,
        action.choiceId
      );
      const endingFlags: string[] = [];
      if (story.id === "case-d399") {
        endingFlags.push("season_one_complete");
        const verdictEndingFlags: Record<string, string> = {
          "verdict-delete": "ending_delete_ai_vincent",
          "verdict-seal": "ending_seal_ai_vincent",
          "verdict-supervised": "ending_supervised_ai_vincent",
          "verdict-takeover": "ending_ai_vincent_takeover",
          "verdict-public-review": "ending_true_public_review",
        };
        const flag = verdictEndingFlags[action.choiceId];
        if (flag) endingFlags.push(flag);
      }
      return {
        ...state,
        stats: finalStats,
        flags: mergeFlags(state.flags, endingFlags),
        choiceHistory: [...state.choiceHistory, action.choiceId],
        phase: "ending",
        endingId,
        verdictChoiceId: action.choiceId,
        completedAt: now,
        updatedAt: now,
      };
    }

    case "RESET":
      return createInitialState(story, state.playerId);

    default:
      return state;
  }
}

export function getFlowStepStatus(
  state: PlayerState,
  story: Story
): Record<string, boolean> {
  const progress = getInvestigationProgress(state, story);
  const { flow } = story;
  const inv = flow.investigation;

  return {
    start: state.viewedNodes.includes("start"),
    case_login: state.viewedNodes.includes("case_login"),
    rules: state.viewedNodes.includes("rules"),
    console: state.viewedNodes.includes(flow.hubNodeId),
    brief: progress.brief,
    profile: progress.profiles === inv.profileNodeIds.length,
    evidence: progress.evidence === inv.evidenceNodeIds.length,
    interview: progress.interviews === inv.interviewNodeIds.length,
    ai_inquiry: progress.ai,
    contradictions: state.viewedNodes.includes(flow.contradictionsNodeId),
    crossroad_1: state.choiceHistory.some((c) =>
      c.startsWith(flow.crossroadChoicePrefixes[0] ?? "crossroad-1-")
    ),
    crossroad_2: state.choiceHistory.some((c) =>
      c.startsWith(flow.crossroadChoicePrefixes[1] ?? "crossroad-2-")
    ),
    crossroad_3: state.choiceHistory.some((c) =>
      c.startsWith(flow.crossroadChoicePrefixes[2] ?? "crossroad-3-")
    ),
    verdict: state.phase === "ending",
  };
}

export function getNextCrossroadNode(
  state: PlayerState,
  story: Story
): string | null {
  const { flow } = story;
  if (!state.viewedNodes.includes(flow.contradictionsNodeId)) return null;

  for (let i = 0; i < flow.crossroadNodeIds.length; i++) {
    const prefix = flow.crossroadChoicePrefixes[i];
    const nodeId = flow.crossroadNodeIds[i];
    if (prefix && nodeId && !state.choiceHistory.some((c) => c.startsWith(prefix))) {
      return nodeId;
    }
  }
  return null;
}

export function getExploredCount(state: PlayerState, story: Story): number {
  const inv = story.flow.investigation;
  const all = [
    ...inv.profileNodeIds,
    ...inv.evidenceNodeIds,
    ...inv.interviewNodeIds,
    ...inv.aiNodeIds,
  ];
  return all.filter((id) => state.viewedNodes.includes(id)).length;
}
