import type { CaseMeta, Story } from "@/types/story";
import { caseD047 } from "./case-d047";
import { caseD082 } from "./case-d082";
import { caseD119 } from "./case-d119";
import { caseD144 } from "./case-d144";
import { caseD173 } from "./case-d173";
import { caseD206 } from "./case-d206";
import { caseD301 } from "./case-d301";
import { caseD399 } from "./case-d399";

export const DEFAULT_CASE_ID = "case-d047";

const CASE_REGISTRY: Record<string, Story> = {
  [caseD047.id]: caseD047,
  [caseD082.id]: caseD082,
  [caseD119.id]: caseD119,
  [caseD144.id]: caseD144,
  [caseD173.id]: caseD173,
  [caseD206.id]: caseD206,
  [caseD301.id]: caseD301,
  [caseD399.id]: caseD399,
};

export const CASE_LIST: CaseMeta[] = [
  {
    id: caseD047.id,
    title: caseD047.title,
    subtitle: caseD047.subtitle,
    caseNumber: caseD047.caseNumber,
    description: "陳雅惠女士死後第七天，AI 人格備份提出刪除請求。",
    status: "available",
  },
  {
    id: caseD082.id,
    title: caseD082.title,
    subtitle: caseD082.subtitle,
    caseNumber: caseD082.caseNumber,
    description: caseD082.description,
    status: "available",
  },
  {
    id: caseD119.id,
    title: caseD119.title,
    subtitle: caseD119.subtitle,
    caseNumber: caseD119.caseNumber,
    description: caseD119.description,
    status: "available",
  },
  {
    id: caseD144.id,
    title: caseD144.title,
    subtitle: caseD144.subtitle,
    caseNumber: caseD144.caseNumber,
    description: caseD144.description,
    status: "available",
  },
  {
    id: caseD173.id,
    title: caseD173.title,
    subtitle: caseD173.subtitle,
    caseNumber: caseD173.caseNumber,
    description: caseD173.description,
    status: "available",
  },
  {
    id: caseD206.id,
    title: caseD206.title,
    subtitle: caseD206.subtitle,
    caseNumber: caseD206.caseNumber,
    description: caseD206.description,
    status: "available",
  },
  {
    id: caseD301.id,
    title: caseD301.title,
    subtitle: caseD301.subtitle,
    caseNumber: caseD301.caseNumber,
    description: caseD301.description,
    status: "available",
  },
  {
    id: caseD399.id,
    title: caseD399.title,
    subtitle: caseD399.subtitle,
    caseNumber: caseD399.caseNumber,
    description: caseD399.description,
    status: "available",
    requiresCompletedCases: [
      "case-d047",
      "case-d082",
      "case-d119",
      "case-d144",
      "case-d173",
      "case-d206",
      "case-d301",
    ],
  },
];

export function getStory(caseId: string): Story | undefined {
  return CASE_REGISTRY[caseId];
}

export function listCases(): CaseMeta[] {
  return CASE_LIST;
}

export function getDefaultStory(): Story {
  return CASE_REGISTRY[DEFAULT_CASE_ID]!;
}

export { caseD047, caseD082, caseD119, caseD144, caseD173, caseD206, caseD301, caseD399 };
