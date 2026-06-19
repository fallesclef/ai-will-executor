export type StatKey = "legal" | "empathy" | "suspicion";

export type NodeCategory =
  | "intro"
  | "login"
  | "rules"
  | "console"
  | "brief"
  | "profile"
  | "evidence"
  | "interview"
  | "ai_inquiry"
  | "contradiction"
  | "crossroad"
  | "verdict";

export interface StatDelta {
  legal?: number;
  empathy?: number;
  suspicion?: number;
}

export interface Choice {
  id: string;
  label: string;
  effects: StatDelta;
  nextNodeId?: string;
  flags?: string[];
}

export interface StoryNode {
  id: string;
  category: NodeCategory;
  title: string;
  subtitle?: string;
  content: string[];
  choices?: Choice[];
  /** 滿足條件時追加顯示的內容 */
  contentIf?: {
    whenViewed?: string[];
    whenFlags?: string[];
    lines: string[];
  }[];
}

export interface Ending {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
  epilogueApprove?: string[];
  epilogueSeal?: string[];
  isHidden?: boolean;
}

export interface PersonalityArchetype {
  id: string;
  title: string;
  description: string;
  caseComment: string;
  condition: (stats: Record<StatKey, number>) => boolean;
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  caseNumber: string;
  startNodeId: string;
  nodes: Record<string, StoryNode>;
  endings: Ending[];
  personalityArchetypes: PersonalityArchetype[];
  minNodesBeforeVerdict: number;
}

export type GamePhase =
  | "intro"
  | "explore"
  | "crossroad"
  | "verdict"
  | "ending";

export interface GameState {
  currentNodeId: string;
  stats: Record<StatKey, number>;
  viewedNodes: string[];
  choiceHistory: string[];
  flags: string[];
  phase: GamePhase;
  endingId: string | null;
  verdictChoiceId: string | null;
  startedAt: string;
  completedAt: string | null;
}

export const INITIAL_STATS: Record<StatKey, number> = {
  legal: 0,
  empathy: 0,
  suspicion: 0,
};

export const STAT_LABELS: Record<StatKey, string> = {
  legal: "法理",
  empathy: "共感",
  suspicion: "懷疑",
};
