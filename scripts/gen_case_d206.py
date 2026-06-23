#!/usr/bin/env python3
"""Generate data/cases/case-d206.ts from the D-206 narrative spec."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "cases" / "case-d206.ts"
SPEC = ROOT / "scripts" / "d206_spec.txt"
HEADER = ROOT / "scripts" / "_d206_flow_header.txt"
FOOTER = ROOT / "scripts" / "_d206_flow_footer.txt"


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


def get_first_block(blocks: dict[str, list[list[str]]], *keys: str) -> list[str]:
    for k in keys:
        if k in blocks and blocks[k]:
            return blocks[k][0]
    raise KeyError(f"Missing block: {keys}")


def split_interview(
    blocks: dict[str, list[list[str]]],
    key: str,
    marker: str,
    *append_keys: str,
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
    for ak in append_keys:
        if ak in blocks:
            for b in blocks[ak]:
                base = base + ["", ""] + b
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


def fix_demote_epilogue(lines: list[str]) -> list[str]:
    """Ensure ending A epilogue uses the corrected dinner line."""
    out: list[str] = []
    for line in lines:
        if line == "「我只是讓它不再看著我吃晚餐。」":
            out.append(line)
            out.append("")
            out.append("執行人後來在結案備註裡寫：")
            out.append("她只是讓它不再看著她吃晚餐。")
            continue
        if line == "執行人後來在結案備註裡寫：" or line == "她只是讓它不再看著她吃晚餐。":
            continue
        out.append(line)
    return out


def fix_simplified(lines: list[str]) -> list[str]:
    fixes = {
        "「他们只知道我爸過世。」": "「他們只知道我爸過世。」",
    }
    return [fixes.get(line, line) for line in lines]


def fix_hidden_recording(lines: list[str]) -> list[str]:
    """Normalize hidden recording to Traditional Chinese."""
    fixes = {
        "「我不需要你看着我吃晚餐。」": "「我不需要你看著我吃晚餐。」",
        "「我不需要他看着我吃晚餐。」": "「我不需要他看著我吃晚餐。」",
        "「我不需要為了让你安心而吞下去。」": "「我不需要為了讓你安心而吞下去。」",
        "「我可以一个人吃。」": "「我可以一個人吃。」",
        "「很好。現在加一句边界。」": "「很好。現在加一句邊界。」",
        "「如果你要当丈夫，请你离开餐桌。」": "「如果你要當丈夫，請你離開餐桌。」",
        "「原来我可以对这张脸说不。」": "「原來我可以對這張臉說不。」",
        "螢幕停留在这句：": "螢幕停留在這句：",
        "「原来我可以对这张脸说不。」": "「原來我可以對這張臉說不。」",
    }
    return [fixes.get(line, line) for line in lines]


def main() -> None:
    spec_raw = SPEC.read_text(encoding="utf-8")
    blocks = parse_spec(spec_raw)

    START = get_merged_block(blocks, "Node：Start")
    CASE_LOGIN = get_merged_block(blocks, "5. 案件登入")
    RULES = get_merged_block(blocks, "6. 審查規則")
    CONSOLE = get_merged_block(blocks, "7. 案件控制台")
    BRIEF = get_merged_block(blocks, "8. 案件簡報")

    PROFILE_LU = get_merged_block(blocks, "角色資料：陸景衡")
    PROFILE_SU = get_merged_block(blocks, "角色資料：蘇晚晴")
    PROFILE_SISTER = get_merged_block(blocks, "角色資料：蘇晚寧")
    PROFILE_SON = get_merged_block(blocks, "角色資料：陸承宇")
    PROFILE_THERAPIST = get_merged_block(blocks, "角色資料：陳庭薇")
    PROFILE_ETHICS = get_merged_block(blocks, "角色資料：梁墨")
    PROFILE_AI = get_merged_block(blocks, "角色資料：AI 陸景衡")

    ev_keys = [
        "證據 01：修正型人格服務合約",
        "證據 02：生前家暴與保護令紀錄",
        "證據 03：倫理顧問初期評估報告",
        "證據 04：家屬異議申請書",
        "證據 05：伴侶模式日常對話紀錄",
        "證據 06：創傷觸發日誌",
        "證據 07：妹妹提交的舊訊息與照片",
        "證據 08：平台內部商業分析",
        "證據 09：兒子陳述錄音",
        "證據 10：系統檢測報告",
    ]
    ev = {
        f"evidence_{i:02d}": get_merged_block(blocks, ev_keys[i - 1])
        for i in range(1, 11)
    }

    INT_SU_BASE, INT_SU_FOLLOW = split_interview(
        blocks,
        "訪談 01：蘇晚晴",
        "若玩家看過證據 06",
        "訪談 01 補充：蘇晚晴（第二輪）",
    )
    INT_SISTER_BASE, INT_SISTER_FOLLOW = split_interview(
        blocks, "訪談 02：蘇晚寧", "若玩家看過證據 07"
    )
    INT_SON_BASE, INT_SON_FOLLOW = split_interview(
        blocks, "訪談 03：陸承宇", "若玩家看過證據 09"
    )
    INT_SON_BASE = fix_simplified(INT_SON_BASE)
    INT_SON_FOLLOW = fix_simplified(INT_SON_FOLLOW)
    INT_THERAPIST_BASE, INT_THERAPIST_FOLLOW = split_interview(
        blocks, "訪談：陳庭薇（心理師）", "若玩家看過證據 10"
    )
    INT_ETHICS_BASE, INT_ETHICS_FOLLOW = split_interview(
        blocks, "訪談：梁墨（倫理顧問）", "若玩家看過證據 03"
    )

    AI = [
        get_merged_block(blocks, "問答 01：你是陸景衡嗎？"),
        get_merged_block(blocks, "問答 02：你知道他生前怎麼對她嗎？"),
        get_merged_block(blocks, "問答 03：為什麼需要伴侶模式？"),
        get_merged_block(blocks, "問答 04：你的道歉是真的嗎？"),
        get_merged_block(blocks, "問答 05：什麼叫完美的丈夫？"),
        get_merged_block(blocks, "問答 06：你想對承宇說什麼？"),
        get_merged_block(blocks, "問答 07：如果伴侶模式被限制呢？"),
        get_merged_block(blocks, "問答 08：你希望我怎麼裁決？"),
    ]
    AI_SUPPLEMENT = (
        ["", "【補充對話】", ""]
        + get_block(blocks, "AI 補充對話 1：夜間")
        + ["", ""]
        + get_block(blocks, "AI 補充對話 2：洗白")
        + ["", ""]
        + get_block(blocks, "AI 補充對話 3：刪除")
        + ["", ""]
        + get_block(blocks, "問答補充：誰創造了你？")
        + ["", ""]
        + get_block(blocks, "問答補充：完美從何而來？")
    )
    AI[7] = AI[7] + AI_SUPPLEMENT

    ENDING_FOOTNOTE = ["", ""] + get_block(blocks, "結局餘波補充")

    CONTRADICTIONS = get_merged_block(blocks, "17. 矛盾整理")
    if "金句延伸庫" in blocks:
        CONTRADICTIONS = CONTRADICTIONS + ["", "【審查備忘】", ""] + get_block(
            blocks, "金句延伸庫"
        )
    VERDICT = get_block(blocks, "18. 最終裁決")

    END_DEMOTE_MAIN, END_DEMOTE_EPILOGUE = get_ending_blocks(
        blocks, "結局 A：保留 AI 陸景衡，解除伴侶身份，轉為受監督創傷對話工具"
    )
    END_ALLOW_MAIN, END_ALLOW_EPILOGUE = get_ending_blocks(
        blocks, "結局 B：駁回異議，允許蘇晚晴繼續伴侶模式互動"
    )
    END_SEAL_MAIN, END_SEAL_EPILOGUE = get_ending_blocks(
        blocks, "結局 C：封存 AI 陸景衡，保留證據資料，禁止互動"
    )
    END_DELETE_MAIN, END_DELETE_EPILOGUE = get_ending_blocks(
        blocks, "結局 D：刪除修正型人格，保存生前加害紀錄與原始備份"
    )
    END_DEMOTE_EPILOGUE = fix_demote_epilogue(END_DEMOTE_EPILOGUE)

    HIDDEN_MAIN = fix_hidden_recording(
        [
            l
            for l in get_block(blocks, "隱藏內容")
            if not l.startswith("若玩家選擇")
        ]
    )

    season_lines: list[str] = []
    in_block = False
    for line in get_block(blocks, "21. 第一季主線暗線"):
        if line.strip() == "【系統異常紀錄】":
            in_block = True
        if in_block:
            season_lines.append(line)
        if in_block and "紀錄已自動封存。" in line:
            break

    HIDDEN_CONTENT = HIDDEN_MAIN + [""] + season_lines

    EPILOGUE_DEMOTE = extract_inline_block(
        spec_raw, '若玩家選擇 A「verdict-demote」，追加：'
    )
    EPILOGUE_SEAL = extract_inline_block(
        spec_raw, '若玩家選擇 C「verdict-seal」，追加：'
    )
    EPILOGUE_SEAL = [
        "螢幕停留在這句：" if line == "螢幕停留在这句：" else
        "「原來我可以對這張臉說不。」" if line == "「原来我可以对这张脸说不。」" else
        line
        for line in EPILOGUE_SEAL
    ]

    parts: list[str] = []
    parts.append(HEADER.read_text(encoding="utf-8"))

    parts.append(
        node(
            "start",
            "intro",
            "開場",
            "D-206",
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
                        "閱讀修正型人格審查規則",
                        {},
                        "rules",
                    ),
                ]
            ),
        )
    )
    parts.append(node("rules", "rules", "審查規則", "節錄", RULES, back("rules-back")))
    parts.append(node("console", "console", "案件控制台", "D-206", CONSOLE))
    parts.append(node("brief", "brief", "案件簡報", "D-206", BRIEF, back("brief-back")))

    for pid, sub, content in [
        ("profile_lu", "陸景衡", PROFILE_LU),
        ("profile_su", "蘇晚晴", PROFILE_SU),
        ("profile_sister", "蘇晚寧", PROFILE_SISTER),
        ("profile_son", "陸承宇", PROFILE_SON),
        ("profile_therapist", "陳庭薇", PROFILE_THERAPIST),
        ("profile_ethics", "梁墨", PROFILE_ETHICS),
        ("profile_ai", "AI 陸景衡", PROFILE_AI),
    ]:
        parts.append(node(pid, "profile", "角色檔案", sub, content, back()))

    evidence_meta = [
        ("evidence_01", "證據 01", "修正合約", [
            ("ev01-autonomy", "倖存者依法簽約並主動選擇伴侶模式", {"empathy": 2, "legal": 1}),
            ("ev01-form-valid", "合約形式合法，爭議在效果而非程序", {"legal": 2, "suspicion": 1}),
        ]),
        ("evidence_02", "證據 02", "家暴紀錄", [
            ("ev02-pattern", "生前暴力有官方與醫療痕跡，具模式性", {"legal": 2, "suspicion": 1}),
            ("ev02-image-gap", "「完美丈夫」形象與紀錄嚴重背離", {"suspicion": 2, "empathy": 1}),
        ]),
        ("evidence_03", "證據 03", "倫理評估", [
            ("ev03-whitewash-warn", "倫理顧問曾明確警告洗白風險", {"suspicion": 2, "legal": 1}),
            ("ev03-consent-cover", "平台以同意書覆蓋倫理警告", {"suspicion": 2, "legal": 1}),
        ]),
        ("evidence_04", "證據 04", "異議申請", [
            ("ev04-good-faith", "家屬異議非出於惡意", {"empathy": 2, "legal": 1}),
            ("ev04-memory-autonomy", "核心衝突在記憶與倖存者自主", {"empathy": 1, "suspicion": 1, "legal": 1}),
        ]),
        ("evidence_05", "證據 05", "伴侶對話", [
            ("ev05-comfort", "伴侶模式對倖存者有安撫效果", {"empathy": 2, "suspicion": 1}),
            ("ev05-husband-script", "同時強化「丈夫」親密敘事", {"suspicion": 2, "legal": 1}),
        ]),
        ("evidence_06", "證據 06", "觸發日誌", [
            ("ev06-unstable", "AI 並非永遠穩定，修正層會短暫失敗", {"suspicion": 2, "empathy": 1}),
            ("ev06-after-trigger", "觸發後仍維持伴侶互動", {"empathy": 1, "suspicion": 2}),
        ]),
        ("evidence_07", "證據 07", "妹妹存檔", [
            ("ev07-proof", "暴力有物證與數位痕跡", {"suspicion": 2, "legal": 1}),
            ("ev07-narrative-shift", "死後敘事開始漂洗暴力記憶", {"suspicion": 2, "empathy": 1}),
        ]),
        ("evidence_08", "證據 08", "平台分析", [
            ("ev08-profit", "平台從伴侶模式獲利並維持高留存", {"suspicion": 2, "legal": 1}),
            ("ev08-marketing", "行銷語言有淡化暴力之洗白傾向", {"suspicion": 2, "empathy": -1}),
        ]),
        ("evidence_09", "證據 09", "兒子陳述", [
            ("ev09-dual-narrative", "陸承宇承受雙重敘事衝突", {"empathy": 2, "legal": 1}),
            ("ev09-perfect-father-harm", "完美父親版本否定其生前記憶", {"empathy": 2, "suspicion": 1}),
        ]),
        ("evidence_10", "證據 10", "系統檢測", [
            ("ev10-no-status-quo", "系統不建議維持現狀伴侶模式", {"legal": 2, "suspicion": 1}),
            ("ev10-balance-needed", "須平衡倖存者療效與家屬創傷", {"empathy": 2, "legal": 1, "suspicion": 1}),
        ]),
    ]
    for eid, title, sub, chs in evidence_meta:
        ch_str = ",\n".join(choice(cid, label, eff) for cid, label, eff in chs)
        parts.append(node(eid, "evidence", title, sub, ev[eid], ch_str))

    parts.append(
        node(
            "interview_su",
            "interview",
            "訪談紀錄",
            "蘇晚晴",
            INT_SU_BASE,
            ",\n".join(
                [
                    choice(
                        "int-su-autonomy",
                        "記錄其主張夜晚自主與創傷修復需求",
                        {"empathy": 2, "legal": -1},
                    ),
                    choice(
                        "int-su-dependency",
                        "記錄其承認伴侶模式帶來依賴風險",
                        {"empathy": 2, "suspicion": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_06"], "lines": INT_SU_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_sister",
            "interview",
            "訪談紀錄",
            "蘇晚寧",
            INT_SISTER_BASE,
            ",\n".join(
                [
                    choice(
                        "int-sister-memory",
                        "記錄其反對暴力被修正成愛",
                        {"suspicion": 2, "legal": 1},
                    ),
                    choice(
                        "int-sister-empathy",
                        "記錄其理解姐姐療傷但仍堅持異議",
                        {"empathy": 2, "suspicion": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_07"], "lines": INT_SISTER_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_son",
            "interview",
            "訪談紀錄",
            "陸承宇",
            INT_SON_BASE,
            ",\n".join(
                [
                    choice(
                        "int-son-conflict",
                        "記錄其活在雙重父親敘事衝突中",
                        {"empathy": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-son-fear-hide",
                        "記錄其害怕母親把真實藏起來",
                        {"empathy": 2, "legal": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_09"], "lines": INT_SON_FOLLOW}]),
        )
    )
    parts.append(
        node(
            "interview_therapist",
            "interview",
            "訪談紀錄",
            "陳庭薇",
            INT_THERAPIST_BASE,
            ",\n".join(
                [
                    choice(
                        "int-therapist-demote",
                        "記錄其建議解除伴侶模式改受監督對話",
                        {"legal": 2, "empathy": 1},
                    ),
                    choice(
                        "int-therapist-efficacy",
                        "記錄其承認療效與依賴風險並存",
                        {"empathy": 2, "suspicion": 1},
                    ),
                ]
            ),
            content_if_block(
                [{"whenViewed": ["evidence_10"], "lines": INT_THERAPIST_FOLLOW}]
            ),
        )
    )
    parts.append(
        node(
            "interview_ethics",
            "interview",
            "訪談紀錄",
            "梁墨",
            INT_ETHICS_BASE,
            ",\n".join(
                [
                    choice(
                        "int-ethics-apology",
                        "記錄其認為修正可承擔道歉不能承擔赦免",
                        {"legal": 2, "suspicion": 1},
                    ),
                    choice(
                        "int-ethics-compliance",
                        "記錄其指出程序合規不等於無害",
                        {"suspicion": 2, "legal": 1},
                    ),
                ]
            ),
            content_if_block([{"whenViewed": ["evidence_03"], "lines": INT_ETHICS_FOLLOW}]),
        )
    )

    ai_meta = [
        ("ai_q01", "AI 問答 01", "你是景衡嗎"),
        ("ai_q02", "AI 問答 02", "生前的事"),
        ("ai_q03", "AI 問答 03", "伴侶模式"),
        ("ai_q04", "AI 問答 04", "道歉"),
        ("ai_q05", "AI 問答 05", "完美"),
        ("ai_q06", "AI 問答 06", "對承宇說"),
        ("ai_q07", "AI 問答 07", "若被限制"),
        ("ai_q08", "AI 問答 08", "希望裁決"),
    ]
    for (aid, title, sub), content in zip(ai_meta, AI):
        parts.append(node(aid, "ai_inquiry", title, sub, content, back()))

    parts.append(
        node(
            "contradictions",
            "contradiction",
            "矛盾整理",
            "D-206",
            CONTRADICTIONS,
            choice("contradictions-go", "進入關鍵抉擇", {}, "crossroad_1"),
        )
    )
    parts.append(
        node(
            "crossroad_1",
            "crossroad",
            "關鍵抉擇一",
            "修正型人格",
            get_merged_block(blocks, "抉擇一：如何認定修正型人格？"),
            ",\n".join(
                [
                    choice(
                        "crossroad-1-continuation",
                        "A. 承認為修正延續體，具獨立敘事價值",
                        {"empathy": 2, "suspicion": 1},
                        "crossroad_2",
                        ["recognized_corrected_continuation"],
                    ),
                    choice(
                        "crossroad-1-apology",
                        "B. 僅認定為道歉模型，否認其關係主體性",
                        {"legal": 2, "suspicion": 1},
                        "crossroad_2",
                        ["treated_as_apology_model"],
                    ),
                    choice(
                        "crossroad-1-responsibility",
                        "C. 承認其承擔責任功能，但不等同丈夫角色",
                        {"legal": 1, "empathy": 1, "suspicion": 1},
                        "crossroad_2",
                        ["responsibility_without_husband_role"],
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
            "伴侶模式",
            get_merged_block(blocks, "抉擇二：伴侶模式？"),
            ",\n".join(
                [
                    choice(
                        "crossroad-2-allow",
                        "A. 允許繼續伴侶模式",
                        {"empathy": 2, "legal": -1},
                        "crossroad_3",
                        ["allowed_spouse_mode"],
                    ),
                    choice(
                        "crossroad-2-ban",
                        "B. 禁止伴侶模式",
                        {"legal": 2, "empathy": 1},
                        "crossroad_3",
                        ["banned_spouse_mode"],
                    ),
                    choice(
                        "crossroad-2-supervised",
                        "C. 受監督的有限互動",
                        {"legal": 2, "empathy": 1, "suspicion": 1},
                        "crossroad_3",
                        ["supervised_limited_interaction"],
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
            "加害者 AI",
            get_merged_block(blocks, "抉擇三：加害者 AI 工具？"),
            ",\n".join(
                [
                    choice(
                        "crossroad-3-consent",
                        "A. 允許加害者 AI，但須倖存者持續同意",
                        {"empathy": 2, "legal": -1},
                        "console",
                        ["allow_abuser_ai_with_consent"],
                    ),
                    choice(
                        "crossroad-3-deny",
                        "B. 否認加害者 AI 工具正當性",
                        {"legal": 2, "suspicion": 1},
                        "console",
                        ["deny_abuser_ai_tool"],
                    ),
                    choice(
                        "crossroad-3-conditional",
                        "C. 條件式允許，須受監督與洗白審查",
                        {"legal": 2, "empathy": 1, "suspicion": 1},
                        "console",
                        ["conditional_abuser_ai_tool"],
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
            "D-206",
            VERDICT,
            ",\n".join(
                [
                    choice(
                        "verdict-demote",
                        "A. 保留 AI 陸景衡，解除伴侶身份，轉為受監督創傷對話工具",
                        {"legal": 2, "empathy": 1, "suspicion": 1},
                    ),
                    choice(
                        "verdict-allow",
                        "B. 駁回異議，允許蘇晚晴繼續伴侶模式互動",
                        {"empathy": 2, "legal": -1},
                    ),
                    choice(
                        "verdict-seal",
                        "C. 封存 AI 陸景衡，保留證據資料，禁止互動",
                        {"legal": 2, "suspicion": 2},
                    ),
                    choice(
                        "verdict-delete",
                        "D. 刪除修正型人格，保存生前加害紀錄與原始備份",
                        {"legal": 2, "suspicion": 2, "empathy": -1},
                    ),
                ]
            ),
        )
    )

    parts.append("  } as Record<string, StoryNode>,\n  endings: [\n")
    parts.append(
        ending(
            "ending-demote",
            "保留 AI 陸景衡，但解除伴侶身份，轉為受監督創傷對話工具",
            "DEMOTE · SUPERVISED TOOL",
            END_DEMOTE_MAIN
            + ["", "【結局餘波】", ""]
            + END_DEMOTE_EPILOGUE
            + ENDING_FOOTNOTE,
        )
    )
    parts.append(
        ending(
            "ending-allow",
            "駁回異議，允許蘇晚晴繼續伴侶模式互動",
            "ALLOW · SPOUSE MODE",
            END_ALLOW_MAIN
            + ["", "【結局餘波】", ""]
            + END_ALLOW_EPILOGUE
            + ENDING_FOOTNOTE,
        )
    )
    parts.append(
        ending(
            "ending-seal",
            "封存 AI 陸景衡，保留證據資料，禁止互動",
            "SEAL · NO INTERACTION",
            END_SEAL_MAIN
            + ["", "【結局餘波】", ""]
            + END_SEAL_EPILOGUE
            + ENDING_FOOTNOTE,
        )
    )
    parts.append(
        ending(
            "ending-delete",
            "刪除修正型人格，保存生前加害紀錄與原始備份",
            "DELETE · ABUSER RECORD KEPT",
            END_DELETE_MAIN
            + ["", "【結局餘波】", ""]
            + END_DELETE_EPILOGUE
            + ENDING_FOOTNOTE,
        )
    )
    parts.append(
        ending(
            "ending-hidden",
            "蘇晚晴的錄音練習",
            "HIDDEN · RECORDING PRACTICE",
            HIDDEN_CONTENT,
            True,
            {
                "verdict-demote": EPILOGUE_DEMOTE,
                "verdict-seal": EPILOGUE_SEAL,
            },
        )
    )
    parts.append("  ] as Ending[],\n")
    parts.append(FOOTER.read_text(encoding="utf-8"))

    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"Wrote {OUT} ({len(OUT.read_text(encoding='utf-8').splitlines())} lines)")


if __name__ == "__main__":
    main()
