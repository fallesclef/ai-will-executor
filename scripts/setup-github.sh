#!/usr/bin/env bash
set -euo pipefail

REPO="git@github.com:fallesclef/ai-will-executor.git"
WEB_NEW="https://github.com/new?name=ai-will-executor&owner=fallesclef"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

echo "→ 專案目錄：$ROOT"

# 若先前 agent 留下不完整 .git，先清理
if [[ -d .git && ! -f .git/config ]]; then
  echo "→ 移除不完整的 .git"
  rm -rf .git
fi

# 若 /tmp 有完整備份，優先還原
if [[ ! -f .git/config && -d /tmp/ai-will-executor.git ]]; then
  echo "→ 還原 /tmp/ai-will-executor.git"
  mv /tmp/ai-will-executor.git .git
fi

if [[ ! -d .git ]]; then
  echo "→ 初始化 git"
  git init -b main
  git add -A
  git -c user.name="fallesclef" \
      -c user.email="fallesclef@users.noreply.github.com" \
      commit -m "$(cat <<'EOF'
Initial commit: V0.1 MVP interactive text game.

《AI遺囑執行人》第一案完整劇情、控制台流程與 localStorage 存檔。
EOF
)"
else
  echo "→ 使用現有 git 儲存庫"
fi

if ! git remote get-url origin &>/dev/null; then
  git remote add origin "$REPO"
else
  git remote set-url origin "$REPO"
fi

echo ""
echo "→ 測試 GitHub SSH 連線..."
if ssh -T git@github.com 2>&1 | grep -qi "successfully authenticated"; then
  echo "   SSH 已就緒"
else
  echo "   若尚未設定 SSH，請先在 GitHub 加入公鑰："
  echo "   https://github.com/settings/keys"
  echo "   公鑰：~/.ssh/id_ed25519.pub"
fi

echo ""
echo "→ 若 GitHub 上還沒有 repo，請先建立（不要加 README）："
echo "   $WEB_NEW"
echo ""
read -r -p "已在 GitHub 建立 ai-will-executor？(y/N) " ok
if [[ "${ok,,}" != "y" ]]; then
  echo "請建立 repo 後再執行： git push -u origin main"
  exit 0
fi

echo "→ 推送到 GitHub..."
git push -u origin main

echo ""
echo "✓ 完成！Repo：https://github.com/fallesclef/ai-will-executor"
echo ""
echo "下一步（Vercel 部署）："
echo "  1. 開啟 https://vercel.com/new"
echo "  2. Import 此 repo → Deploy"
echo "  3. 把公開網址填回 README 的「線上試玩」"
