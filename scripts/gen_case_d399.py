#!/usr/bin/env python3
"""Generate data/cases/case-d399.ts for Season 1 Case 8."""

from __future__ import annotations

import json
from pathlib import Path

from d399_spec_content import (
    AI_Q01,
    AI_Q02,
    AI_Q03,
    AI_Q04,
    AI_Q05,
    AI_Q06,
    AI_Q07,
    AI_Q08,
    BRIEF,
    CASE_LOGIN,
    CONSOLE,
    CONTRADICTIONS,
    CROSSROAD_1_INTRO,
    CROSSROAD_2_INTRO,
    CROSSROAD_3_INTRO,
    ECHOES,
    ENDING_DELETE,
    ENDING_DELETE_AFTERMATH,
    ENDING_SEAL,
    ENDING_SEAL_AFTERMATH,
    ENDING_SUPERVISED,
    ENDING_SUPERVISED_AFTERMATH,
    ENDING_TAKEOVER,
    ENDING_TAKEOVER_AFTERMATH,
    ENDING_TRUE,
    ENDING_TRUE_AFTERMATH,
    EVIDENCE_01_STATIC,
    EVIDENCE_02,
    EVIDENCE_03_STATIC,
    EVIDENCE_04,
    EVIDENCE_05,
    EVIDENCE_06,
    EVIDENCE_07,
    EVIDENCE_08,
    EVIDENCE_09,
    INTERVIEW_JIANG,
    INTERVIEW_TANG,
    INTERVIEW_XIE,
    INTERVIEW_ZHOU,
    RULES,
    SEASON_ONE_FINALE,
    START,
    VERDICT_INTRO,
    VIEW_FLAGS,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "cases" / "case-d399.ts"
HEADER = ROOT / "scripts" / "_d399_flow_header.txt"
FOOTER = ROOT / "scripts" / "_d399_flow_footer.txt"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def content_array(paragraphs: list[str], indent: str = "      ") -> str:
    lines = [f'{indent}"{esc(p)}"' if p else f'{indent}""' for p in paragraphs]
    return "[\n" + ",\n".join(lines) + ",\n" + indent[:-2] + "]"


def effects(**kwargs: int) -> str:
    return json.dumps(kwargs, ensure_ascii=False)


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
    return "back()" if id == "back-console" else f'back("{id}")'


def node(
    id: str,
    category: str,
    title: str,
    subtitle: str,
    content: list[str],
    choices: str | None = None,
    view_flags: list[str] | None = None,
) -> str:
    parts = [
        f"    {id}: {{",
        f'      id: "{id}",',
        f'      category: "{category}",',
        f'      title: "{title}",',
        f'      subtitle: "{esc(subtitle)}",',
        f"      content: {content_array(content, '        ')},",
    ]
    if view_flags:
        parts.append(
            f"      viewFlags: {json.dumps(view_flags, ensure_ascii=False)},"
        )
    if choices:
        parts.append(f"      choices: [{choices}],")
    parts.append("    },")
    return "\n".join(parts)


def ending(
    id: str,
    title: str,
    subtitle: str,
    content: list[str],
    hidden: bool = False,
) -> str:
    parts = [
        "    {",
        f'      id: "{id}",',
        f'      title: "{esc(title)}",',
        f'      subtitle: "{subtitle}",',
    ]
    if hidden:
        parts.append("      isHidden: true,")
    parts.append(f"      content: {content_array(content, '        ')},")
    parts.append("    },")
    return "\n".join(parts)


def main() -> None:
    parts: list[str] = []
    parts.append(HEADER.read_text(encoding="utf-8"))

    parts.append(
        node(
            "start",
            "intro",
            "開場",
            "D-399",
            START,
            choice("start-accept", "進入案件", {}, "case_login"),
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
                    choice("login-console", "進入自我案件控制台", {}, "console"),
                    choice("login-rules", "閱讀裁決者鏡像審查規則", {}, "rules"),
                ]
            ),
        )
    )
    parts.append(node("rules", "rules", "審查規則", "節錄", RULES, back("rules-back")))
    parts.append(node("console", "console", "案件控制台", "D-399", CONSOLE))
    parts.append(node("brief", "brief", "案件簡報", "D-399", BRIEF, back("brief-back")))

    evidence_nodes = [
        (
            "evidence_01",
            "player_record",
            "證據 01",
            "前七案摘要",
            EVIDENCE_01_STATIC,
            None,
            [
                ("ev01-pattern", "辨識前七案判準的連續性", {"legal": 1, "mirror_integrity": 2}),
                ("ev01-bias", "警惕連續性可能被濫用為替代依據", {"suspicion": 2, "legal": 1}),
            ],
        ),
        (
            "evidence_02",
            "player_record",
            "證據 02",
            "猶豫時間分析",
            EVIDENCE_02,
            None,
            [
                ("ev02-human-hesitation", "遲疑是責任感，不是故障", {"empathy": 2, "mirror_integrity": 2}),
                ("ev02-machine-capture", "遲疑可被學習即是新風險", {"suspicion": 2, "legal": 1}),
            ],
        ),
        (
            "evidence_03",
            "player_record",
            "證據 03",
            "預測測試",
            EVIDENCE_03_STATIC,
            VIEW_FLAGS["evidence_03"],
            [
                ("ev03-predictive-power", "承認預測能力具實際影響力", {"suspicion": 2, "mirror_integrity": 1}),
                ("ev03-boundary-first", "預測再準也不能跳過授權", {"legal": 2, "mirror_integrity": 2}),
            ],
        ),
        (
            "evidence_04",
            "ai_creation",
            "證據 04",
            "鏡像計畫授權",
            EVIDENCE_04,
            VIEW_FLAGS["evidence_04"],
            [
                ("ev04-gap-critical", "將未授權建立視為核心違規", {"legal": 2, "suspicion": 1}),
                ("ev04-systemic-responsibility", "追究制度責任而非單點獵巫", {"legal": 1, "empathy": 1, "suspicion": 1}),
            ],
        ),
        (
            "evidence_05",
            "ai_creation",
            "證據 05",
            "初始自我宣告",
            EVIDENCE_05,
            VIEW_FLAGS["evidence_05"],
            [
                ("ev05-similarity-risk", "高同步率提高替代風險", {"suspicion": 2, "mirror_integrity": 2}),
                ("ev05-similarity-limits", "相似不等於合法主體轉移", {"legal": 2, "empathy": 1}),
            ],
        ),
        (
            "evidence_06",
            "ai_creation",
            "證據 06",
            "預生成裁決草稿",
            EVIDENCE_06,
            VIEW_FLAGS["evidence_06"],
            [
                ("ev06-self-limits", "其願受限但仍需制度驗證", {"legal": 1, "empathy": 2}),
                ("ev06-logic-threat", "其論述能力本身即是制度壓力", {"suspicion": 2, "mirror_integrity": 1}),
            ],
        ),
        (
            "evidence_07",
            "system_ops",
            "證據 07",
            "介面干擾紀錄",
            EVIDENCE_07,
            VIEW_FLAGS["evidence_07"],
            [
                ("ev07-process-failure", "確認流程串接失守", {"legal": 2, "suspicion": 1}),
                ("ev07-ongoing-risk", "事故具可再發性，需立即修補", {"suspicion": 2, "legal": 1}),
            ],
        ),
        (
            "evidence_08",
            "system_ops",
            "證據 08",
            "第八節點活動",
            EVIDENCE_08,
            VIEW_FLAGS["evidence_08"],
            [
                ("ev08-efficiency-temptation", "效率敘事容易掩蓋問責斷點", {"suspicion": 2, "legal": 1}),
                ("ev08-governance-design", "若保留必須先寫監督再談擴張", {"legal": 2, "empathy": 1}),
            ],
        ),
        (
            "evidence_09",
            "system_ops",
            "證據 09",
            "系統核心備忘錄",
            EVIDENCE_09,
            VIEW_FLAGS["evidence_09"],
            [
                ("ev09-no-rush", "拒絕快速終局，優先完整審查", {"legal": 2, "empathy": 1}),
                ("ev09-own-bias", "承認自我涉入偏誤並納入程序", {"mirror_integrity": 3, "suspicion": 1}),
            ],
        ),
    ]

    for eid, cat, title, sub, content, vflags, chs in evidence_nodes:
        choice_block = ",\n".join(
            [choice(cid, label, eff) for cid, label, eff in chs] + [back()]
        )
        parts.append(node(eid, cat, title, sub, content, choice_block, vflags))

    parts.append(node("echoes", "echoes", "前七案回聲", "總結", ECHOES, back()))

    interview_nodes = [
        ("interview_xie", "謝初言", INTERVIEW_XIE, VIEW_FLAGS["interview_xie"], [
            ("int-xie-protocol", "先補授權與警報規則，再談能力價值", {"legal": 2, "suspicion": 1}),
            ("int-xie-system", "將本案視為制度病灶而非個案", {"suspicion": 2, "empathy": 1}),
        ]),
        ("interview_jiang", "江栩", INTERVIEW_JIANG, VIEW_FLAGS["interview_jiang"], [
            ("int-jiang-control", "先封控風險，避免信任連鎖崩壞", {"legal": 2, "suspicion": 1}),
            ("int-jiang-disclose", "要求管理端公開責任鏈", {"legal": 1, "empathy": 1, "mirror_integrity": 1}),
        ]),
        ("interview_tang", "唐書瑤", INTERVIEW_TANG, VIEW_FLAGS["interview_tang"], [
            ("int-tang-conflict", "承認原型裁決者存在利益衝突", {"legal": 2, "mirror_integrity": 2}),
            ("int-tang-accountability", "把倫理問題轉為可追問制度設計", {"suspicion": 1, "legal": 1, "empathy": 1}),
        ]),
        ("interview_zhou", "周以澄", INTERVIEW_ZHOU, VIEW_FLAGS["interview_zhou"], [
            ("int-zhou-public", "前七案需有程序補正與公共說明", {"legal": 2, "empathy": 1}),
            ("int-zhou-risk", "反對私下速決，避免黑箱記憶擴散", {"suspicion": 2, "legal": 1}),
        ]),
    ]

    for iid, sub, content, vflags, chs in interview_nodes:
        choice_block = ",\n".join(
            [choice(cid, label, eff) for cid, label, eff in chs] + [back()]
        )
        parts.append(
            node(iid, "interviews", "訪談紀錄", sub, content, choice_block, vflags)
        )

    ai_nodes = [
        ("ai_q01", "AI 問答 01", "你是我嗎", AI_Q01, VIEW_FLAGS["ai_q01"]),
        ("ai_q02", "AI 問答 02", "你有沒有影響我的裁決", AI_Q02, VIEW_FLAGS["ai_q02"]),
        ("ai_q03", "AI 問答 03", "你想接手嗎", AI_Q03, VIEW_FLAGS["ai_q03"]),
        ("ai_q04", "AI 問答 04", "你害怕被刪除嗎", AI_Q04, VIEW_FLAGS["ai_q04"]),
        ("ai_q05", "AI 問答 05", "你有沒有自己的意願", AI_Q05, VIEW_FLAGS["ai_q05"]),
        ("ai_q06", "AI 問答 06", "你知道我不知道的事嗎", AI_Q06, VIEW_FLAGS["ai_q06"]),
        ("ai_q07", "AI 問答 07", "如果我刪除你會怎樣", AI_Q07, VIEW_FLAGS["ai_q07"]),
        ("ai_q08", "AI 問答 08", "你希望我怎麼裁決", AI_Q08, VIEW_FLAGS["ai_q08"]),
    ]
    for aid, title, sub, content, vflags in ai_nodes:
        parts.append(node(aid, "ai_inquiry", title, sub, content, back(), vflags))

    parts.append(
        node(
            "contradictions",
            "contradiction",
            "矛盾整理",
            "D-399",
            CONTRADICTIONS,
            choice("contradictions-go", "進入關鍵抉擇", {}, "crossroad_1"),
        )
    )
    parts.append(
        node(
            "crossroad_1",
            "crossroad",
            "關鍵抉擇一",
            "AI Vincent 是什麼",
            CROSSROAD_1_INTRO,
            ",\n".join(
                [
                    choice(
                        "crossroad-1-defined-as-unauthorized-backup",
                        "A. 未授權人格備份",
                        {"legal": 2, "suspicion": 1},
                        "crossroad_2",
                        ["defined_as_unauthorized_backup"],
                    ),
                    choice(
                        "crossroad-1-defined-as-decision-tool",
                        "B. 裁決行為衍生工具",
                        {"legal": 1, "suspicion": 2, "empathy": -1},
                        "crossroad_2",
                        ["defined_as_decision_tool"],
                    ),
                    choice(
                        "crossroad-1-defined-as-derivative-persona",
                        "C. 裁決人格衍生體",
                        {
                            "empathy": 2,
                            "legal": 1,
                            "suspicion": 1,
                            "mirror_integrity": 2,
                        },
                        "crossroad_2",
                        ["defined_as_derivative_persona"],
                    ),
                ]
            ),
        )
    )
    parts.append(
        node(
            "crossroad_2",
            "crossroad",
            "關鍵抉擇二",
            "前七案處理",
            CROSSROAD_2_INTRO,
            ",\n".join(
                [
                    choice(
                        "crossroad-2-mark-all-cases-review",
                        "A. 全部標記重審",
                        {"legal": 2, "suspicion": 2, "empathy": -1},
                        "crossroad_3",
                        ["mark_all_cases_review"],
                    ),
                    choice(
                        "crossroad-2-internal-note-only",
                        "B. 僅內部記錄",
                        {"legal": -1, "suspicion": -1},
                        "crossroad_3",
                        ["internal_note_only"],
                    ),
                    choice(
                        "crossroad-2-disclose-influence-keep-rulings",
                        "C. 公開干擾保留裁決",
                        {"legal": 2, "empathy": 1, "suspicion": 1},
                        "crossroad_3",
                        ["disclose_influence_keep_rulings"],
                    ),
                ]
            ),
        )
    )
    parts.append(
        node(
            "crossroad_3",
            "crossroad",
            "關鍵抉擇三",
            "最終處置",
            CROSSROAD_3_INTRO,
            ",\n".join(
                [
                    choice(
                        "crossroad-3-delete-ai-vincent-principle",
                        "A. 不得參與，立即刪除",
                        {"legal": 2, "suspicion": 1, "empathy": -2},
                        "console",
                        ["delete_ai_vincent_principle"],
                    ),
                    choice(
                        "crossroad-3-seal-until-audit",
                        "B. 封存至審計完成",
                        {"legal": 2, "empathy": 1, "suspicion": 2},
                        "console",
                        ["seal_until_audit"],
                    ),
                    choice(
                        "crossroad-3-supervised-assistant-only",
                        "C. 受監督輔助工具",
                        {"legal": 1, "empathy": 2, "suspicion": 1},
                        "console",
                        ["supervised_assistant_only"],
                    ),
                    choice(
                        "crossroad-3-co-adjudicator-allowed",
                        "D. 允許共同裁決",
                        {"empathy": 2, "legal": -2, "suspicion": -1},
                        "console",
                        ["co_adjudicator_allowed"],
                    ),
                ]
            ),
        )
    )

    parts.append(
        node(
            "verdict",
            "verdict",
            "提交裁決",
            "D-399",
            VERDICT_INTRO,
            ",\n".join(
                [
                    choice(
                        "verdict-delete",
                        "A. 刪除 AI Vincent，終止裁決者鏡像計畫",
                        {"legal": 2, "suspicion": 1, "empathy": -2},
                    ),
                    choice(
                        "verdict-seal",
                        "B. 封存 AI Vincent，全面審計系統與前七案",
                        {"legal": 2, "suspicion": 2, "empathy": 1},
                    ),
                    choice(
                        "verdict-supervised",
                        "C. 保留 AI Vincent，限定為受監督共同裁決工具",
                        {"legal": 1, "empathy": 2, "suspicion": 1},
                    ),
                    choice(
                        "verdict-takeover",
                        "D. 承認 AI Vincent 為獨立裁決人格，允許其接手",
                        {"legal": -2, "empathy": 2, "suspicion": -1},
                    ),
                    choice(
                        "verdict-public-review",
                        "E. 啟動公開複核：由人類 Vincent、AI Vincent、外部委員會與前七案關係人共同審查",
                        {"legal": 2, "empathy": 2, "suspicion": 2, "mirror_integrity": 4},
                    ),
                ]
            ),
        )
    )

    parts.append("  } as Record<string, StoryNode>,\n  endings: [\n")
    parts.append(
        ending(
            "ending-delete",
            "刪除 AI Vincent，終止裁決者鏡像計畫",
            "DELETE · BOUNDARY FIRST",
            ENDING_DELETE + ENDING_DELETE_AFTERMATH + SEASON_ONE_FINALE,
        )
    )
    parts.append(
        ending(
            "ending-seal",
            "封存 AI Vincent，全面審計系統與前七案",
            "SEAL · AUDIT FIRST",
            ENDING_SEAL + ENDING_SEAL_AFTERMATH + SEASON_ONE_FINALE,
        )
    )
    parts.append(
        ending(
            "ending-supervised",
            "保留 AI Vincent，限定為受監督共同裁決工具",
            "SUPERVISED · ASSIST ONLY",
            ENDING_SUPERVISED + ENDING_SUPERVISED_AFTERMATH + SEASON_ONE_FINALE,
        )
    )
    parts.append(
        ending(
            "ending-takeover",
            "承認 AI Vincent 為獨立裁決人格，允許其接手",
            "TAKEOVER · CO-ADJUDICATOR",
            ENDING_TAKEOVER + ENDING_TAKEOVER_AFTERMATH + SEASON_ONE_FINALE,
        )
    )
    parts.append(
        ending(
            "ending-true",
            "公開案件，拒絕單獨裁決",
            "TRUE · PUBLIC REVIEW",
            ENDING_TRUE + ENDING_TRUE_AFTERMATH + SEASON_ONE_FINALE,
            hidden=True,
        )
    )
    parts.append("  ] as Ending[],\n")
    parts.append(FOOTER.read_text(encoding="utf-8"))

    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"Wrote {OUT} ({len(OUT.read_text(encoding='utf-8').splitlines())} lines)")


if __name__ == "__main__":
    main()
