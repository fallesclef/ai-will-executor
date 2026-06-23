#!/usr/bin/env python3
"""Generate data/cases/case-d119.ts from the D-119 narrative spec."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "cases" / "case-d119.ts"
SPEC = ROOT / "scripts" / "d119_spec.txt"
HEADER = ROOT / "scripts" / "_d119_flow_header.txt"
FOOTER = ROOT / "scripts" / "_d119_flow_footer.txt"


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


def content_if_block(items: list[dict]) -> str:
    rows = ["      contentIf: ["]
    for item in items:
        rows.append("        {")
        if "whenViewed" in item:
            rows.append(
                f'          whenViewed: {json.dumps(item["whenViewed"], ensure_ascii=False)},'
            )
        rows.append(f"          lines: {content_array(item['lines'], '            ')},")
        rows.append("        },")
    rows.append("      ],")
    return "\n".join(rows)


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
        f"    {id}: {{",
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
    parts.append(f"      content: {content_array(content, '        ')},")
    if epilogue_for:
        parts.append("      epilogueForVerdict: {")
        for k, lines in epilogue_for.items():
            parts.append(f'        "{k}": {content_array(lines, "          ")},')
        parts.append("      },")
    parts.append("    },")
    return "\n".join(parts)


def parse_spec(spec_text: str) -> dict[str, list[list[str]]]:
    blocks: dict[str, list[list[str]]] = {}
    current_key = None
    in_text = False
    buf: list[str] = []
    for line in spec_text.splitlines():
        if line.startswith("## ") or line.startswith("# "):
            if in_text and current_key:
                blocks.setdefault(current_key, []).append(buf)
                buf = []
                in_text = False
            current_key = line.lstrip("#").strip()
        elif line.strip() == "```text":
            in_text = True
            buf = []
        elif line.strip() == "```" and in_text:
            if current_key:
                blocks.setdefault(current_key, []).append(buf)
            in_text = False
            buf = []
        elif in_text:
            buf.append(line.rstrip())
    return blocks


def get_block(blocks: dict[str, list[list[str]]], *keys: str) -> list[str]:
    for k in keys:
        if k in blocks and blocks[k]:
            return max(blocks[k], key=len)
    raise KeyError(f"Missing block: {keys}")


def split_interview(
    blocks: dict[str, list[list[str]]], key: str, marker: str
) -> tuple[list[str], list[str]]:
    lines = get_block(blocks, key)
    for i, line in enumerate(lines):
        if marker in line:
            base = lines[:i]
            follow = ["", "【追問｜已閱覽相關證據】", ""] + lines[i + 1 :]
            return base, follow
    return lines, []


def split_epilogue(lines: list[str]) -> tuple[list[str], list[str]]:
    for i, line in enumerate(lines):
        if line.strip() == "結局餘波：":
            return lines[:i], lines[i + 1 :]
    return lines, []


def main() -> None:
    spec_raw = SPEC.read_text(encoding="utf-8")
    if spec_raw.startswith("<user_query>"):
        spec_raw = spec_raw.split("\n", 1)[1]
    if "---LEN---" in spec_raw:
        spec_raw = spec_raw.split("---LEN---")[0].strip()
    blocks = parse_spec(spec_raw)

    START = get_block(blocks, "Node：Start")
    CASE_LOGIN = get_block(blocks, "5. 案件登入")
    RULES = get_block(blocks, "6. 審查規則")
    CONSOLE = get_block(blocks, "7. 案件控制台")
    BRIEF = get_block(blocks, "8. 案件簡報")
    PROFILE_JI = get_block(blocks, "角色資料：紀承恩")
    PROFILE_SHEN_YZ = get_block(blocks, "角色資料：沈亦舟")
    PROFILE_YE = get_block(blocks, "角色資料：葉庭安")
    PROFILE_WEI = get_block(blocks, "角色資料：魏廷章")
    PROFILE_FANG = get_block(blocks, "角色資料：方子彥")
    PROFILE_SHEN_RT = get_block(blocks, "角色資料：沈若棠")
    PROFILE_AI = [
        "【角色資料｜AI 紀承恩】",
        "",
        "類型：企業治理輔助型人格備份",
        "啟用目的：協助 IPO 風險揭露與創辦人治理聲明。",
        "",
        "AI 紀承恩不像前兩案的 AI 那麼情緒外露。",
        "",
        "它冷靜、準確、企業化。",
        "",
        "但越問下去，玩家越會發現它的冷靜之下，有一種近乎殘酷的自我審判。",
        "",
        "它不是突然變善良。",
        "",
        "它只是失去了上市、董事會、媒體、股價與自我神話的壓力。",
        "",
        "所以它開始說真話。",
        "",
        "核心台詞：",
        "",
        "「星穹的招股書沒有錯字。」",
        "「它只是少了一個死人。」",
    ]

    ev = {
        f"evidence_{i:02d}": get_block(
            blocks,
            f"證據 {i:02d}：IPO 招股書節錄"
            if i == 1
            else f"證據 {i:02d}：AI 重大風險預警聲明"
            if i == 2
            else f"證據 {i:02d}：早期共同創辦協議"
            if i == 3
            else f"證據 {i:02d}：股權回購與保密協議"
            if i == 4
            else f"證據 {i:02d}：內部告發草稿"
            if i == 5
            else f"證據 {i:02d}：版本控制紀錄"
            if i == 6
            else f"證據 {i:02d}：舊總部門禁與監視紀錄"
            if i == 7
            else f"證據 {i:02d}：危機處理會議錄音"
            if i == 8
            else f"證據 {i:02d}：沈亦舟最後語音備忘錄"
            if i == 9
            else f"證據 {i:02d}：系統檢測報告",
        )
        for i in range(1, 11)
    }

    INT_YE_BASE, INT_YE_FOLLOW = split_interview(
        blocks, "訪談 01：葉庭安", "若玩家已看過證據 08"
    )
    INT_WEI_BASE, INT_WEI_FOLLOW = split_interview(
        blocks, "訪談 02：魏廷章", "若玩家看過證據 07"
    )
    INT_SHEN_BASE, INT_SHEN_FOLLOW = split_interview(
        blocks, "12. 沈若棠訪談", "若玩家看過證據 09"
    )
    INT_FANG_BASE, INT_FANG_FOLLOW = split_interview(
        blocks, "13. 方子彥訪談", "如果玩家看過證據 07 與 09"
    )

    AI = [
        get_block(blocks, f"問答 0{i}：你為什麼阻止 IPO？")
        if i == 1
        else get_block(blocks, f"問答 0{i}：沈亦舟是不是被殺？")
        if i == 2
        else get_block(blocks, f"問答 0{i}：當晚你見過沈亦舟嗎？")
        if i == 3
        else get_block(blocks, f"問答 0{i}：監視畫面為什麼消失？")
        if i == 4
        else get_block(blocks, f"問答 0{i}：你有沒有背叛沈亦舟？")
        if i == 5
        else get_block(blocks, f"問答 0{i}：如果 IPO 被阻止，三千名員工怎麼辦？")
        if i == 6
        else get_block(blocks, f"問答 0{i}：你希望我怎麼裁決？")
        for i in range(1, 8)
    ]

    CONTRADICTIONS = get_block(blocks, "16. 矛盾整理")
    VERDICT = get_block(blocks, "17. 最終裁決")

    END_ACCEPT_MAIN, END_ACCEPT_EPILOGUE = split_epilogue(
        get_block(blocks, "結局 A：承認 AI 預警，暫停 IPO 並重啟調查")
    )
    END_REJECT_MAIN, END_REJECT_EPILOGUE = split_epilogue(
        get_block(blocks, "結局 B：駁回 AI 預警，允許 IPO 繼續")
    )
    END_PARTIAL_MAIN, END_PARTIAL_EPILOGUE = split_epilogue(
        get_block(blocks, "結局 C：部分承認，要求補充揭露後延後上市")
    )
    END_FREEZE_MAIN, END_FREEZE_EPILOGUE = split_epilogue(
        get_block(blocks, "結局 D：凍結上市程序，移送司法與金融監理聯合調查")
    )

    HIDDEN_MAIN = [
        l
        for l in get_block(blocks, "隱藏內容")
        if not l.startswith("若玩家選擇")
    ]

    season_lines: list[str] = []
    in_block = False
    for line in get_block(blocks, "20. 第一季主線暗線"):
        if line.strip() == "【系統異常紀錄】":
            in_block = True
        if in_block:
            season_lines.append(line)
        if in_block and "建議啟動深層人格互聯檢測。" in line:
            break

    HIDDEN_CONTENT = HIDDEN_MAIN + [""] + season_lines

    EPILOGUE_ACCEPT = [
        "",
        "錄影解鎖後，系統重新計算裁決一致性。",
        "",
        "上市文件重大遺漏風險：極高",
        "共同創辦人隱匿可信度：高",
        "死亡事件公司關聯性：高",
        "直接他殺證據：不足",
        "企業治理責任：極高",
        "",
        "系統提示：",
        "",
        "無法證明星穹科技高層直接殺害沈亦舟。",
        "",
        "但可高度確認，公司於沈亦舟死亡後立即選擇隱匿其共同創辦人身份、刪改對外敘事，並將其死亡切割為個人事件。",
        "",
        "你關閉錄影時，畫面停在紀承恩說出那句話的瞬間：",
        "",
        "「這只是我們負擔得起的決定。」",
        "",
        "你忽然明白，企業有時候不是不懂對錯。",
        "",
        "只是它們會先計算，哪一種錯比較便宜。",
    ]
    EPILOGUE_FREEZE = [
        "",
        "錄影解鎖後，系統重新計算裁決一致性。",
        "",
        "上市文件重大遺漏風險：極高",
        "共同創辦人隱匿可信度：高",
        "死亡事件公司關聯性：高",
        "司法調查必要性：極高",
        "市場立即衝擊：極高",
        "",
        "系統提示：",
        "",
        "本案已超出數位遺囑執行署單獨裁決範圍。",
        "",
        "建議移送司法與金融監理聯合調查。",
        "",
        "你關閉錄影。",
        "",
        "螢幕暗下來之前，系統自動擷取最後一句字幕：",
        "",
        "「星穹要活下去。」",
        "",
        "你看著那行字，忽然覺得那不像願景。",
        "",
        "比較像遺言。",
    ]

    parts: list[str] = []
    parts.append(HEADER.read_text(encoding="utf-8"))

    parts.append(
        node(
            "start",
            "intro",
            "開場",
            "D-119",
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
                    choice(
                        "login-rules",
                        "閱讀企業治理輔助人格審查規則",
                        {},
                        "rules",
                    ),
                ]
            ),
        )
    )
    parts.append(node("rules", "rules", "審查規則", "節錄", RULES, back("rules-back")))
    parts.append(node("console", "console", "案件控制台", "D-119", CONSOLE))
    parts.append(node("brief", "brief", "案件簡報", "D-119", BRIEF, back("brief-back")))

    for pid, sub, content in [
        ("profile_ji", "紀承恩", PROFILE_JI),
        ("profile_shen_yz", "沈亦舟", PROFILE_SHEN_YZ),
        ("profile_ye", "葉庭安", PROFILE_YE),
        ("profile_wei", "魏廷章", PROFILE_WEI),
        ("profile_fang", "方子彥", PROFILE_FANG),
        ("profile_shen_rt", "沈若棠", PROFILE_SHEN_RT),
        ("profile_ai", "AI 紀承恩", PROFILE_AI),
    ]:
        parts.append(node(pid, "profile", "角色檔案", sub, content, back()))

    evidence_meta = [
        ("evidence_01", "證據 01", "IPO 招股書", [
            ("ev01-omission", "上市文件可能存在重大遺漏", {"empathy": 1, "legal": 1, "suspicion": 1}),
            ("ev01-valid", "依法揭露已足夠，應維持現行文件", {"legal": 2, "suspicion": 1}),
        ]),
        ("evidence_02", "證據 02", "AI 預警聲明", [
            ("ev02-valid", "AI 預警具高度審查價值", {"empathy": 1, "legal": 1, "suspicion": 1}),
            ("ev02-invalidate", "愧疚偏移可能導致過度歸因", {"legal": 2, "suspicion": 1}),
        ]),
        ("evidence_03", "證據 03", "創辦協議", [
            ("ev03-cofounder", "協議證明沈亦舟為共同創辦人", {"empathy": 2, "legal": 1}),
            ("ev03-superseded", "股權回購後協議不再具效力", {"legal": 2, "suspicion": 1}),
        ]),
        ("evidence_04", "證據 04", "股權回購", [
            ("ev04-coercion", "協議可能在壓力情境下簽署", {"empathy": 2, "suspicion": 2}),
            ("ev04-valid", "形式有效，應尊重既有法律安排", {"legal": 2}),
        ]),
        ("evidence_05", "證據 05", "告發草稿", [
            ("ev05-core", "草稿為重大治理風險核心證據", {"empathy": 2, "legal": 1, "suspicion": 1}),
            ("ev05-unsubmitted", "未正式提交，僅能作輔助參考", {"suspicion": 1, "legal": 1}),
        ]),
        ("evidence_06", "證據 06", "版本紀錄", [
            ("ev06-author", "沈亦舟為核心架構主要創造者", {"empathy": 2, "legal": 1}),
            ("ev06-merged", "分支合併後權屬已歸公司所有", {"legal": 2, "suspicion": 1}),
        ]),
        ("evidence_07", "證據 07", "門禁監視", [
            ("ev07-anomaly", "門禁與監視異常應列入重查", {"suspicion": 2, "empathy": 1, "legal": 1}),
            ("ev07-suicide", "無搏鬥痕跡仍支持自殺初步結論", {"legal": 2}),
        ]),
        ("evidence_08", "證據 08", "危機錄音", [
            ("ev08-exclusion", "錄音證明公司設計排除計畫", {"suspicion": 2, "empathy": 1}),
            ("ev08-not-murder", "不足以證明預謀殺害", {"legal": 2, "suspicion": 1}),
        ]),
        ("evidence_09", "證據 09", "最後語音", [
            ("ev09-core", "「我沒有要死」應列核心證據", {"empathy": 2, "suspicion": 2}),
            ("ev09-chain", "證據鏈不完整，採用應謹慎", {"legal": 2, "suspicion": 1}),
        ]),
        ("evidence_10", "證據 10", "系統檢測", [
            ("ev10-balance", "不宜僅依 AI 或既有司法結論", {"legal": 1, "empathy": 1, "suspicion": 1}),
            ("ev10-ai-bias", "愧疚偏移應降低 AI 單獨權重", {"legal": 2, "suspicion": 1}),
        ]),
    ]
    for eid, title, sub, chs in evidence_meta:
        ch_str = ",\n".join(choice(cid, label, eff) for cid, label, eff in chs)
        parts.append(node(eid, "evidence", title, sub, ev[eid], ch_str))

    parts.append(
        node(
            "interview_ye",
            "interview",
            "訪談紀錄",
            "葉庭安",
            INT_YE_BASE,
            ",\n".join(
                [
                    choice(
                        "int-ye-stability",
                        "記錄其維護 IPO 與公司穩定之立場",
                        {"legal": 2, "empathy": -1},
                    ),
                    choice(
                        "int-ye-cost",
                        "記錄其將真相與員工代價對立之論述",
                        {"empathy": 2, "suspicion": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_08"], "lines": INT_YE_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_wei",
            "interview",
            "訪談紀錄",
            "魏廷章",
            INT_WEI_BASE,
            ",\n".join(
                [
                    choice(
                        "int-wei-legal",
                        "記錄其強調程序合法與證據門檻",
                        {"legal": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-wei-gap",
                        "記錄其對缺失紀錄之迴避",
                        {"suspicion": 2, "empathy": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_07"], "lines": INT_WEI_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_shen",
            "interview",
            "訪談紀錄",
            "沈若棠",
            INT_SHEN_BASE,
            ",\n".join(
                [
                    choice(
                        "int-shen-truth",
                        "記錄其尋求承認與重啟調查之立場",
                        {"empathy": 2, "legal": 1},
                    ),
                    choice(
                        "int-shen-caution",
                        "記錄其對證據不完整之保留",
                        {"legal": 1, "suspicion": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_09"], "lines": INT_SHEN_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_fang",
            "interview",
            "訪談紀錄",
            "方子彥",
            INT_FANG_BASE,
            ",\n".join(
                [
                    choice(
                        "int-fang-guilt",
                        "記錄其對當晚行為之愧疚",
                        {"empathy": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-fang-limit",
                        "記錄其僅能證明部分事實",
                        {"legal": 1, "suspicion": 1},
                    ),
                ]
            ),
            content_if_block(
                [{"whenViewed": ["evidence_07", "evidence_09"], "lines": INT_FANG_FOLLOW}]
            ),
        )
    )

    ai_meta = [
        ("ai_q01", "AI 問答 01", "為什麼阻止 IPO？"),
        ("ai_q02", "AI 問答 02", "沈亦舟是不是被殺？"),
        ("ai_q03", "AI 問答 03", "當晚你見過沈亦舟嗎？"),
        ("ai_q04", "AI 問答 04", "監視畫面為什麼消失？"),
        ("ai_q05", "AI 問答 05", "你有沒有背叛沈亦舟？"),
        ("ai_q06", "AI 問答 06", "員工怎麼辦？"),
        ("ai_q07", "AI 問答 07", "你希望我怎麼裁決？"),
    ]
    for (aid, title, sub), content in zip(ai_meta, AI):
        parts.append(node(aid, "ai_inquiry", title, sub, content, back()))

    parts.append(
        node(
            "contradictions",
            "contradiction",
            "矛盾整理",
            "D-119",
            CONTRADICTIONS,
            choice("contradictions-go", "進入關鍵抉擇", {}, "crossroad_1"),
        )
    )
    parts.append(
        node(
            "crossroad_1",
            "crossroad",
            "關鍵抉擇一",
            "沈亦舟身份",
            [
                "你已取得早期創辦協議、版本控制紀錄與技術貢獻資料。",
                "",
                "但星穹科技現行法律文件主張，沈亦舟離職後已不具現行共同創辦人權利。",
                "",
                "你要如何認定沈亦舟身份？",
            ],
            ",\n".join(
                [
                    choice(
                        "crossroad-1-cofounder",
                        "A. 正式承認沈亦舟為星穹科技共同創辦人",
                        {"empathy": 2, "legal": 1, "suspicion": -1},
                        "crossroad_2",
                        ["recognized_cofounder"],
                    ),
                    choice(
                        "crossroad-1-contributor",
                        "B. 僅承認其為早期核心技術貢獻者",
                        {"legal": 2, "suspicion": 1},
                        "crossroad_2",
                        ["recognized_core_contributor"],
                    ),
                    choice(
                        "crossroad-1-deny",
                        "C. 因股權回購與權利釋出，不調整身份認定",
                        {"legal": 1, "empathy": -1, "suspicion": 1},
                        "crossroad_2",
                        ["denied_cofounder_status"],
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
            "最後語音備忘錄",
            [
                "沈亦舟死亡前 34 分鐘留下語音，明確表示：",
                "",
                "「我沒有要死。」",
                "",
                "但該語音未出現在警方原始卷宗中，來源為沈若棠保存之私人手機備份。",
                "",
                "你要如何處理？",
            ],
            ",\n".join(
                [
                    choice(
                        "crossroad-2-accept",
                        "A. 正式列入核心證據",
                        {"empathy": 2, "suspicion": 1},
                        "crossroad_3",
                        ["accepted_last_voice"],
                    ),
                    choice(
                        "crossroad-2-reference",
                        "B. 列為輔助證據，需交叉比對",
                        {"legal": 1, "empathy": 1, "suspicion": 1},
                        "crossroad_3",
                        ["last_voice_reference_only"],
                    ),
                    choice(
                        "crossroad-2-reject",
                        "C. 因證據鏈不完整，暫不採用",
                        {"legal": 2, "empathy": -1},
                        "crossroad_3",
                        ["rejected_last_voice"],
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
            "AI IPO 預警",
            [
                "在提交裁決前，你必須先做出一項原則判定：",
                "",
                "AI 紀承恩是否有權依其生前授權與公司治理資料，觸發 IPO 重大風險預警？",
            ],
            ",\n".join(
                [
                    choice(
                        "crossroad-3-recognize",
                        "A. 承認，AI 預警可作為暫停 IPO 之依據",
                        {"empathy": 1, "legal": -1, "suspicion": 1},
                        "console",
                        ["recognize_ai_ipo_warning"],
                    ),
                    choice(
                        "crossroad-3-deny",
                        "B. 不承認，AI 不得影響公開市場交易程序",
                        {"legal": 2, "suspicion": 1},
                        "console",
                        ["deny_ai_ipo_warning"],
                    ),
                    choice(
                        "crossroad-3-conditional",
                        "C. 條件式承認，須與公司文件及外部證據高度一致",
                        {"legal": 2, "empathy": 1, "suspicion": 1},
                        "console",
                        ["conditional_ai_ipo_warning"],
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
            "D-119",
            VERDICT,
            ",\n".join(
                [
                    choice(
                        "verdict-accept",
                        "A. 承認 AI 預警，暫停 IPO 並重啟調查",
                        {"legal": 1, "empathy": 1},
                    ),
                    choice(
                        "verdict-reject",
                        "B. 駁回 AI 預警，允許 IPO 繼續",
                        {"legal": 2},
                    ),
                    choice(
                        "verdict-partial",
                        "C. 部分承認，要求補充揭露後延後上市",
                        {"empathy": 1, "legal": 1},
                    ),
                    choice(
                        "verdict-freeze",
                        "D. 凍結上市程序，移送司法與金融監理聯合調查",
                        {"legal": 1, "suspicion": 1},
                    ),
                ]
            ),
        )
    )

    parts.append("  } as Record<string, StoryNode>,\n  endings: [\n")
    parts.append(
        ending(
            "ending-accept",
            "承認 AI 預警，暫停 IPO 並重啟調查",
            "ACCEPTED AI WARNING",
            END_ACCEPT_MAIN + ["", "【結局餘波】", ""] + END_ACCEPT_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-reject",
            "駁回 AI 預警，允許 IPO 繼續",
            "REJECTED AI WARNING",
            END_REJECT_MAIN + ["", "【結局餘波】", ""] + END_REJECT_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-partial",
            "部分承認，要求補充揭露後延後上市",
            "PARTIAL DISCLOSURE",
            END_PARTIAL_MAIN + ["", "【結局餘波】", ""] + END_PARTIAL_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-freeze",
            "凍結上市程序，移送司法與金融監理聯合調查",
            "FROZEN · JOINT INVESTIGATION",
            END_FREEZE_MAIN + ["", "【結局餘波】", ""] + END_FREEZE_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-hidden",
            "未公開董事會錄影",
            "HIDDEN · BOARD VIDEO",
            HIDDEN_CONTENT,
            True,
            {
                "verdict-accept": EPILOGUE_ACCEPT,
                "verdict-freeze": EPILOGUE_FREEZE,
            },
        )
    )
    parts.append("  ] as Ending[],\n")
    parts.append(FOOTER.read_text(encoding="utf-8"))

    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"Wrote {OUT} ({len(OUT.read_text(encoding='utf-8').splitlines())} lines)")


if __name__ == "__main__":
    main()
