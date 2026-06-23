/**
 * 第二案範本：複製此檔為 case-d048.ts，填入劇情與 flow 設定後，
 * 在 data/cases/index.ts 註冊即可。
 */
import type { Story, CaseFlow } from "@/types/story";

export const caseD048Flow: CaseFlow = {
  onboardingNodeIds: ["start", "case_login", "rules"],
  hubNodeId: "console",
  contradictionsNodeId: "contradictions",
  crossroadNodeIds: ["crossroad_1"],
  crossroadChoicePrefixes: ["crossroad-1-"],
  verdictNodeId: "verdict",
  investigation: {
    briefNodeId: "brief",
    profileNodeIds: [],
    evidenceNodeIds: [],
    interviewNodeIds: [],
    aiNodeIds: [],
  },
  returnToHubCategories: ["brief", "evidence", "interview", "ai_inquiry"],
  verdictOptions: [],
  flowSteps: [],
  consoleSections: [],
  nodeLabels: {},
  categoryLabels: {},
};

export const caseD048Template: Story = {
  id: "case-d048",
  title: "AI遺囑執行人",
  subtitle: "第二案：（待命名）",
  caseNumber: "D-048",
  description: "籌備中",
  startNodeId: "start",
  nodes: {},
  endings: [],
  personalityArchetypes: [],
  flow: caseD048Flow,
};
