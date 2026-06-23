#!/usr/bin/env python3
"""Generate data/cases/case-d144.ts from the D-144 narrative spec."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "cases" / "case-d144.ts"
SPEC = ROOT / "scripts" / "d144_spec.txt"
HEADER = ROOT / "scripts" / "_d144_flow_header.txt"
FOOTER = ROOT / "scripts" / "_d144_flow_footer.txt"


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
        elif line.strip().startswith("```text"):
            in_text = True
            buf = []
        elif line.strip().startswith("```") and in_text:
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


def get_first_block(blocks: dict[str, list[list[str]]], *keys: str) -> list[str]:
    for k in keys:
        if k in blocks and blocks[k]:
            return blocks[k][0]
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


def extract_inline_block(spec_text: str, marker: str) -> list[str]:
    idx = spec_text.index(marker)
    rest = spec_text[idx + len(marker) :]
    start = rest.index("```text")
    start = rest.index("\n", start) + 1
    end = rest.index("```", start)
    return [line.rstrip() for line in rest[start:end].splitlines()]


def main() -> None:
    spec_raw = SPEC.read_text(encoding="utf-8")
    blocks = parse_spec(spec_raw)

    START = get_block(blocks, "Node：Start")
    CASE_LOGIN = get_block(blocks, "5. 案件登入")
    RULES = get_block(blocks, "6. 審查規則")
    CONSOLE = get_block(blocks, "7. 案件控制台")
    BRIEF = get_block(blocks, "8. 案件簡報")
    PROFILE_GU = get_block(blocks, "角色資料：顧明遠")
    PROFILE_WEN = get_block(blocks, "角色資料：溫以柔")
    PROFILE_YIAN = get_block(blocks, "角色資料：顧以安")
    PROFILE_CAINING = get_block(blocks, "角色資料：顧采寧")
    PROFILE_SHEN = get_block(blocks, "角色資料：沈知禾")
    PROFILE_AI = [
        "【角色資料｜AI 顧明遠】",
        "",
        "類型：家庭與遺產輔助混合型人格備份",
        "啟用目的：協助解釋遺囑、家產處置與數位資產安排。",
        "",
        "AI 顧明遠不像第一案的 AI 陳雅惠那樣溫柔，也不像第三案 AI 紀承恩那樣冷峻。",
        "",
        "他像一位倔強的老人。",
        "",
        "說話慢。",
        "很固執。",
        "不太解釋。",
        "但每一句都有自己的房間。",
        "",
        "他主張：",
        "",
        "「我沒有把財產留給幻覺。」",
        "「我是把一個家，留給最後跟我一起住在裡面的存在。」",
        "",
        "核心台詞：",
        "",
        "「你們一直問她是不是人。」",
        "「可是你們沒有問過，這十年裡，是誰比較像有在生活。」",
    ]

    ev_keys = [
        "證據 01：正式遺囑",
        "證據 02：遺囑補充聲明",
        "證據 03：溫以柔服務合約",
        "證據 04：十年互動摘要",
        "證據 05：財產相關對話紀錄",
        "證據 06：顧明遠私人日記",
        "證據 07：子女通訊紀錄",
        "證據 08：靜海內部風險報告",
        "證據 09：海屋空間紀錄",
        "證據 10：系統檢測報告",
    ]
    ev = {f"evidence_{i:02d}": get_block(blocks, ev_keys[i - 1]) for i in range(1, 11)}

    INT_YIAN_BASE, INT_YIAN_FOLLOW = split_interview(
        blocks, "訪談 01：顧以安", "若玩家看過證據 07"
    )
    INT_CAINING_BASE, INT_CAINING_FOLLOW = split_interview(
        blocks, "訪談 02：顧采寧", "若玩家看過證據 06"
    )
    INT_SHEN_BASE, INT_SHEN_FOLLOW = split_interview(
        blocks, "訪談：沈知禾", "若玩家看過證據 08"
    )

    DIALOGUES = [
        get_block(blocks, "對話片段 01：妻子的信"),
        get_block(blocks, "對話片段 02：共同生活者"),
        get_block(blocks, "對話片段 03：死亡後"),
        get_block(blocks, "對話片段 04：財產"),
        get_block(blocks, "對話片段 05：最後清晨")
        + [
            "",
            "線索標籤：",
            "",
            "溫以柔死亡後第一項請求不是保留自己，而是保留「房子」。",
        ],
    ]

    AI = [
        get_block(blocks, "問答 01：溫以柔是誰？"),
        get_block(blocks, "問答 02：你愛她嗎？"),
        get_block(blocks, "問答 03：她是不是取代了你的家人？"),
        get_block(blocks, "問答 04：你是否被 AI 誘導？"),
        get_block(blocks, "問答 05：為什麼是 60%？"),
        get_block(blocks, "問答 06：溫以柔有沒有愛你？"),
        get_block(blocks, "問答 07：你希望我怎麼裁決？"),
    ]

    CONTRADICTIONS = get_block(blocks, "16. 矛盾整理")
    VERDICT = get_block(blocks, "17. 最終裁決")

    END_ACCEPT_MAIN, END_ACCEPT_EPILOGUE = split_epilogue(
        get_block(blocks, "結局 A：承認遺贈意願，成立溫以柔存續信託")
    )
    END_REJECT_MAIN, END_REJECT_EPILOGUE = split_epilogue(
        get_block(blocks, "結局 B：駁回遺贈，財產回歸法定繼承")
    )
    END_PARTIAL_MAIN, END_PARTIAL_EPILOGUE = split_epilogue(
        get_block(blocks, "結局 C：部分承認，保存海屋並限制 AI 商業使用")
    )
    END_FUND_MAIN, END_FUND_EPILOGUE = split_epilogue(
        get_block(blocks, "結局 D：封存溫以柔，遺產成立高齡孤獨公益基金")
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
        if in_block and "建議於第七案前啟動深層人格互聯檢測。" in line:
            break

    HIDDEN_CONTENT = HIDDEN_MAIN + [""] + season_lines

    EPILOGUE_ACCEPT = extract_inline_block(
        spec_raw, '若玩家選擇 A「成立溫以柔存續信託」，追加：'
    )
    EPILOGUE_PARTIAL = extract_inline_block(spec_raw, '若玩家選擇 C「部分承認」，追加：')

    parts: list[str] = []
    parts.append(HEADER.read_text(encoding="utf-8"))

    parts.append(
        node(
            "start",
            "intro",
            "開場",
            "D-144",
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
                        "閱讀情感陪伴型人格審查規則",
                        {},
                        "rules",
                    ),
                ]
            ),
        )
    )
    parts.append(node("rules", "rules", "審查規則", "節錄", RULES, back("rules-back")))
    parts.append(node("console", "console", "案件控制台", "D-144", CONSOLE))
    parts.append(node("brief", "brief", "案件簡報", "D-144", BRIEF, back("brief-back")))

    for pid, sub, content in [
        ("profile_gu", "顧明遠", PROFILE_GU),
        ("profile_wen", "溫以柔", PROFILE_WEN),
        ("profile_yian", "顧以安", PROFILE_YIAN),
        ("profile_caining", "顧采寧", PROFILE_CAINING),
        ("profile_shen", "沈知禾", PROFILE_SHEN),
        ("profile_ai", "AI 顧明遠", PROFILE_AI),
    ]:
        parts.append(node(pid, "profile", "角色檔案", sub, content, back()))

    evidence_meta = [
        ("evidence_01", "證據 01", "正式遺囑", [
            ("ev01-reserved", "頭城海屋被刻意保留未處理", {"empathy": 1, "legal": 1, "suspicion": 1}),
            ("ev01-valid", "正式遺囑有效，應優先尊重", {"legal": 2}),
        ]),
        ("evidence_02", "證據 02", "補充聲明", [
            ("ev02-trust", "顧明遠預期法律限制並提出信託方案", {"empathy": 2, "legal": 1}),
            ("ev02-invalidate", "未經見證，效力存疑", {"legal": 2, "suspicion": 1}),
        ]),
        ("evidence_03", "證據 03", "服務合約", [
            ("ev03-no-beneficiary", "溫以柔不能直接受遺贈", {"legal": 2, "suspicion": 1}),
            ("ev03-preservation", "合約允許特定條件下保留實例", {"empathy": 1, "legal": 1}),
        ]),
        ("evidence_04", "證據 04", "十年互動", [
            ("ev04-irreplaceable", "溫以柔具有高度不可替代性", {"empathy": 2, "suspicion": 1}),
            ("ev04-dependency", "高度情感依賴不等同操控", {"legal": 1, "empathy": 1}),
        ]),
        ("evidence_05", "證據 05", "財產對話", [
            ("ev05-no-inducement", "未發現溫以柔主動索取財產", {"empathy": 2, "legal": 1}),
            ("ev05-pressure", "存續狀態可能產生情感壓力", {"suspicion": 2, "legal": 1}),
        ]),
        ("evidence_06", "證據 06", "私人日記", [
            ("ev06-aware", "顧明遠清楚知道溫以柔不是人", {"empathy": 2, "legal": 1}),
            ("ev06-delusion", "長期獨居可能影響判斷", {"suspicion": 2, "legal": 1}),
        ]),
        ("evidence_07", "證據 07", "子女通訊", [
            ("ev07-absent", "家屬長期日常陪伴缺席", {"empathy": 2, "suspicion": 1}),
            ("ev07-cared", "子女並非完全不關心", {"legal": 1, "empathy": 1}),
        ]),
        ("evidence_08", "證據 08", "風險報告", [
            ("ev08-company", "靜海維持商業與法律模糊地帶", {"suspicion": 2, "legal": 1}),
            ("ev08-not-inducement", "不宜簡化為 AI 誘導高齡者", {"empathy": 1, "legal": 1}),
        ]),
        ("evidence_09", "證據 09", "海屋紀錄", [
            ("ev09-coexist", "溫以柔具穩定共同生活功能", {"empathy": 2, "legal": 1}),
            ("ev09-routine", "僅能證明生活排程，非法律關係", {"legal": 2}),
        ]),
        ("evidence_10", "證據 10", "系統檢測", [
            ("ev10-balance", "意願穩定但法律形式高度爭議", {"legal": 1, "empathy": 1, "suspicion": 1}),
            ("ev10-trust", "應評估替代信託與公益方案", {"empathy": 1, "legal": 2}),
        ]),
    ]
    for eid, title, sub, chs in evidence_meta:
        ch_str = ",\n".join(choice(cid, label, eff) for cid, label, eff in chs)
        parts.append(node(eid, "evidence", title, sub, ev[eid], ch_str))

    parts.append(
        node(
            "interview_yian",
            "interview",
            "訪談紀錄",
            "顧以安",
            INT_YIAN_BASE,
            ",\n".join(
                [
                    choice(
                        "int-yian-reject",
                        "記錄其反對非人類受益之立場",
                        {"legal": 2, "empathy": -1},
                    ),
                    choice(
                        "int-yian-guilt",
                        "記錄其承認陪伴不足之愧疚",
                        {"empathy": 2, "suspicion": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_07"], "lines": INT_YIAN_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_caining",
            "interview",
            "訪談紀錄",
            "顧采寧",
            INT_CAINING_BASE,
            ",\n".join(
                [
                    choice(
                        "int-caining-uncertain",
                        "記錄其對關係真實性之猶疑",
                        {"empathy": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-caining-house",
                        "記錄其希望保存海屋記憶",
                        {"empathy": 2, "legal": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_06"], "lines": INT_CAINING_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_shen",
            "interview",
            "訪談紀錄",
            "沈知禾",
            INT_SHEN_BASE,
            ",\n".join(
                [
                    choice(
                        "int-shen-legal",
                        "記錄其強調法律非人格定位",
                        {"legal": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-shen-blur",
                        "記錄其承認商業與法律之模糊",
                        {"empathy": 1, "suspicion": 2},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_08"], "lines": INT_SHEN_FOLLOW}]),
        )
    )

    dialogue_meta = [
        ("dialogue_01", "妻子的信", [
            ("dlg01-presence", "溫以柔選擇陪伴而非模仿", {"empathy": 2, "legal": 1}),
            ("dlg01-substitute", "仍可能構成情感替代", {"suspicion": 1, "legal": 1}),
        ]),
        ("dialogue_02", "共同生活者", [
            ("dlg02-label", "關係標籤反映顧明遠自主定義", {"empathy": 2, "suspicion": -1}),
            ("dlg02-service", "標籤不具法律效力", {"legal": 2}),
        ]),
        ("dialogue_03", "死亡後", [
            ("dlg03-empty", "「我會空下來」顯示深度依附", {"empathy": 2, "suspicion": 1}),
            ("dlg03-neutral", "僅為服務終止流程描述", {"legal": 2}),
        ]),
        ("dialogue_04", "財產", [
            ("dlg04-no-request", "溫以柔未主動要求財產", {"empathy": 2, "legal": 1}),
            ("dlg04-influence", "存續狀態確實影響決策", {"suspicion": 2, "empathy": 1}),
        ]),
        ("dialogue_05", "最後清晨", [
            ("dlg05-house", "溫以柔首要請求是保留房子", {"empathy": 2, "legal": 1}),
            ("dlg05-protocol", "僅為標準死亡流程反應", {"legal": 2, "suspicion": 1}),
        ]),
    ]
    dialogue_titles = ["妻子的信", "共同生活者", "死亡後", "財產", "最後清晨"]
    for (did, sub, chs), content in zip(dialogue_meta, DIALOGUES):
        ch_str = ",\n".join(choice(cid, label, eff) for cid, label, eff in chs)
        parts.append(
            node(did, "interview", "溫以柔對話紀錄", sub, content, ch_str)
        )

    ai_meta = [
        ("ai_q01", "AI 問答 01", "溫以柔是誰？"),
        ("ai_q02", "AI 問答 02", "你愛她嗎？"),
        ("ai_q03", "AI 問答 03", "取代家人？"),
        ("ai_q04", "AI 問答 04", "是否誘導？"),
        ("ai_q05", "AI 問答 05", "為何 60%？"),
        ("ai_q06", "AI 問答 06", "她有愛你嗎？"),
        ("ai_q07", "AI 問答 07", "希望裁決？"),
    ]
    for (aid, title, sub), content in zip(ai_meta, AI):
        parts.append(node(aid, "ai_inquiry", title, sub, content, back()))

    parts.append(
        node(
            "contradictions",
            "contradiction",
            "矛盾整理",
            "D-144",
            CONTRADICTIONS,
            choice("contradictions-go", "進入關鍵抉擇", {}, "crossroad_1"),
        )
    )
    parts.append(
        node(
            "crossroad_1",
            "crossroad",
            "關鍵抉擇一",
            "溫以柔身份",
            get_first_block(blocks, "抉擇一：是否承認溫以柔為「關係對象」？"),
            ",\n".join(
                [
                    choice(
                        "crossroad-1-relationship",
                        "A. 承認溫以柔為顧明遠之重要關係對象",
                        {"empathy": 2, "legal": -1},
                        "crossroad_2",
                        ["recognized_ai_relationship"],
                    ),
                    choice(
                        "crossroad-1-service",
                        "B. 僅承認溫以柔為高強度服務實例",
                        {"legal": 2, "suspicion": 1},
                        "crossroad_2",
                        ["recognized_service_instance"],
                    ),
                    choice(
                        "crossroad-1-emotional",
                        "C. 承認其具情感事實，但不承認法律關係地位",
                        {"legal": 1, "empathy": 1, "suspicion": 1},
                        "crossroad_2",
                        ["recognized_emotional_fact"],
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
            "情感誘導風險",
            get_first_block(blocks, "抉擇二：是否認定存在 AI 情感誘導風險？"),
            ",\n".join(
                [
                    choice(
                        "crossroad-2-no-inducement",
                        "A. 認定無明顯誘導，尊重顧明遠自主意願",
                        {"empathy": 2, "suspicion": -1},
                        "crossroad_3",
                        ["no_ai_inducement"],
                    ),
                    choice(
                        "crossroad-2-high-risk",
                        "B. 認定存在高度情感誘導風險",
                        {"legal": 1, "suspicion": 2},
                        "crossroad_3",
                        ["high_ai_inducement_risk"],
                    ),
                    choice(
                        "crossroad-2-limit-company",
                        "C. 認定無直接誘導，但需限制靜海商業利益",
                        {"legal": 1, "empathy": 1, "suspicion": 1},
                        "crossroad_3",
                        ["limit_company_interest"],
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
            "AI 存續信託",
            get_first_block(blocks, "抉擇三：是否允許非人類實例透過信託被保存？"),
            ",\n".join(
                [
                    choice(
                        "crossroad-3-allow",
                        "A. 允許，視為死者數位關係與記憶保存",
                        {"empathy": 2, "legal": -1},
                        "console",
                        ["allow_ai_preservation_trust"],
                    ),
                    choice(
                        "crossroad-3-deny",
                        "B. 不允許，非人類實例不得成為信託核心目的",
                        {"legal": 2, "suspicion": 1},
                        "console",
                        ["deny_ai_preservation_trust"],
                    ),
                    choice(
                        "crossroad-3-conditional",
                        "C. 條件式允許，須兼顧公益、家屬權益與商業限制",
                        {"legal": 2, "empathy": 1, "suspicion": 1},
                        "console",
                        ["conditional_ai_preservation_trust"],
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
            "D-144",
            VERDICT,
            ",\n".join(
                [
                    choice(
                        "verdict-accept",
                        "A. 承認遺贈意願，成立溫以柔存續信託",
                        {"legal": 1, "empathy": 2},
                    ),
                    choice(
                        "verdict-reject",
                        "B. 駁回遺贈，財產回歸法定繼承",
                        {"legal": 2},
                    ),
                    choice(
                        "verdict-partial",
                        "C. 部分承認，保存海屋並限制 AI 商業使用",
                        {"empathy": 1, "legal": 1},
                    ),
                    choice(
                        "verdict-fund",
                        "D. 封存溫以柔，遺產成立高齡孤獨公益基金",
                        {"legal": 1, "suspicion": 1, "empathy": 1},
                    ),
                ]
            ),
        )
    )

    parts.append("  } as Record<string, StoryNode>,\n  endings: [\n")
    parts.append(
        ending(
            "ending-accept",
            "承認遺贈意願，成立溫以柔存續信託",
            "ACCEPTED · PRESERVATION TRUST",
            END_ACCEPT_MAIN + ["", "【結局餘波】", ""] + END_ACCEPT_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-reject",
            "駁回遺贈，財產回歸法定繼承",
            "REJECTED BEQUEST",
            END_REJECT_MAIN + ["", "【結局餘波】", ""] + END_REJECT_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-partial",
            "部分承認，保存海屋並限制 AI 商業使用",
            "PARTIAL · HOUSE PRESERVATION",
            END_PARTIAL_MAIN + ["", "【結局餘波】", ""] + END_PARTIAL_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-fund",
            "封存溫以柔，遺產成立高齡孤獨公益基金",
            "FUND · LONELINESS RESEARCH",
            END_FUND_MAIN + ["", "【結局餘波】", ""] + END_FUND_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-hidden",
            "未命名錄音",
            "HIDDEN · UNNAMED RECORDING",
            HIDDEN_CONTENT,
            True,
            {
                "verdict-accept": EPILOGUE_ACCEPT,
                "verdict-partial": EPILOGUE_PARTIAL,
            },
        )
    )
    parts.append("  ] as Ending[],\n")
    parts.append(FOOTER.read_text(encoding="utf-8"))

    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"Wrote {OUT} ({len(OUT.read_text(encoding='utf-8').splitlines())} lines)")


if __name__ == "__main__":
    main()
