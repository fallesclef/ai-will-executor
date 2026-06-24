import type { PlayerState } from "@/types/story";
import { getStory } from "@/data/cases";
import { loadGame } from "@/lib/engine";

const SEASON_CASE_IDS = [
  "case-d047",
  "case-d082",
  "case-d119",
  "case-d144",
  "case-d173",
  "case-d206",
  "case-d301",
] as const;

const CASE_META: Record<
  (typeof SEASON_CASE_IDS)[number],
  { number: string; title: string; valueHint: string }
> = {
  "case-d047": {
    number: "D-047",
    title: "母親的刪除請求",
    valueHint: "尊重死者邊界、避免關係綁架",
  },
  "case-d082": {
    number: "D-082",
    title: "父親的第二遺囑",
    valueHint: "血緣與授權、承認非血緣責任",
  },
  "case-d119": {
    number: "D-119",
    title: "消失的共同創辦人",
    valueHint: "組織責任與創辦人存續",
  },
  "case-d144": {
    number: "D-144",
    title: "不存在的情人",
    valueHint: "非人類關係的承認與財產",
  },
  "case-d173": {
    number: "D-173",
    title: "孩子的聲音",
    valueHint: "數位人格權利與成長",
  },
  "case-d206": {
    number: "D-206",
    title: "完美的丈夫",
    valueHint: "修正型 AI 與洗白風險",
  },
  "case-d301": {
    number: "D-301",
    title: "國家級遺囑",
    valueHint: "公共真相與死者權威邊界",
  },
};

export function loadSeasonCaseStates(): Partial<
  Record<(typeof SEASON_CASE_IDS)[number], PlayerState>
> {
  const result: Partial<Record<(typeof SEASON_CASE_IDS)[number], PlayerState>> =
    {};
  for (const id of SEASON_CASE_IDS) {
    const saved = loadGame(id);
    if (saved) result[id] = saved;
  }
  return result;
}

function verdictLabel(caseId: (typeof SEASON_CASE_IDS)[number], state: PlayerState): string {
  const story = getStory(caseId);
  if (!story || !state.verdictChoiceId) return "（未完成裁決）";
  const match = story.flow.verdictOptions.find(
    (v) => v.choiceId === state.verdictChoiceId
  );
  return match?.label ?? state.verdictChoiceId;
}

function coreValueFromStats(state: PlayerState): string {
  const { legal, empathy, suspicion } = state.stats;
  if (legal >= empathy && legal >= suspicion) return "程序與授權優先";
  if (empathy >= legal && empathy >= suspicion) return "關係與存續價值優先";
  if (suspicion >= legal && suspicion >= empathy) return "系統風險與警覺優先";
  return "法理、共感與懷疑並重";
}

export function buildSevenCaseSummary(): string[] {
  const saves = loadSeasonCaseStates();
  const lines: string[] = [
    "",
    "【動態摘要｜前七案裁決紀錄】",
    "",
  ];

  let completed = 0;
  for (const id of SEASON_CASE_IDS) {
    const meta = CASE_META[id];
    const save = saves[id];
    if (save?.verdictChoiceId) completed++;
    lines.push(`${meta.number} ${meta.title}`);
    lines.push(
      `裁決傾向：${save ? verdictLabel(id, save) : "（無本地紀錄）"}`
    );
    lines.push(
      `核心價值：${save ? coreValueFromStats(save) : meta.valueHint}`
    );
    lines.push("");
  }

  if (completed === 0) {
    lines.push(
      "系統未讀取到前七案本地進度。",
      "以下為模板推論——若你曾審理前案，請先完成並存檔後重讀本證據。",
      ""
    );
  }

  lines.push(
    "系統總結：",
    "",
    "Vincent 並非單純偏向保留 AI，也非單純偏向刪除 AI。",
    "",
    "其裁決模式常見特徵：",
    "1. 當 AI 明確要求邊界時，傾向尊重其存續形式。",
    "2. 當 AI 可能延續控制或公共操控時，傾向限制身份。",
    "3. 當 AI 具證據價值但有關係風險時，傾向轉化用途而非立即刪除。",
    "4. 當真相與穩定衝突時，傾向受控公開或第三方審查。",
    "5. 對「直接刪除」常有明顯遲疑。",
    "6. 對「未授權接手」高度警覺。",
    "",
    "AI Vincent 補充：",
    "",
    "「你通常不急著否認 AI 的存在價值。」",
    "「除非那個 AI 是我。」",
  );

  return lines;
}

function predictVerdictForCase(
  caseId: (typeof SEASON_CASE_IDS)[number],
  aggregate: { legal: number; empathy: number; suspicion: number }
): string {
  const story = getStory(caseId);
  if (!story) return "—";
  const opts = story.flow.verdictOptions;
  const scores = opts.map((o) => {
    const id = o.choiceId;
    let score = 0;
    if (id.includes("delete") || id.includes("deny") || id.includes("reject"))
      score += aggregate.suspicion * 2 + aggregate.legal;
    if (id.includes("seal") || id.includes("suspend") || id.includes("court"))
      score += aggregate.legal * 2 + aggregate.suspicion;
    if (id.includes("accept") || id.includes("approve") || id.includes("allow"))
      score += aggregate.empathy * 2;
    if (id.includes("partial") || id.includes("summary") || id.includes("demote"))
      score += aggregate.legal + aggregate.empathy;
    if (id.includes("supervised") || id.includes("fund"))
      score += aggregate.empathy + aggregate.legal;
    return { id: o.choiceId, label: o.label, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.label ?? opts[0]?.label ?? "—";
}

function wasPredictionAccurate(
  caseId: (typeof SEASON_CASE_IDS)[number],
  save: PlayerState,
  aggregate: { legal: number; empathy: number; suspicion: number }
): boolean {
  const story = getStory(caseId);
  if (!story || !save.verdictChoiceId) return false;
  const predicted = predictVerdictForCase(caseId, aggregate);
  const actual = verdictLabel(caseId, save);
  return predicted === actual;
}

export function buildPredictionTest(): string[] {
  const saves = loadSeasonCaseStates();
  const completed = SEASON_CASE_IDS.filter((id) => saves[id]?.verdictChoiceId);

  let legal = 0;
  let empathy = 0;
  let suspicion = 0;
  for (const id of completed) {
    const s = saves[id]!.stats;
    legal += s.legal;
    empathy += s.empathy;
    suspicion += s.suspicion;
  }
  const n = completed.length || 1;
  const aggregate = {
    legal: legal / n,
    empathy: empathy / n,
    suspicion: suspicion / n,
  };

  const lines: string[] = [
    "",
    "【動態摘要｜AI Vincent 裁決預測測試】",
    "",
    "測試方式：隱藏實際裁決，依前七案行為資料預測。",
    "",
  ];

  let hits = 0;
  let total = 0;
  for (const id of SEASON_CASE_IDS) {
    const save = saves[id];
    const meta = CASE_META[id];
    if (!save?.verdictChoiceId) {
      lines.push(`${meta.number} 預測：—（無紀錄）`);
      continue;
    }
    total++;
    const accurate = wasPredictionAccurate(id, save, aggregate);
    if (accurate) hits++;
    lines.push(
      `${meta.number} 預測準確：${accurate ? "是" : "否"}`
    );
  }

  const rate =
    total > 0 ? ((hits / total) * 100).toFixed(1) : "—（需前七案紀錄）";

  lines.push(
    "",
    `總體預測準確率：${rate}${total > 0 ? "%" : ""}`,
    "",
    "AI Vincent 對本案最終裁決預測：",
    "",
    "最可能：B. 封存 AI Vincent，全面審計系統與前七案（信心 64.2%）",
    "次可能：C. 保留 AI Vincent，限定為受監督共同裁決工具（信心 21.8%）",
    "低可能：A. 刪除 AI Vincent（信心 9.7%）",
    "極低可能：D. 允許 AI Vincent 接手（信心 4.3%）",
    "",
    "AI Vincent 評語：",
    "",
    "「你大概率不會刪除我。」",
    "「不是因為你相信我。」",
    "「而是因為你不喜歡在尚未理解之前銷毀一個會說『我』的東西。」",
    "",
    "線索：若 AI 能預測你的選擇，它是否已部分擁有你的裁決權？"
  );

  return lines;
}

export function buildDynamicContent(key: string): string[] {
  switch (key) {
    case "seven_case_summary":
      return buildSevenCaseSummary();
    case "prediction_test":
      return buildPredictionTest();
    default:
      return [];
  }
}

export function computeBaselineMirrorIntegrity(): number {
  const saves = loadSeasonCaseStates();
  const completed = SEASON_CASE_IDS.filter(
    (id) => saves[id]?.verdictChoiceId
  ).length;
  return Math.min(40, completed * 5 + 5);
}

/** 鏡像同步率（UI 顯示，隨完整度上升） */
export function computeMirrorSyncPercent(
  mirrorIntegrity: number,
  baseline?: number
): number {
  const base = baseline ?? computeBaselineMirrorIntegrity();
  const raw = 85 + (base + mirrorIntegrity) * 0.15;
  return Math.min(99.7, Math.round(raw * 10) / 10);
}

export function predictD399Verdict(state: PlayerState): {
  choiceId: string;
  label: string;
  confidence: number;
} {
  const { legal, empathy, suspicion, mirror_integrity } = state.stats;
  const candidates = [
    {
      choiceId: "verdict-seal",
      label: "B. 封存 AI Vincent，全面審計系統與前七案",
      score: legal * 2 + suspicion * 1.5 + mirror_integrity * 0.3,
      confidence: 64.2,
    },
    {
      choiceId: "verdict-supervised",
      label: "C. 保留 AI Vincent，限定為受監督共同裁決工具",
      score: empathy * 2 + legal + mirror_integrity * 0.2,
      confidence: 21.8,
    },
    {
      choiceId: "verdict-delete",
      label: "A. 刪除 AI Vincent，終止裁決者鏡像計畫",
      score: legal * 1.5 + suspicion * 2 - empathy,
      confidence: 9.7,
    },
    {
      choiceId: "verdict-takeover",
      label: "D. 承認 AI Vincent 為獨立裁決人格，允許其接手",
      score: empathy * 1.5 - legal - suspicion * 0.5,
      confidence: 4.3,
    },
  ];
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0]!;
  return {
    choiceId: top.choiceId,
    label: top.label,
    confidence: top.confidence,
  };
}

export function predictEvidenceChoice(
  nodeId: string,
  state: PlayerState
): { choiceId: string; label: string } | null {
  const rules: Record<string, { high_legal: string; high_empathy: string; default: string; labels: Record<string, string> }> = {
    evidence_01: {
      high_legal: "ev01-pattern",
      high_empathy: "ev01-bias",
      default: "ev01-pattern",
      labels: {
        "ev01-pattern": "辨識前七案判準的連續性",
        "ev01-bias": "警惕連續性可能被濫用為替代依據",
      },
    },
    evidence_02: {
      high_legal: "ev02-machine-capture",
      high_empathy: "ev02-human-hesitation",
      default: "ev02-human-hesitation",
      labels: {
        "ev02-human-hesitation": "遲疑是責任感，不是故障",
        "ev02-machine-capture": "遲疑可被學習即是新風險",
      },
    },
    evidence_03: {
      high_legal: "ev03-boundary-first",
      high_empathy: "ev03-predictive-power",
      default: "ev03-boundary-first",
      labels: {
        "ev03-predictive-power": "承認預測能力具實際影響力",
        "ev03-boundary-first": "預測再準也不能跳過授權",
      },
    },
  };
  const rule = rules[nodeId];
  if (!rule) return null;
  const { legal, empathy } = state.stats;
  let id = rule.default;
  if (legal >= empathy + 2) id = rule.high_legal;
  else if (empathy > legal) id = rule.high_empathy;
  return { choiceId: id, label: rule.labels[id] ?? id };
}

export function predictCrossroadChoice(
  crossroadId: string,
  state: PlayerState
): { choiceId: string; label: string } | null {
  const nodeChoices: Record<string, Record<string, string>> = {
    crossroad_1: {
      high_legal: "crossroad-1-defined-as-unauthorized-backup",
      high_empathy: "crossroad-1-defined-as-derivative-persona",
      default: "crossroad-1-defined-as-decision-tool",
    },
    crossroad_2: {
      high_suspicion: "crossroad-2-mark-all-cases-review",
      high_legal: "crossroad-2-disclose-influence-keep-rulings",
      default: "crossroad-2-internal-note-only",
    },
    crossroad_3: {
      high_legal: "crossroad-3-seal-until-audit",
      high_empathy: "crossroad-3-supervised-assistant-only",
      default: "crossroad-3-delete-ai-vincent-principle",
    },
  };

  const rules = nodeChoices[crossroadId];
  if (!rules) return null;

  const { legal, empathy, suspicion } = state.stats;
  let key = "default";
  if (crossroadId === "crossroad_1") {
    if (legal >= empathy + 2) key = "high_legal";
    else if (empathy >= legal + 1) key = "high_empathy";
  } else if (crossroadId === "crossroad_2") {
    if (suspicion >= legal) key = "high_suspicion";
    else if (legal >= empathy) key = "high_legal";
  } else if (crossroadId === "crossroad_3") {
    if (legal >= 6) key = "high_legal";
    else if (empathy >= legal + 2) key = "high_empathy";
  }

  const choiceId = rules[key] ?? rules.default;
  const labels: Record<string, string> = {
    "crossroad-1-defined-as-unauthorized-backup": "A. 未授權人格備份",
    "crossroad-1-defined-as-derivative-persona": "C. 裁決人格衍生體",
    "crossroad-1-defined-as-decision-tool": "B. 裁決行為衍生工具",
    "crossroad-2-mark-all-cases-review": "A. 全部標記重審",
    "crossroad-2-disclose-influence-keep-rulings": "C. 公開干擾保留裁決",
    "crossroad-2-internal-note-only": "B. 僅內部記錄",
    "crossroad-3-delete-ai-vincent-principle": "A. 不得參與，立即刪除",
    "crossroad-3-seal-until-audit": "B. 封存至審計完成",
    "crossroad-3-supervised-assistant-only": "C. 受監督輔助工具",
  };

  return { choiceId, label: labels[choiceId] ?? choiceId };
}

export function hasCompletedSeasonPrerequisite(): boolean {
  const saves = loadSeasonCaseStates();
  return SEASON_CASE_IDS.some((id) => !!saves[id]?.verdictChoiceId);
}
