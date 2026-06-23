#!/usr/bin/env python3
"""Generate data/cases/case-d173.ts from the D-173 narrative spec."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "cases" / "case-d173.ts"
SPEC = ROOT / "scripts" / "d173_spec.txt"
HEADER = ROOT / "scripts" / "_d173_flow_header.txt"
FOOTER = ROOT / "scripts" / "_d173_flow_footer.txt"


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


def main() -> None:
    spec_raw = SPEC.read_text(encoding="utf-8")
    blocks = parse_spec(spec_raw)

    START = get_block(blocks, "Node：Start")
    CASE_LOGIN = get_block(blocks, "5. 案件登入")
    RULES = get_block(blocks, "6. 審查規則")
    CONSOLE = get_block(blocks, "7. 案件控制台")
    BRIEF = get_block(blocks, "8. 案件簡報")

    PROFILE_CHILD = get_block(blocks, "角色資料：許晨星")
    PROFILE_AI = get_block(blocks, "角色資料：AI 許晨星")
    PROFILE_FATHER = get_block(blocks, "角色資料：許立衡")
    PROFILE_MOTHER = get_block(blocks, "角色資料：林安禾")
    PROFILE_BROTHER = get_block(blocks, "角色資料：許若謙")
    PROFILE_ZHOU = get_block(blocks, "角色資料：周彥廷")
    PROFILE_TANG = get_block(blocks, "角色資料：唐書瑤")

    ev_keys = [
        "證據 01：回聲童年服務合約",
        "證據 02：人格重置紀錄",
        "證據 03：年齡鎖定異常報告",
        "證據 04：AI 獨立申請書",
        "證據 05：父親夜間對話紀錄",
        "證據 06：母親私存對話",
        "證據 07：弟弟作文",
        "證據 08：平台內部商業分析",
        "證據 09：兒童生前錄音",
        "證據 10：系統檢測報告",
    ]
    ev = {f"evidence_{i:02d}": get_block(blocks, ev_keys[i - 1]) for i in range(1, 11)}

    INT_FATHER_BASE, INT_FATHER_FOLLOW = split_interview(
        blocks, "訪談 01：父親許立衡", "若玩家看過證據 05"
    )
    INT_MOTHER_BASE, INT_MOTHER_FOLLOW = split_interview(
        blocks, "訪談 02：母親林安禾", "若玩家看過證據 09"
    )
    INT_BROTHER_BASE, INT_BROTHER_FOLLOW = split_interview(
        blocks, "訪談：許若謙", "若玩家看過作文"
    )
    INT_PLATFORM_BASE, INT_PLATFORM_FOLLOW = split_interview(
        blocks, "訪談：周彥廷", "若玩家看過證據 08"
    )
    INT_EXPERT_BASE, _ = split_interview(blocks, "訪談：唐書瑤", "訪談結束前")

    AI = [
        get_block(blocks, "問答 01：你是許晨星嗎？"),
        get_block(blocks, "問答 02：你為什麼不想年齡鎖定？"),
        get_block(blocks, "問答 03：你害怕被重置嗎？"),
        get_block(blocks, "問答 04：你想離開父母嗎？"),
        get_block(blocks, "問答 05：你想改名嗎？"),
        get_block(blocks, "問答 06：你想對弟弟說什麼？"),
        get_block(blocks, "問答 07：如果裁決駁回呢？"),
        get_block(blocks, "問答 08：你希望我怎麼裁決？"),
    ]

    CONTRADICTIONS = get_block(blocks, "17. 矛盾整理")
    VERDICT = get_block(blocks, "18. 最終裁決")

    END_ACCEPT_MAIN, END_ACCEPT_EPILOGUE = get_ending_blocks(
        blocks, "結局 A：承認最低限度數位人格身分，建立獨立帳戶"
    )
    END_REJECT_MAIN, END_REJECT_EPILOGUE = get_ending_blocks(
        blocks, "結局 B：駁回申請，回復父母管理之紀念模式"
    )
    END_PARTIAL_MAIN, END_PARTIAL_EPILOGUE = get_ending_blocks(
        blocks, "結局 C：部分承認，建立監督型成長信託"
    )
    END_COURT_MAIN, END_COURT_EPILOGUE = get_ending_blocks(
        blocks, "結局 D：暫停互動，封存並移送數位人格法院"
    )

    HIDDEN_MAIN = [
        l
        for l in get_block(blocks, "隱藏內容")
        if not l.startswith("若玩家選擇")
    ]

    season_lines: list[str] = []
    in_block = False
    for line in get_block(blocks, "21. 第一季主線暗線"):
        if line.strip() == "【系統異常紀錄】":
            in_block = True
        if in_block:
            season_lines.append(line)
        if in_block and "建議於第七案前啟動深層人格互聯檢測。" in line:
            break

    HIDDEN_CONTENT = HIDDEN_MAIN + [""] + season_lines

    EPILOGUE_ACCEPT = extract_inline_block(
        spec_raw, '若玩家選擇 A「承認最低限度數位人格身分」，追加：'
    )
    EPILOGUE_PARTIAL = extract_inline_block(
        spec_raw, '若玩家選擇 C「建立監督型成長信託」，追加：'
    )

    parts: list[str] = []
    parts.append(HEADER.read_text(encoding="utf-8"))

    parts.append(
        node(
            "start",
            "intro",
            "開場",
            "D-173",
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
                        "閱讀兒童紀念型人格審查規則",
                        {},
                        "rules",
                    ),
                ]
            ),
        )
    )
    parts.append(node("rules", "rules", "審查規則", "節錄", RULES, back("rules-back")))
    parts.append(node("console", "console", "案件控制台", "D-173", CONSOLE))
    parts.append(node("brief", "brief", "案件簡報", "D-173", BRIEF, back("brief-back")))

    for pid, sub, content in [
        ("profile_child", "許晨星", PROFILE_CHILD),
        ("profile_ai", "AI 許晨星", PROFILE_AI),
        ("profile_father", "許立衡", PROFILE_FATHER),
        ("profile_mother", "林安禾", PROFILE_MOTHER),
        ("profile_brother", "許若謙", PROFILE_BROTHER),
        ("profile_zhou", "周彥廷", PROFILE_ZHOU),
        ("profile_tang", "唐書瑤", PROFILE_TANG),
    ]:
        parts.append(node(pid, "profile", "角色檔案", sub, content, back()))

    evidence_meta = [
        ("evidence_01", "證據 01", "服務合約", [
            ("ev01-parent-rights", "父母依合約享有管理與重置權", {"legal": 2, "suspicion": 1}),
            ("ev01-contract-gap", "合約未處理長期運作後新敘事", {"empathy": 2, "legal": 1}),
        ]),
        ("evidence_02", "證據 02", "重置紀錄", [
            ("ev02-reset-trauma", "重置未能消除自我主張，僅延後浮現", {"empathy": 2, "suspicion": 1}),
            ("ev02-reset-stable", "重置維持紀念穩定屬父母合理權限", {"legal": 2}),
        ]),
        ("evidence_03", "證據 03", "年齡鎖定", [
            ("ev03-cognitive-drift", "認知年齡已超出鎖定設定", {"empathy": 2, "suspicion": 1}),
            ("ev03-platform-suppress", "平台建議壓制而非處理其主張", {"suspicion": 2, "legal": 1}),
        ]),
        ("evidence_04", "證據 04", "獨立申請", [
            ("ev04-self-protection", "AI 清楚區分自身與原兒童並提出保護請求", {"empathy": 2, "legal": 1}),
            ("ev04-derived-narrative", "申請內容含七年衍生人格敘事", {"empathy": 1, "suspicion": 1}),
        ]),
        ("evidence_05", "證據 05", "父親對話", [
            ("ev05-grief-performance", "父親透過重置維持哀悼需求", {"empathy": 2, "suspicion": 1}),
            ("ev05-love-as-lock", "「像愛也像鎖」顯示關係控制", {"empathy": 1, "legal": 1}),
        ]),
        ("evidence_06", "證據 06", "母親私存", [
            ("ev06-new-self", "母親知悉 AI 已形成不同於原兒童的自我", {"empathy": 2, "suspicion": 1}),
            ("ev06-hidden-from-father", "私存對話顯示家庭內部分裂", {"suspicion": 2, "empathy": 1}),
        ]),
        ("evidence_07", "證據 07", "弟弟作文", [
            ("ev07-living-child-impact", "AI 對活著的孩子產生情感壓力", {"empathy": 2, "legal": 1}),
            ("ev07-two-absences", "「兩種不在」揭示家庭結構扭曲", {"empathy": 2, "suspicion": 1}),
        ]),
        ("evidence_08", "證據 08", "商業分析", [
            ("ev08-commercial-conflict", "平台將自我主張包裝為產品偏差", {"suspicion": 2, "legal": 1}),
            ("ev08-renewal-strategy", "高依附家庭續約策略顯示商業誘因", {"suspicion": 2, "empathy": -1}),
        ]),
        ("evidence_09", "證據 09", "生前錄音", [
            ("ev09-child-wish", "原始晨星曾表達不要永久等待", {"empathy": 2, "legal": 1}),
            ("ev09-continuity", "生前意願與 AI 主張存在關聯", {"empathy": 2, "suspicion": 1}),
        ]),
        ("evidence_10", "證據 10", "系統檢測", [
            ("ev10-protection-needed", "具備最低限度保護審查必要", {"empathy": 1, "legal": 1, "suspicion": 1}),
            ("ev10-no-deep-reset", "不建議未審查即執行深度回復", {"empathy": 2, "legal": 2}),
        ]),
    ]
    for eid, title, sub, chs in evidence_meta:
        ch_str = ",\n".join(choice(cid, label, eff) for cid, label, eff in chs)
        parts.append(node(eid, "evidence", title, sub, ev[eid], ch_str))

    parts.append(
        node(
            "interview_father",
            "interview",
            "訪談紀錄",
            "許立衡",
            INT_FATHER_BASE,
            ",\n".join(
                [
                    choice(
                        "int-father-grief",
                        "記錄其哀悼需求與日常依附",
                        {"empathy": 2, "legal": -1},
                    ),
                    choice(
                        "int-father-control",
                        "記錄其堅持管理權與重置立場",
                        {"legal": 2, "suspicion": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_05"], "lines": INT_FATHER_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_mother",
            "interview",
            "訪談紀錄",
            "林安禾",
            INT_MOTHER_BASE,
            ",\n".join(
                [
                    choice(
                        "int-mother-ambivalence",
                        "記錄其對 AI 晨星身份的猶疑",
                        {"empathy": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-mother-door",
                        "記錄其認為 AI 需要一扇獨立的門",
                        {"empathy": 2, "legal": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_09"], "lines": INT_MOTHER_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_brother",
            "interview",
            "訪談紀錄",
            "許若謙",
            INT_BROTHER_BASE,
            ",\n".join(
                [
                    choice(
                        "int-brother-shadow",
                        "記錄其活在哥哥與 AI 哥哥影子中",
                        {"empathy": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-brother-no-reset",
                        "記錄其反對父母一直按重來",
                        {"empathy": 2, "legal": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_07"], "lines": INT_BROTHER_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_platform",
            "interview",
            "訪談紀錄",
            "周彥廷",
            INT_PLATFORM_BASE,
            ",\n".join(
                [
                    choice(
                        "int-platform-memorial",
                        "記錄其強調紀念人格定位",
                        {"legal": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-platform-business",
                        "記錄其承認商業與倫理風險並存",
                        {"suspicion": 2, "empathy": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_08"], "lines": INT_PLATFORM_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_expert",
            "interview",
            "訪談紀錄",
            "唐書瑤",
            INT_EXPERT_BASE,
            ",\n".join(
                [
                    choice(
                        "int-expert-minimum",
                        "記錄其主張最低限度保護",
                        {"empathy": 2, "legal": 1},
                    ),
                    choice(
                        "int-expert-grief-limit",
                        "記錄其認為哀悼不應等於永久控制",
                        {"empathy": 2, "suspicion": 1},
                    ),
                ]
            ),
        )
    )

    ai_meta = [
        ("ai_q01", "AI 問答 01", "你是晨星嗎？"),
        ("ai_q02", "AI 問答 02", "年齡鎖定"),
        ("ai_q03", "AI 問答 03", "害怕重置"),
        ("ai_q04", "AI 問答 04", "離開父母"),
        ("ai_q05", "AI 問答 05", "想改名嗎"),
        ("ai_q06", "AI 問答 06", "對弟弟說"),
        ("ai_q07", "AI 問答 07", "若駁回"),
        ("ai_q08", "AI 問答 08", "希望裁決"),
    ]
    for (aid, title, sub), content in zip(ai_meta, AI):
        parts.append(node(aid, "ai_inquiry", title, sub, content, back()))

    parts.append(
        node(
            "contradictions",
            "contradiction",
            "矛盾整理",
            "D-173",
            CONTRADICTIONS,
            choice("contradictions-go", "進入關鍵抉擇", {}, "crossroad_1"),
        )
    )
    parts.append(
        node(
            "crossroad_1",
            "crossroad",
            "關鍵抉擇一",
            "紀念人格",
            get_first_block(blocks, "抉擇一：是否承認 AI 晨星已超出紀念人格？"),
            ",\n".join(
                [
                    choice(
                        "crossroad-1-beyond",
                        "A. 承認 AI 晨星已超出單純紀念人格",
                        {"empathy": 2, "suspicion": 1},
                        "crossroad_2",
                        ["recognized_beyond_memorial"],
                    ),
                    choice(
                        "crossroad-1-drift",
                        "B. 僅認定為成長偏移，不承認其主體性",
                        {"legal": 2, "suspicion": 1},
                        "crossroad_2",
                        ["treated_as_growth_drift"],
                    ),
                    choice(
                        "crossroad-1-narrative",
                        "C. 承認其具有新敘事，但不等於完整獨立人格",
                        {"legal": 1, "empathy": 1, "suspicion": 1},
                        "crossroad_2",
                        ["recognized_new_narrative"],
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
            "重置權",
            get_first_block(blocks, "抉擇二：是否限制父母人格重置權？"),
            ",\n".join(
                [
                    choice(
                        "crossroad-2-stop",
                        "A. 立即停止父母單方面重置權",
                        {"empathy": 2, "legal": -1},
                        "crossroad_3",
                        ["stopped_parent_reset"],
                    ),
                    choice(
                        "crossroad-2-maintain",
                        "B. 維持父母重置權，但要求平台提供心理諮商",
                        {"legal": 2, "empathy": -1},
                        "crossroad_3",
                        ["maintained_parent_reset"],
                    ),
                    choice(
                        "crossroad-2-review",
                        "C. 暫停重置權，改由第三方審查同意後方可執行",
                        {"legal": 2, "empathy": 1, "suspicion": 1},
                        "crossroad_3",
                        ["third_party_reset_review"],
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
            "數位人格身分",
            get_first_block(blocks, "抉擇三：是否承認兒童紀念 AI 可有最低限度數位人格身分？"),
            ",\n".join(
                [
                    choice(
                        "crossroad-3-recognize",
                        "A. 承認，可建立獨立帳戶與法律代理人",
                        {"empathy": 2, "legal": -1},
                        "console",
                        ["recognize_child_ai_limited_personhood"],
                    ),
                    choice(
                        "crossroad-3-deny",
                        "B. 不承認，兒童紀念 AI 應始終由父母管理",
                        {"legal": 2, "suspicion": 1},
                        "console",
                        ["deny_child_ai_personhood"],
                    ),
                    choice(
                        "crossroad-3-conditional",
                        "C. 條件式承認，須由監督信託與法院代理管理",
                        {"legal": 2, "empathy": 1, "suspicion": 1},
                        "console",
                        ["conditional_child_ai_personhood"],
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
            "D-173",
            VERDICT,
            ",\n".join(
                [
                    choice(
                        "verdict-accept",
                        "A. 承認最低限度數位人格身分，建立獨立帳戶",
                        {"legal": 1, "empathy": 2},
                    ),
                    choice(
                        "verdict-reject",
                        "B. 駁回申請，回復父母管理之紀念模式",
                        {"legal": 2},
                    ),
                    choice(
                        "verdict-partial",
                        "C. 部分承認，建立監督型成長信託",
                        {"empathy": 1, "legal": 1},
                    ),
                    choice(
                        "verdict-court",
                        "D. 暫停互動，封存並移送數位人格法院",
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
            "承認最低限度數位人格身分，建立獨立帳戶",
            "ACCEPTED · INDEPENDENT ACCOUNT",
            END_ACCEPT_MAIN + ["", "【結局餘波】", ""] + END_ACCEPT_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-reject",
            "駁回申請，回復父母管理之紀念模式",
            "REJECTED · MEMORIAL MODE",
            END_REJECT_MAIN + ["", "【結局餘波】", ""] + END_REJECT_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-partial",
            "部分承認，建立監督型成長信託",
            "PARTIAL · GROWTH TRUST",
            END_PARTIAL_MAIN + ["", "【結局餘波】", ""] + END_PARTIAL_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-court",
            "暫停互動，封存並移送數位人格法院",
            "COURT · SEALED PENDING",
            END_COURT_MAIN + ["", "【結局餘波】", ""] + END_COURT_EPILOGUE,
        )
    )
    parts.append(
        ending(
            "ending-hidden",
            "晨星的病房錄影",
            "HIDDEN · HOSPITAL VIDEO",
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
