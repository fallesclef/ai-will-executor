#!/usr/bin/env python3
"""Append remaining nodes/endings to case-d082.ts"""

from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "cases" / "case-d082.ts"


def c(*lines: str) -> str:
    rows = []
    for line in lines:
        if line == "":
            rows.append('        "",')
        else:
            rows.append(f'        "{line.replace(chr(92), chr(92)+chr(92)).replace(chr(34), chr(92)+chr(34))}",')
    return "\n".join(rows)


APPEND = f"""
    evidence_01: {{
      id: "evidence_01",
      category: "evidence",
      title: "證據 01",
      subtitle: "正式遺囑",
      content: [
{c("""
【證據 01｜正式遺囑】

簽署人：張世昌
簽署日期：2040 年 12 月 8 日
見證律師：魏廷章
文件狀態：正式有效

遺囑主要內容：

一、張世昌名下世昌建設股份，依家族信託安排，由長子張承祐管理。
二、配偶周美蘭取得家族住宅、主要金融資產及生活信託收益權。
三、女兒張若寧繼續擔任世昌教育基金會執行長，並取得基金會專款管理權。
四、張世昌個人可處分資產之 20%，捐入世昌教育基金會。
五、其餘個人資產依法定繼承比例分配予配偶及子女。

文件備註：

未提及林澈。
未提及非婚生子。
未提及第二遺囑。
未提及補充信託。

律師補充說明：

張世昌簽署當日意識清楚。
未表現出受脅迫或重大精神障礙情形。

線索標籤：

正式遺囑有效，且沒有林澈的位置。
""".strip().split("\n"))}
      ],
      choices: [
        {{
          id: "ev01-valid",
          label: "正式遺囑有效，應優先適用",
          effects: {{ legal: 2, suspicion: 1 }},
        }},
        {{
          id: "ev01-omission",
          label: "受益人遺漏值得進一步審查",
          effects: {{ empathy: 1, legal: 1, suspicion: 1 }},
        }},
      ],
    }},
"""

# Fix the c() function usage - the above won't work with triple nested. Let me rewrite properly.
