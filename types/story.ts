export type StatKey =
  | "legal"
  | "empathy"
  | "suspicion"
  | "public_trust"
  | "social_stability"
  | "truth_pressure"
  | "mirror_integrity";

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
  | "verdict"
  | "player_record"
  | "ai_creation"
  | "system_ops"
  | "interviews"
  | "echoes";

export interface StatDelta {
  legal?: number;
  empathy?: number;
  suspicion?: number;
  public_trust?: number;
  social_stability?: number;
  truth_pressure?: number;
  mirror_integrity?: number;
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
  contentIf?: {
    whenViewed?: string[];
    whenFlags?: string[];
    lines: string[];
  }[];
  /** 首次閱讀此節點時自動寫入的旗標（用於真結局條件等） */
  viewFlags?: string[];
}

export interface Ending {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
  epilogueApprove?: string[];
  epilogueSeal?: string[];
  /** 隱藏結局依裁決顯示的追加段落（verdictChoiceId → lines） */
  epilogueForVerdict?: Partial<Record<string, string[]>>;
  isHidden?: boolean;
}

export interface PersonalityArchetype {
  id: string;
  title: string;
  description: string;
  caseComment: string;
  condition: (stats: Record<StatKey, number>) => boolean;
}

export interface FlowStep {
  id: string;
  label: string;
}

export interface ConsoleSection {
  id: string;
  label: string;
  nodes: string[];
  /** 需先閱讀的節點 ID（全部）才解鎖此區塊 */
  requiresViewed?: string[];
}

export interface InvestigationConfig {
  briefNodeId: string;
  profileNodeIds: string[];
  evidenceNodeIds: string[];
  interviewNodeIds: string[];
  aiNodeIds: string[];
}

export interface VerdictOption {
  choiceId: string;
  endingId: string;
  label: string;
}

export interface SecretVerdictRule {
  choiceId: string;
  endingId: string;
  label: string;
  /** 停留裁決畫面多久後解鎖（毫秒） */
  dwellMs?: number;
}

export interface HiddenEndingRule {
  endingId: string;
  requiredViewed: string[];
  /** 至少滿足其中一項旗標 */
  requiredFlagsAny?: string[];
  /** 每組至少滿足一項旗標（用於多個關鍵抉擇皆須符合） */
  requiredFlagsAllGroups?: string[][];
  requiredVerdicts: string[];
}

/** 每個案件的流程與 UI 設定，引擎不硬編碼節點 ID */
export interface CaseFlow {
  onboardingNodeIds: string[];
  hubNodeId: string;
  contradictionsNodeId: string;
  crossroadNodeIds: string[];
  crossroadChoicePrefixes: string[];
  verdictNodeId: string;
  investigation: InvestigationConfig;
  returnToHubCategories: NodeCategory[];
  verdictOptions: VerdictOption[];
  hiddenEnding?: HiddenEndingRule;
  flowSteps: FlowStep[];
  consoleSections: ConsoleSection[];
  nodeLabels: Record<string, { label: string; sub: string }>;
  categoryLabels: Record<string, string>;
  dashboardIntro?: string[];
  /** 選前倒數顯示（第七案等國家級案件） */
  electionCountdown?: {
    label: string;
    hoursRemaining: number;
  };
  /** 是否顯示公共壓力指標 */
  publicStatsEnabled?: boolean;
  /** 是否顯示鏡像完整度 */
  mirrorStatsEnabled?: boolean;
  /** 節點 ID → 動態內容鍵（由 season-history 注入） */
  dynamicContentKeys?: Record<string, string>;
  /** 真結局／隱藏第五裁決選項 */
  secretVerdict?: SecretVerdictRule;
  /** 關鍵抉擇前顯示鏡像 AI 預測（第八案） */
  predictionEnabled?: boolean;
  /** 開場介面干擾（選項自動亮起） */
  interfaceInterference?: {
    nodeId: string;
    glowLabel: string;
  };
  /** 顯示跨案件語義共振面板 */
  resonanceEnabled?: boolean;
  /** 進入這些節點時共振面板脈動提示 */
  resonancePulseNodeIds?: string[];
  /** 結案後解鎖的下一案件 */
  nextCaseUnlock?: {
    caseId: string;
    label: string;
    /** 需完成的先決案件（預設僅需本案已裁決） */
    requiresCases?: string[];
  };
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  caseNumber: string;
  description?: string;
  startNodeId: string;
  nodes: Record<string, StoryNode>;
  endings: Ending[];
  personalityArchetypes: PersonalityArchetype[];
  flow: CaseFlow;
  /** @deprecated 改由 flow 閘門邏輯決定，保留供舊資料相容 */
  minNodesBeforeVerdict?: number;
}

export interface CaseMeta {
  id: string;
  title: string;
  subtitle: string;
  caseNumber: string;
  description?: string;
  status: "available" | "coming_soon";
  /** 需先完成指定案件裁決後才建議進入（如第八案） */
  requiresCompletedCases?: string[];
}

export type GamePhase =
  | "intro"
  | "explore"
  | "crossroad"
  | "verdict"
  | "ending";

/** 玩家進度（對外亦稱 PlayerState） */
export interface PlayerState {
  storyId: string;
  playerId: string;
  currentNodeId: string;
  stats: Record<StatKey, number>;
  viewedNodes: string[];
  choiceHistory: string[];
  /** 各節點已做出的選擇（nodeId → choiceId） */
  nodeChoices: Record<string, string>;
  flags: string[];
  phase: GamePhase;
  endingId: string | null;
  verdictChoiceId: string | null;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

/** @deprecated 使用 PlayerState */
export type GameState = PlayerState;

export const INITIAL_STATS: Record<StatKey, number> = {
  legal: 0,
  empathy: 0,
  suspicion: 0,
  public_trust: 0,
  social_stability: 0,
  truth_pressure: 0,
  mirror_integrity: 0,
};

export const STAT_LABELS: Record<StatKey, string> = {
  legal: "法理",
  empathy: "共感",
  suspicion: "懷疑",
  public_trust: "民主信任",
  social_stability: "社會穩定",
  truth_pressure: "真相壓力",
  mirror_integrity: "鏡像完整度",
};

export type AnalyticsEventType =
  | "session_start"
  | "navigate"
  | "choice"
  | "verdict"
  | "complete";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  storyId: string;
  playerId: string;
  nodeId?: string;
  choiceId?: string;
  endingId?: string;
  timestamp: string;
}
