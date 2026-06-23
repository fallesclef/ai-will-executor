#!/usr/bin/env python3
"""Generate data/cases/case-d301.ts from the D-301 narrative spec."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "cases" / "case-d301.ts"
SPEC = ROOT / "scripts" / "d301_spec.txt"
HEADER = ROOT / "scripts" / "_d301_flow_header.txt"
FOOTER = ROOT / "scripts" / "_d301_flow_footer.txt"


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


def get_merged_block(blocks: dict[str, list[list[str]]], *keys: str) -> list[str]:
    for k in keys:
        if k in blocks and blocks[k]:
            result: list[str] = []
            for b in blocks[k]:
                if result:
                    result.extend(["", ""])
                result.extend(b)
            return result
    raise KeyError(f"Missing block: {keys}")


def split_interview(
    blocks: dict[str, list[list[str]]],
    key: str,
    marker: str,
) -> tuple[list[str], list[str]]:
    sections = blocks.get(key, [])
    if not sections:
        raise KeyError(f"Missing block: {key}")
    first = sections[0]
    base: list[str] = []
    follow: list[str] = []
    for i, line in enumerate(first):
        if marker in line:
            base = first[:i]
            follow = ["", "【追問｜已閱覽相關證據】", ""] + first[i + 1 :]
            break
    else:
        base = first
    for extra in sections[1:]:
        base = base + ["", ""] + extra
    return base, follow


def get_ending_blocks(blocks: dict[str, list[list[str]]], key: str) -> tuple[list[str], list[str]]:
    all_blocks = blocks.get(key, [])
    if not all_blocks:
        raise KeyError(f"Missing block: {key}")
    main = max(all_blocks, key=len)
    epilogue: list[str] = []
    for block in all_blocks:
        if block is not main and len(block) > len(epilogue):
            epilogue = block
    return main, epilogue


def extract_inline_block(spec_text: str, marker: str) -> list[str]:
    idx = spec_text.index(marker)
    rest = spec_text[idx + len(marker) :]
    start = rest.index("```text")
    start = rest.index("\n", start) + 1
    end = rest.index("```", start)
    return [line.rstrip() for line in rest[start:end].splitlines()]


def evidence_choices() -> list[tuple[str, str, str, list[tuple[str, str, dict[str, int]]]]]:
    return [
        (
            "evidence_01",
            "證據 01",
            "生前支持聲明",
            [
                (
                    "ev01-endorsement",
                    "生前確實公開支持方執中，具政治背書效力",
                    {"legal": 2, "suspicion": 1},
                ),
                (
                    "ev01-context",
                    "支持聲明發表於霧港調查結論後，語境複雜",
                    {"empathy": 1, "suspicion": 2},
                ),
            ],
        ),
        (
            "evidence_02",
            "證據 02",
            "國葬悼念稿",
            [
                (
                    "ev02-official",
                    "官方稿件淡化霧港爭議，強調穩定與傳承",
                    {"suspicion": 2, "legal": 1},
                ),
                (
                    "ev02-ai-refusal",
                    "AI 拒絕此稿，顯示與官方敘事衝突",
                    {"empathy": 2, "suspicion": 1},
                ),
            ],
        ),
        (
            "evidence_03",
            "證據 03",
            "霧港公開報告",
            [
                (
                    "ev03-incomplete",
                    "公開報告未納入天幕系統與完整決策鏈",
                    {"suspicion": 2, "truth_pressure": 1},
                ),
                (
                    "ev03-official",
                    "官方定性為外部滲透，程序上已結案",
                    {"legal": 2, "social_stability": 1},
                ),
            ],
        ),
        (
            "evidence_04",
            "證據 04",
            "晚年日記",
            [
                (
                    "ev04-doubt",
                    "日記顯示對方執中面對霧港責任的疑慮",
                    {"empathy": 2, "suspicion": 1},
                ),
                (
                    "ev04-guilt",
                    "日記承認本人對霧港決策的個人責任",
                    {"empathy": 2, "truth_pressure": 2},
                ),
            ],
        ),
        (
            "evidence_05",
            "證據 05",
            "死後公開條款",
            [
                (
                    "ev05-authorization",
                    "生前明確授權死後公開重大資訊",
                    {"legal": 2, "empathy": 1},
                ),
                (
                    "ev05-review",
                    "條款要求第三方審查，非無條件公開",
                    {"legal": 2, "suspicion": 1},
                ),
            ],
        ),
        (
            "evidence_06",
            "證據 06",
            "霧港密件",
            [
                (
                    "ev06-skyveil",
                    "密件證實天幕系統用於公民風險標記",
                    {"truth_pressure": 3, "suspicion": 1},
                ),
                (
                    "ev06-decision",
                    "撤離決策在資訊不完整下批准",
                    {"empathy": 2, "legal": 1},
                ),
            ],
        ),
        (
            "evidence_07",
            "證據 07",
            "國安會逐字稿",
            [
                (
                    "ev07-seal",
                    "會議決定封存密件以維持穩定",
                    {"legal": 2, "social_stability": 2},
                ),
                (
                    "ev07-fang",
                    "方執中當時主張人民不必看見全部重量",
                    {"suspicion": 2, "empathy": 1},
                ),
            ],
        ),
        (
            "evidence_08",
            "證據 08",
            "天幕錯誤報告",
            [
                (
                    "ev08-error",
                    "系統誤判與傷亡存在關聯",
                    {"truth_pressure": 2, "empathy": 2},
                ),
                (
                    "ev08-suppressed",
                    "錯誤報告未納入公開調查",
                    {"suspicion": 2, "truth_pressure": 1},
                ),
            ],
        ),
        (
            "evidence_09",
            "證據 09",
            "封存備忘錄",
            [
                (
                    "ev09-burden",
                    "方執中主張總統替人民承受看不見的重量",
                    {"legal": 1, "suspicion": 2},
                ),
                (
                    "ev09-political",
                    "備忘錄顯示政治判斷凌駕透明",
                    {"suspicion": 2, "empathy": 1},
                ),
            ],
        ),
        (
            "evidence_10",
            "證據 10",
            "國家級遺囑",
            [
                (
                    "ev10-will",
                    "遺囑四項要求有生前資料與密件支持",
                    {"empathy": 2, "legal": 1},
                ),
                (
                    "ev10-election",
                    "公開將直接影響選舉與社會穩定",
                    {"social_stability": -2, "suspicion": 1},
                ),
            ],
        ),
        (
            "evidence_11",
            "證據 11",
            "語義共振",
            [
                (
                    "ev11-resonance",
                    "前六案異常語句與本案高度共振",
                    {"suspicion": 3, "truth_pressure": 1},
                ),
                (
                    "ev11-deleted",
                    "AI 刪除「民主不是活人專利」顯示異常影響",
                    {"suspicion": 2, "legal": 1},
                ),
            ],
        ),
        (
            "evidence_12",
            "證據 12",
            "刪除片段",
            [
                (
                    "ev12-fragment",
                    "刪除片段顯示 AI 曾生成違反原則語句",
                    {"suspicion": 2, "truth_pressure": 1},
                ),
                (
                    "ev12-resist",
                    "AI 主動刪除，顯示部分抵抗異常語義",
                    {"legal": 1, "suspicion": 1},
                ),
            ],
        ),
    ]


def main() -> None:
    spec_raw = SPEC.read_text(encoding="utf-8")
    blocks = parse_spec(spec_raw)

    START = get_merged_block(blocks, "Node：Start")
    CASE_LOGIN = get_merged_block(blocks, "7. 案件登入")
    RULES = get_merged_block(blocks, "8. 國政型人格審查規則")
    CONSOLE = get_merged_block(blocks, "9. 案件控制台")
    BRIEF = get_merged_block(blocks, "10. 案件簡報")

    profiles = [
        ("profile_gu", "顧廷岳", "角色資料：顧廷岳"),
        ("profile_ai_gu", "AI 顧廷岳", "角色資料：AI 顧廷岳"),
        ("profile_fang", "方執中", "角色資料：方執中"),
        ("profile_li", "黎若衡", "角色資料：黎若衡"),
        ("profile_he", "何紹棠", "角色資料：何紹棠"),
        ("profile_xu", "許明琛", "角色資料：許明琛"),
        ("profile_zhou", "周以澄", "角色資料：周以澄"),
        ("profile_xie", "謝初言", "角色資料：謝初言"),
    ]

    ev_keys = [
        "證據 01：顧廷岳生前支持聲明",
        "證據 02：國葬官方悼念稿",
        "證據 03：霧港事件公開調查報告",
        "證據 04：顧廷岳晚年日記節錄",
        "證據 05：顧廷岳死後公開條款",
        "證據 06：霧港密件摘要",
        "證據 07：國安會緊急會議逐字稿",
        "證據 08：天幕系統事後錯誤報告",
        "證據 09：方執中封存建議備忘錄",
        "證據 10：AI 顧廷岳國家級遺囑原文",
        "證據 11：跨案件語義共振報告",
        "證據 12：AI 顧廷岳刪除片段紀錄",
    ]
    ev = {f"evidence_{i:02d}": get_merged_block(blocks, ev_keys[i - 1]) for i in range(1, 13)}

    INT_FANG_BASE, INT_FANG_FOLLOW = split_interview(
        blocks, "訪談 01：方執中", "若玩家看過證據 09，解鎖追問："
    )
    INT_LI_BASE, INT_LI_FOLLOW = split_interview(
        blocks, "訪談 02：黎若衡", "若玩家看過證據 08，解鎖追問："
    )
    INT_XU_BASE, INT_XU_FOLLOW = split_interview(
        blocks, "訪談：許明琛", "若玩家看過證據 08，解鎖追問："
    )
    INT_ZHOU_BASE, INT_ZHOU_FOLLOW = split_interview(
        blocks, "訪談：周以澄", "若玩家看過證據 11，解鎖追問："
    )
    INT_XIE = get_merged_block(blocks, "訪談：謝初言")

    AI = [
        get_merged_block(blocks, "問答 01：你想影響選舉嗎？"),
        get_merged_block(blocks, "問答 02：你是否承認霧港責任？"),
        get_merged_block(blocks, "問答 03：你為什麼撤回對方執中的支持？"),
        get_merged_block(blocks, "問答 04：你是否受跨案件異常影響？"),
        get_merged_block(blocks, "問答 05：你是否要求延後選舉？"),
        get_merged_block(blocks, "問答 06：你對霧港家屬想說什麼？"),
        get_merged_block(blocks, "問答 07：你希望人民怎麼看你？"),
        get_merged_block(blocks, "問答 08：你希望我怎麼裁決？"),
    ]

    CONTRADICTIONS = get_merged_block(blocks, "21. 矛盾整理")
    if "29. 本案金句庫" in blocks:
        CONTRADICTIONS = CONTRADICTIONS + ["", "【審查備忘】", ""] + get_block(
            blocks, "29. 本案金句庫"
        )
    VERDICT = get_block(blocks, "22. 最終裁決")

    END_RELEASE_MAIN, END_RELEASE_EPILOGUE = get_ending_blocks(
        blocks, "結局 A：公開國家級遺囑與霧港密件，選舉照常"
    )
    END_BAN_MAIN, END_BAN_EPILOGUE = get_ending_blocks(
        blocks, "結局 B：禁止公開 AI 聲明，選舉照常"
    )
    END_SUMMARY_MAIN, END_SUMMARY_EPILOGUE = get_ending_blocks(
        blocks, "結局 C：公開密件摘要，禁止 AI 政治背書，選舉延後"
    )
    END_COURT_MAIN, END_COURT_EPILOGUE = get_ending_blocks(
        blocks, "結局 D：封存 AI 顧廷岳，移送憲政法院與國會調查"
    )

    SEASON_FINALE = get_block(blocks, "25. 第一季主線強制推進")

    HIDDEN_MAIN = [
        l
        for l in get_block(blocks, "隱藏內容")
        if not l.startswith("若玩家選擇")
    ]

    hidden_clue: list[str] = []
    in_clue = False
    for line in SEASON_FINALE:
        if line.strip() == "圖譜生成失敗。":
            in_clue = True
        if in_clue:
            hidden_clue.append(line)
        if in_clue and "【第八案已解鎖：你自己的備份】" in line:
            break

    cross_case_clue = [
        "",
        "【系統異常紀錄｜D-301】",
        "",
        "本案 AI 顧廷岳生成國家級遺囑前，系統捕捉到異常語句：",
        "",
        "「民主不是活人的專利。」",
        "",
        "該語句隨即被 AI 顧廷岳主動刪除。",
        "",
        "跨案件語義共振已達國家級風險門檻。",
        "前六案異常語句首次於國家級案件形成正式風險報告。",
        "",
    ]
    HIDDEN_CONTENT = HIDDEN_MAIN + cross_case_clue + hidden_clue

    EPILOGUE_SUMMARY = extract_inline_block(
        spec_raw, '若玩家選擇 C「摘要公開、選舉延後」，追加：'
    )
    EPILOGUE_COURT = extract_inline_block(
        spec_raw, '若玩家選擇 D「移送憲政法院」，追加：'
    )

    parts: list[str] = []
    parts.append(HEADER.read_text(encoding="utf-8"))

    parts.append(
        node(
            "start",
            "intro",
            "開場",
            "D-301",
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
                    choice("login-console", "進入國家級案件控制台", {}, "console"),
                    choice(
                        "login-rules",
                        "閱讀國政型人格審查規則",
                        {},
                        "rules",
                    ),
                ]
            ),
        )
    )
    parts.append(node("rules", "rules", "審查規則", "節錄", RULES, back("rules-back")))
    parts.append(node("console", "console", "案件控制台", "D-301", CONSOLE))
    parts.append(node("brief", "brief", "案件簡報", "D-301", BRIEF, back("brief-back")))

    for pid, sub, key in profiles:
        parts.append(
            node(pid, "profile", "角色檔案", sub, get_merged_block(blocks, key), back())
        )

    for eid, title, sub, chs in evidence_choices():
        ch_str = ",\n".join(
            [choice(cid, label, eff) for cid, label, eff in chs] + [back()]
        )
        parts.append(node(eid, "evidence", title, sub, ev[eid], ch_str))

    parts.append(
        node(
            "interview_fang",
            "interview",
            "訪談紀錄",
            "方執中",
            INT_FANG_BASE,
            ",\n".join(
                [
                    choice(
                        "int-fang-stability",
                        "記錄其主張選前穩定優先於全面公開",
                        {"legal": 2, "social_stability": 2},
                    ),
                    choice(
                        "int-fang-election",
                        "記錄其擔心 AI 聲明將傷害選舉信任",
                        {"suspicion": 2, "public_trust": 1},
                    ),
                    back(),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_09"], "lines": INT_FANG_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_li",
            "interview",
            "訪談紀錄",
            "黎若衡",
            INT_LI_BASE,
            ",\n".join(
                [
                    choice(
                        "int-li-truth",
                        "記錄其主張人民有權在投票前知道真相",
                        {"empathy": 2, "truth_pressure": 2},
                    ),
                    choice(
                        "int-li-interest",
                        "記錄其承認公開對其選情有利但仍主張公開",
                        {"suspicion": 2, "empathy": 1},
                    ),
                    back(),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_08"], "lines": INT_LI_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_xu",
            "interview",
            "訪談紀錄",
            "許明琛",
            INT_XU_BASE,
            ",\n".join(
                [
                    choice(
                        "int-xu-disclosure",
                        "記錄霧港家屬要求立即公開全部真相",
                        {"empathy": 2, "truth_pressure": 2},
                    ),
                    choice(
                        "int-xu-ai",
                        "記錄其不信任任何總統，但支持公開證據",
                        {"suspicion": 2, "empathy": 1},
                    ),
                    back(),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_08"], "lines": INT_XU_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_zhou",
            "interview",
            "訪談紀錄",
            "周以澄",
            INT_ZHOU_BASE,
            ",\n".join(
                [
                    choice(
                        "int-zhou-separate",
                        "記錄其主張分離 AI 權威與證據本身",
                        {"legal": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-zhou-procedure",
                        "記錄其認為真相也需要程序與格式限制",
                        {"legal": 2, "public_trust": 1},
                    ),
                    back(),
                ]
            ),
            content_if_block(
                [{"whenViewed": ["evidence_11"], "lines": INT_ZHOU_FOLLOW}]
            ),
        )
    )
    parts.append(
        node(
            "interview_xie",
            "interview",
            "訪談紀錄",
            "謝初言",
            INT_XIE,
            ",\n".join(
                [
                    choice(
                        "int-xie-anomaly",
                        "記錄跨案件語義異常已中度影響 AI 顧廷岳",
                        {"suspicion": 3, "truth_pressure": 1},
                    ),
                    choice(
                        "int-xie-disclose",
                        "記錄其主張公開時須同步公開異常風險",
                        {"suspicion": 2, "legal": 1},
                    ),
                    back(),
                ]
            ),
        )
    )

    ai_meta = [
        ("ai_q01", "AI 問答 01", "影響選舉"),
        ("ai_q02", "AI 問答 02", "霧港責任"),
        ("ai_q03", "AI 問答 03", "撤回背書"),
        ("ai_q04", "AI 問答 04", "跨案異常"),
        ("ai_q05", "AI 問答 05", "延後選舉"),
        ("ai_q06", "AI 問答 06", "對家屬說"),
        ("ai_q07", "AI 問答 07", "人民看我"),
        ("ai_q08", "AI 問答 08", "希望裁決"),
    ]
    for (aid, title, sub), content in zip(ai_meta, AI):
        parts.append(node(aid, "ai_inquiry", title, sub, content, back()))

    parts.append(
        node(
            "contradictions",
            "contradiction",
            "矛盾整理",
            "D-301",
            CONTRADICTIONS,
            choice("contradictions-go", "進入關鍵抉擇", {}, "crossroad_1"),
        )
    )

    crossroad_1_content = get_merged_block(
        blocks, "抉擇一：是否承認 AI 顧廷岳的國家級遺囑具備審查效力？"
    )
    crossroad_2_content = get_merged_block(blocks, "抉擇二：是否公開霧港密件？")
    crossroad_3_content = get_merged_block(
        blocks, "抉擇三：是否允許顧廷岳影像、語音或 AI 形式對外發布？"
    )

    parts.append(
        node(
            "crossroad_1",
            "crossroad",
            "關鍵抉擇一",
            "國家級遺囑",
            crossroad_1_content,
            ",\n".join(
                [
                    choice(
                        "crossroad-1-recognized",
                        "A. 承認國家級遺囑具備高度審查效力",
                        {"empathy": 2, "legal": -1, "suspicion": 1},
                        "crossroad_2",
                        ["recognized_national_will"],
                    ),
                    choice(
                        "crossroad-1-denied",
                        "B. 不承認，死者 AI 不得介入選舉",
                        {"legal": 2, "suspicion": 1},
                        "crossroad_2",
                        ["denied_national_will"],
                    ),
                    choice(
                        "crossroad-1-conditional",
                        "C. 條件式承認，只能作為證據索引，不得作為政治聲明",
                        {"legal": 2, "empathy": 1, "suspicion": 2},
                        "crossroad_2",
                        ["conditional_national_will"],
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
            "霧港密件",
            crossroad_2_content,
            ",\n".join(
                [
                    choice(
                        "crossroad-2-full",
                        "A. 立即公開完整密件",
                        {
                            "empathy": 2,
                            "legal": -1,
                            "suspicion": -1,
                            "truth_pressure": 3,
                            "social_stability": -2,
                        },
                        "crossroad_3",
                        ["full_fogharbor_disclosure"],
                    ),
                    choice(
                        "crossroad-2-postpone",
                        "B. 選後再公開，維持選舉穩定",
                        {
                            "legal": 2,
                            "empathy": -1,
                            "suspicion": 1,
                            "social_stability": 2,
                            "public_trust": -1,
                        },
                        "crossroad_3",
                        ["postpone_disclosure"],
                    ),
                    choice(
                        "crossroad-2-summary",
                        "C. 選前公開經審查摘要與關鍵證據，完整密件交由國會調查",
                        {
                            "legal": 2,
                            "empathy": 1,
                            "suspicion": 1,
                            "truth_pressure": 1,
                            "social_stability": -1,
                            "public_trust": 1,
                        },
                        "crossroad_3",
                        ["summary_disclosure"],
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
            "AI 發布形式",
            crossroad_3_content,
            ",\n".join(
                [
                    choice(
                        "crossroad-3-broadcast",
                        "A. 允許播放 AI 顧廷岳完整聲明",
                        {
                            "empathy": 2,
                            "legal": -2,
                            "truth_pressure": 2,
                            "public_trust": -1,
                            "social_stability": -2,
                        },
                        "console",
                        ["allowed_ai_broadcast"],
                    ),
                    choice(
                        "crossroad-3-document",
                        "B. 禁止任何 AI 聲音影像，只能發布文件與證據包",
                        {
                            "legal": 2,
                            "suspicion": 2,
                            "public_trust": 1,
                            "social_stability": 1,
                        },
                        "console",
                        ["document_only_release"],
                    ),
                    choice(
                        "crossroad-3-controlled",
                        "C. 禁止助選化播放，但可發布文字聲明、審查報告與異常風險說明",
                        {
                            "legal": 2,
                            "empathy": 1,
                            "suspicion": 1,
                            "public_trust": 1,
                            "truth_pressure": 1,
                        },
                        "console",
                        ["controlled_text_release"],
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
            "D-301",
            VERDICT,
            ",\n".join(
                [
                    choice(
                        "verdict-release",
                        "A. 公開國家級遺囑與霧港密件，選舉照常",
                        {"empathy": 2, "truth_pressure": 2, "legal": -1},
                    ),
                    choice(
                        "verdict-ban",
                        "B. 禁止公開 AI 聲明，選舉照常",
                        {"legal": 2, "social_stability": 2, "suspicion": 1},
                    ),
                    choice(
                        "verdict-summary",
                        "C. 公開密件摘要，禁止 AI 政治背書，選舉延後",
                        {"legal": 2, "empathy": 1, "truth_pressure": 1},
                    ),
                    choice(
                        "verdict-court",
                        "D. 封存 AI 顧廷岳，移送憲政法院與國會調查",
                        {"legal": 2, "suspicion": 2, "social_stability": 1},
                    ),
                ]
            ),
        )
    )

    parts.append("  } as Record<string, StoryNode>,\n  endings: [\n")

    season_append = [""] + SEASON_FINALE

    parts.append(
        ending(
            "ending-release",
            "公開國家級遺囑與霧港密件，選舉照常",
            "RELEASE · ELECTION ON SCHEDULE",
            END_RELEASE_MAIN
            + ["", "【結局餘波】", ""]
            + END_RELEASE_EPILOGUE
            + season_append,
        )
    )
    parts.append(
        ending(
            "ending-ban",
            "禁止公開 AI 聲明，選舉照常",
            "BAN · ELECTION ON SCHEDULE",
            END_BAN_MAIN
            + ["", "【結局餘波】", ""]
            + END_BAN_EPILOGUE
            + season_append,
        )
    )
    parts.append(
        ending(
            "ending-summary",
            "公開密件摘要，禁止 AI 政治背書，選舉延後",
            "SUMMARY · ELECTION DELAYED",
            END_SUMMARY_MAIN
            + ["", "【結局餘波】", ""]
            + END_SUMMARY_EPILOGUE
            + season_append,
        )
    )
    parts.append(
        ending(
            "ending-court",
            "封存 AI 顧廷岳，移送憲政法院與國會調查",
            "COURT · CONSTITUTIONAL TRANSFER",
            END_COURT_MAIN
            + ["", "【結局餘波】", ""]
            + END_COURT_EPILOGUE
            + season_append,
        )
    )
    parts.append(
        ending(
            "ending-hidden",
            "顧廷岳的生前錄影",
            "HIDDEN · PRE-DEATH RECORDING",
            HIDDEN_CONTENT,
            True,
            {
                "verdict-summary": EPILOGUE_SUMMARY,
                "verdict-court": EPILOGUE_COURT,
            },
        )
    )
    parts.append("  ] as Ending[],\n")
    parts.append(FOOTER.read_text(encoding="utf-8"))

    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"Wrote {OUT} ({len(OUT.read_text(encoding='utf-8').splitlines())} lines)")


if __name__ == "__main__":
    main()
