export type ChangelogItemType = "feature" | "fix" | "improvement";

export interface ChangelogItem {
  type: ChangelogItemType;
  zh: string;
  en: string;
}

export interface ChangelogRelease {
  version: string;
  date: string;
  items: ChangelogItem[];
}

/** Newest first. Add a release here whenever you ship an update. */
export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "0.2.1",
    date: "2026-06-28",
    items: [
      {
        type: "feature",
        zh: "大廳案件卡顯示「已審理／審理中」，已完成可再次審理",
        en: "Lobby case cards show Completed / In progress; finished cases can be replayed",
      },
      {
        type: "feature",
        zh: "註冊 Email 後，跨裝置同步審理狀態（本機或雲端完成皆標示已審理）",
        en: "Linked email syncs case status across devices (completed on either side counts)",
      },
      {
        type: "improvement",
        zh: "玩法說明補充：完整存檔留本機，跨裝置目前僅同步狀態；「雲端還原存檔」規劃中",
        en: "How-to-play clarifies: full saves stay local; cross-device is status-only; cloud save restore planned",
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-06-25",
    items: [
      {
        type: "feature",
        zh: "介面支援繁體中文／英文切換（劇情英文將逐案上線）",
        en: "Interface available in Traditional Chinese and English (story EN rolls out per case)",
      },
      {
        type: "feature",
        zh: "首頁新增玩法說明與版本更新公告",
        en: "Lobby how-to-play guide and release notes added",
      },
      {
        type: "improvement",
        zh: "手機版閱讀字級與對比提升，長文更易讀",
        en: "Larger type and higher contrast for mobile reading",
      },
      {
        type: "fix",
        zh: "切換案件資料或返回控制台時，畫面會自動捲至頂端或未讀項目",
        en: "Scrolling resets to top or next unread item when switching views",
      },
      {
        type: "improvement",
        zh: "結局畫面可「進行下一案」或返回大廳選案",
        en: "Ending screen offers next case or return to lobby",
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-06-01",
    items: [
      {
        type: "feature",
        zh: "八案連載互動審判遊戲正式上線",
        en: "Eight-case interactive adjudication game launched",
      },
      {
        type: "feature",
        zh: "執行人姓名個人化與跨案件系統共振",
        en: "Executor name personalization and cross-case system resonance",
      },
      {
        type: "feature",
        zh: "本機自動存檔，可選填 Email 同步進度",
        en: "Auto-save locally with optional email for progress sync",
      },
    ],
  },
];

export function getLatestChangelogVersion(): string {
  return CHANGELOG[0]?.version ?? "0.0.0";
}
