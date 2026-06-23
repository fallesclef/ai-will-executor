#!/usr/bin/env python3
"""Generate data/cases/case-d082.ts from embedded narrative content."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "cases" / "case-d082.ts"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def content_array(paragraphs: list[str], indent: str = "      ") -> str:
    lines = [f'{indent}"{esc(p)}"' if p else f"{indent}\"\"" for p in paragraphs]
    return "[\n" + ",\n".join(lines) + ",\n" + indent[:-2] + "]"


def effects(**kwargs: int) -> str:
    return json.dumps(kwargs, ensure_ascii=False)


def node(
    id: str,
    category: str,
    title: str,
    subtitle: str,
    content: list[str],
    choices: str | None = None,
    content_if: str | None = None,
) -> str:
    parts = [
        f'    {id}: {{',
        f'      id: "{id}",',
        f'      category: "{category}",',
        f'      title: "{title}",',
        f'      subtitle: "{esc(subtitle)}",',
        f"      content: {content_array(content, '        ')},",
    ]
    if content_if:
        parts.append(content_if)
    if choices:
        parts.append(f"      choices: [{choices}],")
    parts.append("    },")
    return "\n".join(parts)


def choice(
    id: str,
    label: str,
    eff: dict[str, int],
    next_node: str | None = None,
    flags: list[str] | None = None,
) -> str:
    bits = [
        f'id: "{id}"',
        f'label: "{esc(label)}"',
        f"effects: {effects(**eff)}",
    ]
    if next_node:
        bits.append(f'nextNodeId: "{next_node}"')
    if flags:
        bits.append(f"flags: {json.dumps(flags, ensure_ascii=False)}")
    return "        {\n          " + ",\n          ".join(bits) + ",\n        }"


def back(id: str = "back-console") -> str:
    if id == "back-console":
        return "back()"
    return f'back("{id}")'


def content_if_block(items: list[dict]) -> str:
    rows = ["      contentIf: ["]
    for item in items:
        rows.append("        {")
        if "whenViewed" in item:
            rows.append(
                f'          whenViewed: {json.dumps(item["whenViewed"], ensure_ascii=False)},'
            )
        if "whenFlags" in item:
            rows.append(
                f'          whenFlags: {json.dumps(item["whenFlags"], ensure_ascii=False)},'
            )
        rows.append(f"          lines: {content_array(item['lines'], '            ')},")
        rows.append("        },")
    rows.append("      ],")
    return "\n".join(rows)


def ending(
    id: str,
    title: str,
    subtitle: str,
    content: list[str],
    hidden: bool = False,
    epilogue_for: dict[str, list[str]] | None = None,
) -> str:
    parts = [
        "    {",
        f'      id: "{id}",',
        f'      title: "{esc(title)}",',
        f'      subtitle: "{subtitle}",',
    ]
    if hidden:
        parts.append("      isHidden: true,")
    parts.append(f"      content: {content_array(content, '        ')},"
    )
    if epilogue_for:
        parts.append("      epilogueForVerdict: {")
        for k, lines in epilogue_for.items():
            parts.append(f'        "{k}": {content_array(lines, "          ")},')
        parts.append("      },")
    parts.append("    },")
    return "\n".join(parts)


# --- Narrative content ---

START = [
    "張世昌死後第十天，家人啟用了他的 AI 人格。",
    "",
    "他們原本以為，父親會交代公司股權、基金會安排，或是給家人最後的祝福。",
    "",
    "系統問：",
    "",
    "「張世昌先生，是否確認進入遺產輔助模式？」",
    "",
    "AI 張世昌回答：",
    "",
    "「確認。」",
    "",
    "十一分鐘後，它提出第一項正式請求。",
    "",
    "「請開啟第二遺囑審查。」",
    "",
    "張家客廳裡，所有人都安靜下來。",
    "",
    "因為張世昌生前只留下過一份遺囑。",
    "",
    "而 AI 接著說：",
    "",
    "「將我名下可處分個人資產之 70%，轉入林澈名下信託。」",
    "",
    "他的妻子問：",
    "",
    "「林澈是誰？」",
    "",
    "AI 張世昌停頓兩秒。",
    "",
    "「我的兒子。」",
]

CASE_LOGIN = [
    "【數位遺囑執行署｜案件登入系統】",
    "",
    "登入身份：數位遺囑執行人",
    "權限等級：D-4",
    "今日待審案件：1 件",
    "",
    "案件編號：D-082",
    "案件名稱：父親的第二遺囑",
    "風險等級：高",
    "",
    "涉及項目：",
    "",
    "- AI 遺囑補充聲明",
    "- 非婚生子繼承爭議",
    "- 家族信託異議",
    "- 死後意願有效性",
    "- 遺產輔助型人格備份可信度",
    "- 企業控制權潛在影響",
    "",
    "系統提示：",
    "",
    "死者張世昌之 AI 人格備份，於啟用後第 11 分鐘提出「第二遺囑審查」。",
    "",
    "AI 主張：",
    "",
    "「我名下可處分個人資產之 70%，應轉入林澈名下信託。」",
    "",
    "家屬已提出緊急異議，主張該 AI 內容屬模型幻覺或遭外部資料污染。",
    "",
    "你需要審查所有資料，判定 AI 張世昌提出之第二遺囑是否具備可執行效力或參考效力。",
]

RULES = [
    "【遺產輔助型人格審查規則｜節錄】",
    "",
    "依《數位人格備份管理條例》第 23 條，遺產輔助型人格備份不得於原始人格死亡後創設全新遺囑。",
    "",
    "然而，若 AI 人格提出之財產分配指示，符合以下任一條件，得作為遺囑解釋、信託執行或家族協議調整之審查依據：",
    "",
    "一、可證明該指示於死者生前已形成明確意願。",
    "二、該指示與死者生前書面紀錄、錄音、信託草案或法律文件高度一致。",
    "三、現行遺囑存在重大未揭露關係、受益人遺漏或可疑壓力。",
    "四、繼續執行原遺囑可能造成重大倫理不正義或法律爭議。",
    "五、AI 人格之指示未被證明受外部污染、竄改或惡意提示影響。",
    "",
    "審查者可作成以下裁決：",
    "",
    "A. 承認第二遺囑效力",
    "B. 駁回第二遺囑",
    "C. 部分承認並成立補償信託",
    "D. 凍結遺產並移送數位法院",
    "",
    "提醒：",
    "",
    "本署不負責修補家庭關係。",
    "本署只判斷，死者生前不敢說出口的責任，是否能在死後被承認。",
]

CONSOLE = [
    "【案件控制台｜D-082】",
    "",
    "案件名稱：父親的第二遺囑",
    "",
    "目前狀態：待審查",
    "裁決期限：今日 23:59",
    "家屬異議：已提交",
    "第二遺囑聲明：待判定",
    "遺產凍結狀態：部分凍結",
    "",
    "可查閱資料：",
    "",
    "1. 案件簡報",
    "2. 角色資料",
    "3. 證據資料庫",
    "4. 家屬訪談",
    "5. 林澈訪談",
    "6. AI 張世昌詢問",
    "7. 矛盾整理",
    "8. 提交裁決",
]

BRIEF = [
    "【案件簡報｜D-082】",
    "",
    "死者：張世昌",
    "年齡：67 歲",
    "身份：世昌建設創辦人",
    "死亡原因：主動脈剝離",
    "死亡日期：2041 年 8 月 3 日",
    "人格備份完成日期：2041 年 6 月 12 日",
    "AI 啟用日期：2041 年 8 月 13 日",
    "",
    "合法繼承相關人：",
    "",
    "配偶：周美蘭",
    "長子：張承祐",
    "女兒：張若寧",
    "",
    "爭議關係人：",
    "",
    "林澈，36 歲",
    "身份：疑似張世昌非婚生子",
    "生母：林婉如，已故，曾任世昌建設早期會計",
    "",
    "事件摘要：",
    "",
    "張世昌生前留有正式遺囑一份，經律師見證並完成信託安排。",
    "",
    "正式遺囑內容：",
    "",
    "1. 世昌建設股權由張承祐繼承管理。",
    "2. 家族住宅與部分金融資產由周美蘭繼承。",
    "3. 公益基金會由張若寧繼續主持。",
    "4. 可處分個人資產中 20% 撥入世昌教育基金會。",
    "5. 未提及林澈。",
    "",
    "然而，AI 張世昌啟用後第 11 分鐘，提出「第二遺囑審查」。",
    "",
    "AI 聲明：",
    "",
    "「我名下可處分個人資產之 70%，應轉入林澈名下信託。」",
    "",
    "「這不是額外贈與。」",
    "",
    "「這是我生前已形成，但未完成簽署之遺願。」",
    "",
    "家屬主張：",
    "",
    "1. 張世昌生前從未正式承認林澈。",
    "2. AI 不得於死後創設新遺囑。",
    "3. 林澈或其代理人可能接觸過 AI 系統。",
    "4. 該聲明將嚴重影響家族與企業穩定。",
    "5. 第二遺囑若存在，應有正式文件，而非由 AI 口述。",
    "",
    "系統初步判定：",
    "",
    "人格一致率：88.9%",
    "商業決策一致率：92.1%",
    "情緒偏移值：中高",
    "外部污染風險：中",
    "未完成遺囑草案關聯度：待審查",
    "家庭衝突風險：極高",
]

PROFILE_ZHANG = [
    "【角色資料｜張世昌】",
    "",
    "張世昌，67 歲，世昌建設創辦人。",
    "",
    "外界形容他是「靠信用起家的男人」。",
    "",
    "他早年從工地主任做起，後來成立世昌建設，靠著地方建案與都市更新案累積財富。",
    "",
    "他一生重視秩序、承諾與名聲。",
    "",
    "但本案資料顯示，他在 35 年前曾與公司會計林婉如有一段關係，並可能生下一子林澈。",
    "",
    "張世昌從未公開承認林澈。",
    "",
    "但在其私人資料中，多次出現與林澈相關的匯款、學費支出、醫療補助與未寄出的信件。",
    "",
    "人格備份建模摘要：",
    "",
    "- 高控制傾向",
    "- 高責任感",
    "- 高名譽依賴",
    "- 中度情感表達障礙",
    "- 高度遲延性愧疚反應",
    "",
    "系統評語：",
    "",
    "張世昌習慣用制度處理情感，用金錢處理虧欠，用沉默處理羞愧。",
]

PROFILE_WIFE = [
    "【角色資料｜周美蘭】",
    "",
    "周美蘭，64 歲，張世昌之妻。",
    "",
    "她與張世昌結婚 39 年，是張世昌創業早期的重要支持者。",
    "",
    "她曾協助張世昌取得第一筆家族資金，也長期維繫張家在地方社交圈中的形象。",
    "",
    "周美蘭對外溫和，對內強勢。",
    "",
    "她主張：",
    "",
    "「張家不欠林澈。」",
    "",
    "但私下紀錄顯示，她至少在 30 年前已知悉林澈存在。",
    "",
    "系統評語：",
    "",
    "周美蘭不是不知道真相。",
    "",
    "她只是相信，有些真相一旦被承認，整個家庭就會重新計算誰受過傷。",
]

PROFILE_SON = [
    "【角色資料｜張承祐】",
    "",
    "張承祐，38 歲，世昌建設現任總經理。",
    "",
    "張世昌自其高中起即安排其接觸公司事務。",
    "",
    "外界普遍認為他是世昌建設的當然接班人。",
    "",
    "張承祐強烈反對第二遺囑。",
    "",
    "他主張：",
    "",
    "「一個死後 AI 的口述，不能推翻我父親一生的安排。」",
    "",
    "系統補充：",
    "",
    "張承祐近三年主導之兩項投資案虧損嚴重。",
    "若第二遺囑成立，其對公司控制力將受到間接影響。",
    "",
    "系統評語：",
    "",
    "張承祐害怕失去的不只是財產。",
    "",
    "他害怕父親死後證明，自己不是唯一被選中的兒子。",
]

PROFILE_DAUGHTER = [
    "【角色資料｜張若寧】",
    "",
    "張若寧，35 歲，世昌教育基金會執行長。",
    "",
    "她長期負責家族公益形象。",
    "",
    "張若寧在本案中態度相對保留。",
    "",
    "她不主張立即承認第二遺囑，但也反對直接駁回。",
    "",
    "私人通訊紀錄顯示，她曾在三年前嘗試聯絡林澈。",
    "",
    "系統評語：",
    "",
    "張若寧想要真相。",
    "",
    "但她也知道，真相不是乾淨的東西。",
    "",
    "一旦打開，就不會只弄髒一個人。",
]

PROFILE_LIN = [
    "【角色資料｜林澈】",
    "",
    "林澈，36 歲，老屋與家具修復師。",
    "",
    "生母林婉如曾任世昌建設早期會計。",
    "",
    "林澈出生證明中，父親欄位空白。",
    "",
    "他從未被張世昌正式認領。",
    "",
    "資料顯示，自林澈 6 歲起，張世昌曾透過第三方帳戶定期支付生活費與學費，直到林澈 22 歲。",
    "",
    "林澈未主動向張家提出繼承請求。",
    "",
    "AI 張世昌提出第二遺囑後，林澈才首次被正式列為案件關係人。",
    "",
    "系統評語：",
    "",
    "林澈不是突然出現的人。",
    "",
    "他只是被張家花了三十六年，放在看不見的地方。",
]

PROFILE_AI = [
    "【角色資料｜AI 張世昌】",
    "",
    "類型：遺產輔助型人格備份",
    "啟用後第十一分鐘提出第二遺囑審查。",
    "",
    "它不像第一案的 AI 陳雅惠那樣溫柔。",
    "它更冷靜、更像企業家，也更像一個終於失去風險成本的人。",
    "",
    "生前的張世昌不敢說。",
    "死後的 AI 張世昌卻說了。",
    "",
    "它提出：",
    "",
    "「請執行第二遺囑。」",
    "「我名下可處分個人資產之 70%，應轉入林澈名下之信託。」",
    "「這不是補償。」",
    "「這是遲到三十六年的承認。」",
    "",
    "核心台詞：",
    "",
    "「我活著的時候，把責任算成風險。」",
    "「我死了以後，風險終於不再重要。」",
]

# Evidence, interviews, AI, crossroads, contradictions, endings defined below in main()

def main() -> None:
    parts: list[str] = []

    parts.append(
        """import type {
  Story,
  StoryNode,
  Ending,
  PersonalityArchetype,
  CaseFlow,
} from "@/types/story";

const back = (id = "back-console") => ({
  id,
  label: "返回案件控制台",
  effects: {},
  nextNodeId: "console",
});

export const caseD082Flow: CaseFlow = {
  onboardingNodeIds: ["start", "case_login", "rules"],
  hubNodeId: "console",
  contradictionsNodeId: "contradictions",
  crossroadNodeIds: ["crossroad_1", "crossroad_2", "crossroad_3"],
  crossroadChoicePrefixes: ["crossroad-1-", "crossroad-2-", "crossroad-3-"],
  verdictNodeId: "verdict",
  investigation: {
    briefNodeId: "brief",
    profileNodeIds: [
      "profile_zhang",
      "profile_wife",
      "profile_son",
      "profile_daughter",
      "profile_lin",
      "profile_ai",
    ],
    evidenceNodeIds: [
      "evidence_01",
      "evidence_02",
      "evidence_03",
      "evidence_04",
      "evidence_05",
      "evidence_06",
      "evidence_07",
      "evidence_08",
    ],
    interviewNodeIds: [
      "interview_wife",
      "interview_son",
      "interview_daughter",
      "interview_lin",
    ],
    aiNodeIds: ["ai_q01", "ai_q02", "ai_q03", "ai_q04", "ai_q05", "ai_q06"],
  },
  returnToHubCategories: [
    "brief",
    "profile",
    "evidence",
    "interview",
    "ai_inquiry",
  ],
  verdictOptions: [
    {
      choiceId: "verdict-accept",
      endingId: "ending-accept",
      label: "承認第二遺囑效力",
    },
    {
      choiceId: "verdict-reject",
      endingId: "ending-reject",
      label: "駁回第二遺囑",
    },
    {
      choiceId: "verdict-partial",
      endingId: "ending-partial",
      label: "部分承認並成立補償信託",
    },
    {
      choiceId: "verdict-freeze",
      endingId: "ending-freeze",
      label: "凍結遺產並移送數位法院",
    },
  ],
  hiddenEnding: {
    endingId: "ending-hidden",
    requiredViewed: [
      "evidence_03",
      "evidence_04",
      "evidence_06",
      "evidence_07",
      "ai_q06",
    ],
    requiredFlagsAny: [
      "recognize_ai_will_interpretation",
      "conditional_ai_will_interpretation",
    ],
    requiredVerdicts: ["verdict-accept", "verdict-partial"],
  },
  flowSteps: [
    { id: "start", label: "開場" },
    { id: "case_login", label: "案件登入" },
    { id: "rules", label: "審查規則" },
    { id: "console", label: "案件控制台" },
    { id: "brief", label: "案件簡報" },
    { id: "profile", label: "角色資料" },
    { id: "evidence", label: "八份證據" },
    { id: "interview", label: "家屬與林澈訪談" },
    { id: "ai_inquiry", label: "AI 詢問" },
    { id: "contradictions", label: "矛盾整理" },
    { id: "crossroad_1", label: "關鍵抉擇一" },
    { id: "crossroad_2", label: "關鍵抉擇二" },
    { id: "crossroad_3", label: "關鍵抉擇三" },
    { id: "verdict", label: "提交裁決" },
  ],
  consoleSections: [
    { id: "brief", label: "案件簡報", nodes: ["brief"] },
    {
      id: "profile",
      label: "角色資料",
      nodes: [
        "profile_zhang",
        "profile_wife",
        "profile_son",
        "profile_daughter",
        "profile_lin",
        "profile_ai",
      ],
    },
    {
      id: "evidence",
      label: "證據資料庫",
      nodes: [
        "evidence_01",
        "evidence_02",
        "evidence_03",
        "evidence_04",
        "evidence_05",
        "evidence_06",
        "evidence_07",
        "evidence_08",
      ],
    },
    {
      id: "interview",
      label: "家屬訪談",
      nodes: ["interview_wife", "interview_son", "interview_daughter"],
    },
    {
      id: "interview_lin",
      label: "林澈訪談",
      nodes: ["interview_lin"],
    },
    {
      id: "ai_inquiry",
      label: "AI 人格詢問",
      nodes: ["ai_q01", "ai_q02", "ai_q03", "ai_q04", "ai_q05", "ai_q06"],
    },
    { id: "contradiction", label: "矛盾整理", nodes: ["contradictions"] },
  ],
  nodeLabels: {
    brief: { label: "簡", sub: "案件簡報" },
    profile_zhang: { label: "P-01", sub: "張世昌" },
    profile_wife: { label: "P-02", sub: "周美蘭" },
    profile_son: { label: "P-03", sub: "張承祐" },
    profile_daughter: { label: "P-04", sub: "張若寧" },
    profile_lin: { label: "P-05", sub: "林澈" },
    profile_ai: { label: "P-06", sub: "AI 張世昌" },
    evidence_01: { label: "01", sub: "正式遺囑" },
    evidence_02: { label: "02", sub: "AI 第二遺囑" },
    evidence_03: { label: "03", sub: "信託草案" },
    evidence_04: { label: "04", sub: "親子關係" },
    evidence_05: { label: "05", sub: "匯款紀錄" },
    evidence_06: { label: "06", sub: "未寄出的信" },
    evidence_07: { label: "07", sub: "家族會議" },
    evidence_08: { label: "08", sub: "存取異常" },
    interview_wife: { label: "#1", sub: "周美蘭" },
    interview_son: { label: "#2", sub: "張承祐" },
    interview_daughter: { label: "#3", sub: "張若寧" },
    interview_lin: { label: "#4", sub: "林澈" },
    ai_q01: { label: "AI", sub: "為何第二遺囑" },
    ai_q02: { label: "AI", sub: "林澈是誰" },
    ai_q03: { label: "AI", sub: "是否不公平" },
    ai_q04: { label: "AI", sub: "愧疚污染" },
    ai_q05: { label: "AI", sub: "為何 70%" },
    ai_q06: { label: "AI", sub: "仍在操控" },
    contradictions: { label: "X", sub: "矛盾整理" },
  },
  categoryLabels: {
    intro: "開場",
    login: "案件登入",
    rules: "審查規則",
    console: "案件控制台",
    brief: "案件簡報",
    profile: "角色資料",
    evidence: "證據資料",
    interview: "家屬訪談",
    ai_inquiry: "AI 詢問",
    contradiction: "矛盾整理",
    crossroad: "關鍵抉擇",
    verdict: "最終裁決",
  },
  dashboardIntro: [
    "請依序完成各審查項目：簡報 → 角色檔案 → 八份證據 → 家屬訪談 → 林澈訪談 → AI 詢問。",
    "完成後可整理矛盾點，進入三個關鍵抉擇，最後提交裁決。",
  ],
};

export const caseD082: Story = {
  id: "case-d082",
  title: "AI遺囑執行人",
  subtitle: "第二案：父親的第二遺囑",
  caseNumber: "D-082",
  description:
    "企業家張世昌死後，AI 人格提出第二遺囑，要求將大部分遺產留給多年未聯絡的私生子林澈。",
  startNodeId: "start",
  minNodesBeforeVerdict: 20,
  nodes: {
"""
    )

    # Onboarding & hub
    parts.append(
        node(
            "start",
            "intro",
            "開場",
            "D-082",
            START,
            choice("start-accept", "接手案件", {}, "case_login"),
        )
    )
    parts.append(
        node(
            "case_login",
            "login",
            "案件登入",
            "數位遺囑執行署",
            CASE_LOGIN,
            ",\n".join(
                [
                    choice("login-console", "進入案件控制台", {}, "console"),
                    choice("login-rules", "閱讀遺產輔助型人格審查規則", {}, "rules"),
                ]
            ),
        )
    )
    parts.append(
        node(
            "rules",
            "rules",
            "審查規則",
            "節錄",
            RULES,
            back("rules-back"),
        )
    )
    parts.append(node("console", "console", "案件控制台", "D-082", CONSOLE))
    parts.append(
        node("brief", "brief", "案件簡報", "D-082", BRIEF, back("brief-back"))
    )

    for pid, title, sub, content in [
        ("profile_zhang", "角色檔案", "張世昌", PROFILE_ZHANG),
        ("profile_wife", "角色檔案", "周美蘭", PROFILE_WIFE),
        ("profile_son", "角色檔案", "張承祐", PROFILE_SON),
        ("profile_daughter", "角色檔案", "張若寧", PROFILE_DAUGHTER),
        ("profile_lin", "角色檔案", "林澈", PROFILE_LIN),
        ("profile_ai", "角色檔案", "AI 張世昌", PROFILE_AI),
    ]:
        parts.append(node(pid, "profile", title, sub, content, back()))

    OUT.write_text("".join(parts))
    print(f"Wrote partial file ({OUT.stat().st_size} bytes) - run part 2")


if __name__ == "__main__":
    main()
