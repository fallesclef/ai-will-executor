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
    version: "0.2.4",
    date: "2026-06-30",
    items: [
      {
        type: "fix",
        zh: "修復大廳無限重新整理導致頁面卡死、無法進入案件的問題",
        en: "Fix lobby infinite refresh loop that froze the page and blocked case entry",
      },
    ],
  },
  {
    version: "0.2.3",
    date: "2026-06-28",
    items: [
      {
        type: "improvement",
        zh: "大幅降低 Redis 用量：匿名玩家僅本機存檔；Email 玩家僅在選擇／導航／裁決時同步",
        en: "Cut Redis usage: anonymous local-only saves; email players sync on choice, navigate, verdict only",
      },
      {
        type: "improvement",
        zh: "移除每次 state 變動的雲端 sync；導航改為延遲合併，離開分頁時補送",
        en: "Removed sync on every state tick; debounced navigate sync with flush on tab leave",
      },
      {
        type: "improvement",
        zh: "後台統計改為索引查詢，不再掃描全庫 KEYS",
        en: "Admin stats use key indexes instead of full KEYS scans",
      },
    ],
  },
  {
    version: "0.2.2",
    date: "2026-06-28",
    items: [
      {
        type: "feature",
        zh: "Email 玩家：完整存檔上傳雲端，大廳可「還原至本機」接續進度",
        en: "Email players: full saves sync to cloud; lobby offers restore to this device",
      },
      {
        type: "improvement",
        zh: "全程自動存檔：本機即時保存，Email 玩家遊玩中自動上雲，無須手動存檔鍵",
        en: "Fully automatic saves: instant local writes; email players auto-upload while playing—no save button",
      },
      {
        type: "improvement",
        zh: "還原時以較新的 updatedAt 為準；同一版本雲端存檔可選「稍後再說」",
        en: "Restore prefers newer updatedAt; dismiss hides the same cloud snapshot until it changes",
      },
      {
        type: "improvement",
        zh: "玩法說明更新：自動存檔、雲端備份與跨裝置還原流程",
        en: "How-to-play updated: auto-save, cloud backup, and cross-device restore flow",
      },
    ],
  },
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
        zh: "玩法說明更新：釐清「本機完整存檔」與「Email 跨裝置狀態同步」的差異；雲端還原存檔規劃中",
        en: "How-to-play clarifies local full saves vs. email cross-device status sync; cloud save restore planned",
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
