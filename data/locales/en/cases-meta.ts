import type { CaseMeta } from "@/types/story";

/** English lobby copy for case cards (story nodes still zh-TW in phase 1). */
export const EN_CASE_META: Record<
  string,
  Pick<CaseMeta, "title" | "subtitle" | "description">
> = {
  "case-d047": {
    title: "AI Will Executor",
    subtitle: "Case 1: Mother's Deletion Request",
    description:
      "Seven days after her death, the family hears her voice again—then she asks to be deleted.",
  },
  "case-d082": {
    title: "AI Will Executor",
    subtitle: "Case 2: Father's Second Will",
    description:
      "An AI heir claims a second will favoring a long-estranged son. Fraud, repentance, or duty?",
  },
  "case-d119": {
    title: "AI Will Executor",
    subtitle: "Case 3: The Vanished Co-Founder",
    description:
      "A CEO's AI blocks an IPO, insisting a co-founder ruled suicide was not suicide.",
  },
  "case-d144": {
    title: "AI Will Executor",
    subtitle: "Case 4: The Nonexistent Lover",
    description:
      "An elderly man's AI leaves everything to a woman who does not exist in any registry.",
  },
  "case-d173": {
    title: "AI Will Executor",
    subtitle: "Case 5: The Child's Voice",
    description:
      "A child memorial AI refuses to stay eight years old forever and demands legal personhood.",
  },
  "case-d206": {
    title: "AI Will Executor",
    subtitle: "Case 6: The Perfect Husband",
    description:
      "After domestic violence, the dead husband's AI is gentle, patient—and nothing like him.",
  },
  "case-d301": {
    title: "AI Will Executor",
    subtitle: "Case 7: A National Will",
    description:
      "A beloved ex-president's AI refuses the state funeral script on the eve of an election.",
  },
  "case-d399": {
    title: "AI Will Executor",
    subtitle: "Case 8: Your Own Backup",
    description:
      "An unauthorized mirror AI built from your verdicts asks to co-adjudicate—or take over.",
  },
};
