# ai-will-executor

《AI遺囑執行人》第一案：《母親的刪除請求》V0.1

## 線上試玩

部署後可在此更新公開網址：

- **試玩連結：** （部署完成後填入，例如 `https://ai-will-executor.vercel.app`）

## 本地開發

```bash
cd /Users/linsongmin/ai-will-executor
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 部署到 Vercel（推薦）

1. 將此 repo 推送到 GitHub
2. 前往 [vercel.com](https://vercel.com)，用 GitHub 登入
3. **Add New Project** → 選擇 `ai-will-executor`
4. 保持預設設定（Framework: Next.js），點 **Deploy**
5. 完成後取得公開網址，分享給試玩者

此專案無後端、存檔在瀏覽器 localStorage，可直接靜態部署。

## 遊戲主流程

1. 開場 → 案件登入 → 審查規則
2. 案件控制台（D-047）
3. 案件簡報 → 角色資料（5）→ 七份證據 → 三位家屬訪談 → AI 六問
4. 矛盾整理 → 三個關鍵抉擇 → 提交裁決
5. 四個主結局 / 隱藏結局「最後授權」→ 裁決人格報告

## 裁決選項

- A. 核准刪除
- B. 駁回刪除
- C. 暫緩三十天
- D. 封存不刪除

## 隱藏結局觸發

- 閱覽證據 01、02、06
- 完成 AI 問答「你是陳雅惠本人嗎？」
- 關鍵抉擇三：承認或條件式承認 AI 自主請求權
- 最終選擇「核准刪除」或「封存不刪除」

## 劇情資料

- `data/story.ts` — 單一劇情資料來源（主入口、所有節點、結局、人格報告與流程常數）

## 技術

- Next.js 15 + TypeScript
- 無後端，進度儲存於 localStorage（`v03`）
