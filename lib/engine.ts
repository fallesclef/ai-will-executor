import type { GameState, StatDelta, StatKey, Story, PersonalityArchetype } from "@/types/story";
import { INITIAL_STATS } from "@/types/story";
import {
  EVIDENCE_NODE_IDS,
  INTERVIEW_NODE_IDS,
  PROFILE_NODE_IDS,
  AI_NODE_IDS,
  CROSSROAD_CHOICE_PREFIXES,
} from "@/data/story";

const STORAGE_KEY = "ai-will-executor-v03-save";

const ONBOARDING_NODES = new Set(["start", "case_login", "rules"]);
const HUB_NODES = new Set(["console"]);

export function isOnboardingNode(nodeId: string): boolean {
  return ONBOARDING_NODES.has(nodeId);
}

export function isHubNode(nodeId: string): boolean {
  return HUB_NODES.has(nodeId);
}

export function createInitialState(story: Story): GameState {
  return {
    currentNodeId: story.startNodeId,
    stats: { ...INITIAL_STATS },
    viewedNodes: [story.startNodeId],
    choiceHistory: [],
    flags: [],
    phase: "intro",
    endingId: null,
    verdictChoiceId: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function applyStatDelta(
  stats: Record<StatKey, number>,
  delta: StatDelta
): Record<StatKey, number> {
  const keys: StatKey[] = ["legal", "empathy", "suspicion"];
  const next = { ...stats };
  for (const key of keys) {
    if (delta[key] !== undefined) {
      next[key] += delta[key]!;
    }
  }
  return next;
}

export function hasViewedAll(state: GameState, nodeIds: string[]): boolean {
  const viewed = new Set(state.viewedNodes);
  return nodeIds.every((id) => viewed.has(id));
}

export function hasCompletedAiInquiry(state: GameState): boolean {
  return hasViewedAll(state, AI_NODE_IDS);
}

export function hasCompletedInvestigation(state: GameState): boolean {
  return (
    hasViewedAll(state, EVIDENCE_NODE_IDS) &&
    hasViewedAll(state, INTERVIEW_NODE_IDS) &&
    hasViewedAll(state, PROFILE_NODE_IDS) &&
    state.viewedNodes.includes("brief") &&
    hasCompletedAiInquiry(state)
  );
}

export function hasCompletedCrossroads(state: GameState): boolean {
  return CROSSROAD_CHOICE_PREFIXES.every((prefix) =>
    state.choiceHistory.some((id) => id.startsWith(prefix))
  );
}

export function canAccessContradictions(state: GameState): boolean {
  return hasCompletedInvestigation(state);
}

export function canAccessCrossroads(state: GameState): boolean {
  return state.viewedNodes.includes("contradictions");
}

export function canAccessVerdict(state: GameState): boolean {
  return hasCompletedCrossroads(state);
}

export function getInvestigationProgress(state: GameState): {
  profiles: number;
  evidence: number;
  interviews: number;
  ai: boolean;
  brief: boolean;
} {
  const viewed = new Set(state.viewedNodes);
  return {
    brief: viewed.has("brief"),
    profiles: PROFILE_NODE_IDS.filter((id) => viewed.has(id)).length,
    evidence: EVIDENCE_NODE_IDS.filter((id) => viewed.has(id)).length,
    interviews: INTERVIEW_NODE_IDS.filter((id) => viewed.has(id)).length,
    ai: hasCompletedAiInquiry(state),
  };
}

function canUnlockHiddenEnding(
  state: GameState,
  verdictChoiceId: string
): boolean {
  const viewed = new Set(state.viewedNodes);
  const flags = new Set(state.flags);
  return (
    viewed.has("evidence_01") &&
    viewed.has("evidence_02") &&
    viewed.has("evidence_06") &&
    viewed.has("ai_q04") &&
    (flags.has("recognize_ai_request") ||
      flags.has("conditional_ai_request")) &&
    (verdictChoiceId === "verdict-approve" ||
      verdictChoiceId === "verdict-seal")
  );
}

export function resolveEnding(
  state: GameState,
  _story: Story,
  verdictChoiceId: string
): string {
  if (canUnlockHiddenEnding(state, verdictChoiceId)) {
    return "ending-hidden";
  }

  switch (verdictChoiceId) {
    case "verdict-approve":
      return "ending-approve";
    case "verdict-deny":
      return "ending-deny";
    case "verdict-suspend":
      return "ending-suspend";
    case "verdict-seal":
      return "ending-seal";
    default:
      return "ending-suspend";
  }
}

export function resolvePersonality(
  stats: Record<StatKey, number>,
  archetypes: PersonalityArchetype[]
): PersonalityArchetype {
  const matched = archetypes.filter((a) => a.condition(stats));
  if (matched.length > 0) {
    return matched[matched.length - 1];
  }
  return archetypes.find((a) => a.id === "archetype-grey")!;
}

export function getVerdictLabel(verdictChoiceId: string | null): string {
  switch (verdictChoiceId) {
    case "verdict-approve":
      return "核准刪除";
    case "verdict-deny":
      return "駁回刪除";
    case "verdict-suspend":
      return "暫緩三十天";
    case "verdict-seal":
      return "封存不刪除";
    default:
      return "—";
  }
}

export function saveGame(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable
  }
}

export function loadGame(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed.phase) {
      parsed.phase = isOnboardingNode(parsed.currentNodeId) ? "intro" : "explore";
    }
    if (!parsed.flags) parsed.flags = [];
    if (!parsed.verdictChoiceId) parsed.verdictChoiceId = null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
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
  nodeId: string,
  choiceId?: string
): GameState["phase"] {
  if (nodeId === "verdict") return "verdict";
  if (choiceId?.startsWith("crossroad-")) return "crossroad";
  if (isOnboardingNode(nodeId)) return "intro";
  if (nodeId.startsWith("crossroad_")) return "crossroad";
  return "explore";
}

export function gameReducer(
  state: GameState,
  action: GameAction,
  story: Story
): GameState {
  switch (action.type) {
    case "NAVIGATE": {
      const viewed = state.viewedNodes.includes(action.nodeId)
        ? state.viewedNodes
        : [...state.viewedNodes, action.nodeId];
      const phase =
        action.nodeId === "verdict"
          ? "verdict"
          : isOnboardingNode(action.nodeId)
            ? "intro"
            : action.nodeId.startsWith("crossroad_")
              ? "crossroad"
              : "explore";
      return {
        ...state,
        currentNodeId: action.nodeId,
        viewedNodes: viewed,
        phase,
      };
    }

    case "CHOICE": {
      const nextNodeId = action.nextNodeId ?? state.currentNodeId;
      const viewed = state.viewedNodes.includes(nextNodeId)
        ? state.viewedNodes
        : [...state.viewedNodes, nextNodeId];
      const phase = resolvePhase(nextNodeId, action.choiceId);
      const flags = action.flags
        ? [...new Set([...state.flags, ...action.flags])]
        : state.flags;
      return {
        ...state,
        stats: applyStatDelta(state.stats, action.effects),
        choiceHistory: [...state.choiceHistory, action.choiceId],
        flags,
        currentNodeId: nextNodeId,
        viewedNodes: viewed,
        phase: phase === "intro" && nextNodeId === "console" ? "explore" : phase,
      };
    }

    case "VERDICT": {
      const finalStats = applyStatDelta(state.stats, action.effects);
      const endingId = resolveEnding(
        { ...state, stats: finalStats },
        story,
        action.choiceId
      );
      return {
        ...state,
        stats: finalStats,
        choiceHistory: [...state.choiceHistory, action.choiceId],
        phase: "ending",
        endingId,
        verdictChoiceId: action.choiceId,
        completedAt: new Date().toISOString(),
      };
    }

    case "RESET":
      return createInitialState(story);

    default:
      return state;
  }
}

export function getFlowStepStatus(
  state: GameState
): Record<string, boolean> {
  const progress = getInvestigationProgress(state);
  return {
    start: state.viewedNodes.includes("start"),
    case_login: state.viewedNodes.includes("case_login"),
    rules: state.viewedNodes.includes("rules"),
    console: state.viewedNodes.includes("console"),
    brief: progress.brief,
    profile: progress.profiles === PROFILE_NODE_IDS.length,
    evidence: progress.evidence === EVIDENCE_NODE_IDS.length,
    interview: progress.interviews === INTERVIEW_NODE_IDS.length,
    ai_inquiry: progress.ai,
    contradictions: state.viewedNodes.includes("contradictions"),
    crossroad_1: state.choiceHistory.some((c) => c.startsWith("crossroad-1-")),
    crossroad_2: state.choiceHistory.some((c) => c.startsWith("crossroad-2-")),
    crossroad_3: state.choiceHistory.some((c) => c.startsWith("crossroad-3-")),
    verdict: state.phase === "ending",
  };
}

export function getNextCrossroadNode(state: GameState): string | null {
  if (!state.viewedNodes.includes("contradictions")) return null;
  if (!state.choiceHistory.some((c) => c.startsWith("crossroad-1-"))) {
    return "crossroad_1";
  }
  if (!state.choiceHistory.some((c) => c.startsWith("crossroad-2-"))) {
    return "crossroad_2";
  }
  if (!state.choiceHistory.some((c) => c.startsWith("crossroad-3-"))) {
    return "crossroad_3";
  }
  return null;
}

export function getExploredCount(state: GameState): number {
  return (
    PROFILE_NODE_IDS.filter((id) => state.viewedNodes.includes(id)).length +
    EVIDENCE_NODE_IDS.filter((id) => state.viewedNodes.includes(id)).length +
    INTERVIEW_NODE_IDS.filter((id) => state.viewedNodes.includes(id)).length +
    AI_NODE_IDS.filter((id) => state.viewedNodes.includes(id)).length
  );
}
