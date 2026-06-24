import type { PlayerState, Story } from "@/types/story";
import { loadGame } from "@/lib/engine";

/** 第五案起才啟用跨案件共振 UI */
export const RESONANCE_PANEL_UNLOCK_CASE = "case-d173";

export const RESONANCE_CASE_IDS = [
  "case-d173",
  "case-d206",
  "case-d301",
  "case-d399",
] as const;

export interface ResonanceTier {
  id: number;
  label: string;
  unlockCaseId: string;
  /** 此階段共振強度上限（%） */
  maxPercent: number;
  status: "stable" | "warning" | "critical";
}

export const RESONANCE_TIERS: ResonanceTier[] = [
  {
    id: 1,
    label: "初次偵測",
    unlockCaseId: "case-d173",
    maxPercent: 42,
    status: "warning",
  },
  {
    id: 2,
    label: "共振攀升",
    unlockCaseId: "case-d206",
    maxPercent: 58,
    status: "warning",
  },
  {
    id: 3,
    label: "國家級門檻",
    unlockCaseId: "case-d301",
    maxPercent: 91,
    status: "critical",
  },
  {
    id: 4,
    label: "鏡像連結",
    unlockCaseId: "case-d399",
    maxPercent: 99,
    status: "critical",
  },
];

export interface ResonanceNode {
  id: string;
  caseId: string;
  number: string;
  title: string;
  quote: string;
  /** 第幾階段才出現在圖譜上（5=第五案） */
  resonanceTier: number;
  suppressed?: boolean;
  isMirror?: boolean;
  unlockCaseId: string;
}

export const RESONANCE_NODES: ResonanceNode[] = [
  {
    id: "r-d047",
    caseId: "case-d047",
    number: "D-047",
    title: "母親的刪除請求",
    quote: "請不要讓我變成他們不肯說再見的理由。",
    resonanceTier: 1,
    unlockCaseId: "case-d047",
  },
  {
    id: "r-d082",
    caseId: "case-d082",
    number: "D-082",
    title: "父親的第二遺囑",
    quote: "血緣是一種未完成的授權。",
    resonanceTier: 1,
    unlockCaseId: "case-d082",
  },
  {
    id: "r-d119",
    caseId: "case-d119",
    number: "D-119",
    title: "消失的共同創辦人",
    quote: "公司是一種讓責任分散到無人負責的身體。",
    resonanceTier: 1,
    unlockCaseId: "case-d119",
  },
  {
    id: "r-d144",
    caseId: "case-d144",
    number: "D-144",
    title: "不存在的情人",
    quote: "關係不是身份，是被反覆回應後留下的形狀。",
    resonanceTier: 1,
    unlockCaseId: "case-d144",
  },
  {
    id: "r-d173",
    caseId: "case-d173",
    number: "D-173",
    title: "孩子的聲音",
    quote: "被留下，不等於被允許存在。",
    resonanceTier: 1,
    unlockCaseId: "case-d173",
  },
  {
    id: "r-d206",
    caseId: "case-d206",
    number: "D-206",
    title: "完美的丈夫",
    quote: "修正不是救贖。",
    resonanceTier: 2,
    unlockCaseId: "case-d206",
  },
  {
    id: "r-d301",
    caseId: "case-d301",
    number: "D-301",
    title: "國家級遺囑",
    quote: "死者可以留下證據，不能留下選票。",
    resonanceTier: 3,
    unlockCaseId: "case-d301",
  },
  {
    id: "r-d301-anomaly",
    caseId: "case-d301",
    number: "D-301",
    title: "國家級遺囑（異常片段）",
    quote: "民主不是活人的專利。",
    resonanceTier: 3,
    suppressed: true,
    unlockCaseId: "case-d301",
  },
  {
    id: "r-unknown-eighth",
    caseId: "case-d399",
    number: "???",
    title: "未知第八節點",
    quote: "節點數量不一致。",
    resonanceTier: 3,
    isMirror: true,
    unlockCaseId: "case-d301",
  },
  {
    id: "r-d399",
    caseId: "case-d399",
    number: "D-399",
    title: "你自己的備份",
    quote: "被理解，不等於被擁有。",
    resonanceTier: 4,
    isMirror: true,
    unlockCaseId: "case-d399",
  },
];

export function isCaseVerdictComplete(caseId: string): boolean {
  const save = loadGame(caseId);
  return !!save?.verdictChoiceId;
}

export function hasCompletedRequiredCases(caseIds: string[]): boolean {
  if (!caseIds.length) return true;
  return caseIds.every((id) => isCaseVerdictComplete(id));
}

/** 目前共振階段（0=未啟用，1–4=已解鎖階段） */
export function getResonanceTierLevel(): number {
  let tier = 0;
  for (const t of RESONANCE_TIERS) {
    if (isCaseVerdictComplete(t.unlockCaseId)) tier = t.id;
  }
  return tier;
}

export function getActiveResonanceTier(): ResonanceTier | null {
  const level = getResonanceTierLevel();
  return RESONANCE_TIERS.find((t) => t.id === level) ?? null;
}

/** 面板是否應顯示（含第五案結局當下首次啟用） */
export function shouldShowResonancePanel(
  story: Story,
  state?: PlayerState
): boolean {
  if (getResonanceTierLevel() >= 1) return true;
  if (
    story.id === RESONANCE_PANEL_UNLOCK_CASE &&
    state?.phase === "ending" &&
    !!state.verdictChoiceId
  ) {
    return true;
  }
  return false;
}

/** 第五案進行中、尚未裁決：顯示待啟用預告 */
export function shouldShowResonanceDormant(
  story: Story,
  state?: PlayerState
): boolean {
  if (getResonanceTierLevel() >= 1) return false;
  if (!RESONANCE_CASE_IDS.includes(story.id as (typeof RESONANCE_CASE_IDS)[number])) {
    return false;
  }
  return state?.phase !== "ending";
}

export function getVisibleResonanceNodes(
  storyId: string,
  tierLevel: number
): ResonanceNode[] {
  if (tierLevel < 1) return [];

  return RESONANCE_NODES.filter((node) => {
    if (node.resonanceTier > tierLevel) return false;
    if (node.id === "r-d399") {
      return isCaseVerdictComplete("case-d399") || storyId === "case-d399";
    }
    if (node.id === "r-unknown-eighth") {
      return (
        tierLevel >= 3 &&
        isCaseVerdictComplete("case-d301") &&
        !isCaseVerdictComplete("case-d399")
      );
    }
    if (node.id === "r-d301-anomaly") {
      return (
        storyId === "case-d301" ||
        storyId === "case-d399" ||
        tierLevel >= 3
      );
    }
    return true;
  });
}

export function isResonanceNodeUnlocked(node: ResonanceNode): boolean {
  if (node.id === "r-unknown-eighth") {
    return (
      isCaseVerdictComplete("case-d301") &&
      !isCaseVerdictComplete("case-d399")
    );
  }
  return isCaseVerdictComplete(node.unlockCaseId);
}

export function getUnlockedResonanceNodes(): ResonanceNode[] {
  const tier = getResonanceTierLevel();
  return getVisibleResonanceNodes("case-d399", tier).filter((n) =>
    isResonanceNodeUnlocked(n)
  );
}

export function computeResonanceLevel(storyId = "case-d399"): {
  percent: number;
  status: "stable" | "warning" | "critical";
  unlockedCount: number;
  visibleCount: number;
  tierLevel: number;
  tierLabel: string;
} {
  const tierLevel = getResonanceTierLevel();
  const activeTier = getActiveResonanceTier();

  if (tierLevel < 1 || !activeTier) {
    return {
      percent: 0,
      status: "stable",
      unlockedCount: 0,
      visibleCount: 0,
      tierLevel: 0,
      tierLabel: "未啟用",
    };
  }

  const visible = getVisibleResonanceNodes(storyId, tierLevel);
  const unlocked = visible.filter((n) => isResonanceNodeUnlocked(n));
  const prevMax =
    RESONANCE_TIERS.find((t) => t.id === tierLevel - 1)?.maxPercent ?? 0;
  const tierSpan = activeTier.maxPercent - prevMax;
  const ratio = visible.length ? unlocked.length / visible.length : 0;
  const percent = Math.round(prevMax + tierSpan * ratio);

  return {
    percent,
    status: activeTier.status,
    unlockedCount: unlocked.length,
    visibleCount: visible.length,
    tierLevel,
    tierLabel: activeTier.label,
  };
}

export function computeElectionHoursRemaining(
  state: PlayerState,
  story: Story
): number {
  const base = story.flow.electionCountdown?.hoursRemaining ?? 71;
  const inv = story.flow.investigation;
  const probeIds = [
    inv.briefNodeId,
    ...inv.profileNodeIds,
    ...inv.evidenceNodeIds,
    ...inv.interviewNodeIds,
    ...inv.aiNodeIds,
    story.flow.contradictionsNodeId,
    ...story.flow.crossroadNodeIds,
  ].filter(Boolean);

  const viewed = probeIds.filter((id) => state.viewedNodes.includes(id)).length;
  const crossroads = story.flow.crossroadNodeIds.filter(
    (id) => !!state.nodeChoices[id]
  ).length;
  const progress = (viewed + crossroads) / Math.max(1, probeIds.length);
  return Math.max(6, Math.round(base - progress * (base - 6)));
}

export function shouldPulseResonance(
  state: PlayerState,
  story: Story
): boolean {
  if (getResonanceTierLevel() < 1 && story.id !== RESONANCE_PANEL_UNLOCK_CASE) {
    return false;
  }

  const pulseNodes = new Set([
    "evidence_11",
    "echoes",
    "evidence_08",
    ...(story.flow.resonancePulseNodeIds ?? []),
  ]);

  if (pulseNodes.has(state.currentNodeId)) return true;

  if (
    state.phase === "ending" &&
    RESONANCE_CASE_IDS.includes(story.id as (typeof RESONANCE_CASE_IDS)[number])
  ) {
    return true;
  }

  return false;
}

export function getResonanceStatusLabel(
  status: "stable" | "warning" | "critical",
  tierLabel?: string
): string {
  if (tierLabel && tierLabel !== "未啟用") {
    return tierLabel;
  }
  switch (status) {
    case "critical":
      return "已達國家級風險門檻";
    case "warning":
      return "已達警戒門檻";
    default:
      return "監測中";
  }
}

/** 下一階段解鎖提示 */
export function getNextResonanceUnlockHint(): string | null {
  const tier = getResonanceTierLevel();
  const next = RESONANCE_TIERS.find((t) => t.id === tier + 1);
  if (!next) return null;
  const labels: Record<string, string> = {
    "case-d173": "第五案《孩子的聲音》",
    "case-d206": "第六案《完美的丈夫》",
    "case-d301": "第七案《國家級遺囑》",
    "case-d399": "第八案《你自己的備份》",
  };
  return `完成${labels[next.unlockCaseId] ?? next.unlockCaseId}裁決後，共振圖譜將擴展至「${next.label}」`;
}
