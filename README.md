# ai-will-executor

《AI遺囑執行人》互動文字遊戲 — 多案件資料架構 + Vercel 分析後台

## 啟動

```bash
cd /Users/linsongmin/ai-will-executor
npm install
npm run dev
```

- 案件大廳：http://localhost:3000
- 第一案：http://localhost:3000/case/case-d047
- 分析後台：http://localhost:3000/admin

## 專案結構

```
data/cases/
  index.ts          # 案件註冊表（新增第二案在此掛載）
  case-d047.ts      # 第一案：劇情 nodes + flow 設定
  _template.ts      # 第二案範本
lib/
  engine.ts         # 通用引擎（不硬編碼節點 ID）
  player/client.ts  # 玩家身分（匿名 / Email）
  sync/client.ts    # 進度同步至後台
  store/redis.ts    # Upstash Redis 儲存
app/api/            # Vercel Serverless API
```

## 新增第二案

1. 複製 `data/cases/_template.ts` → `data/cases/case-d048.ts`
2. 填入 `nodes`、`endings`、`personalityArchetypes`、`flow`
3. 在 `data/cases/index.ts` 的 `CASE_REGISTRY` 與 `CASE_LIST` 註冊
4. 玩家從大廳 `/` 進入 `/case/case-d048`

**不需改** `GameShell`、`engine`、UI 元件（除非新案件有特殊機制）。

## PlayerState（玩家進度）

```ts
{
  storyId, playerId,
  legal / empathy / suspicion,  // stats
  viewedNodes, flags, choiceHistory,
  currentNodeId, phase, endingId, ...
}
```

每個案件獨立 localStorage：`ai-will-executor-v04:{storyId}`

## 後台與會員（Vercel 部署不變）

遊戲仍部署在 Vercel；後台透過 **同 repo 的 API Routes** + **Upstash Redis**。

### 環境變數（Vercel → Settings → Environment Variables）

複製 `.env.example`：

| 變數 | 用途 |
|------|------|
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis Token |
| `ADMIN_SECRET` | `/admin` 後台密鑰 |

在 Vercel：**Storage → Create → Upstash Redis** 可一鍵注入 `KV_*`。

未設定 Redis 時：遊戲正常，同步 API 靜默略過。

### 玩家身分

- **匿名**：自動產生 `playerId`，可統計試玩
- **Email（選填）**：大廳註冊後跨裝置對應同一 `playerId`

### 分析後台 `/admin`

輸入 `ADMIN_SECRET` 後可查看：

- 玩家數、各案完成數
- 結局分布
- 熱門選項 ID 統計

## 部署

仍使用 Vercel + GitHub，無需另架伺服器。推送後在 Vercel 補上環境變數即可。

## 技術

- Next.js 15 + TypeScript
- 劇情：純資料（`Story` + `CaseFlow`）
- 存檔：localStorage + 可選 Redis 同步
