#!/bin/bash

# deploy.sh - 快速部署到 GitHub Pages
# 用法：./scripts/deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "🚀 部署到 GitHub Pages..."

cd "$PROJECT_ROOT"

# 检查 dist 目录
if [ ! -d "dist" ]; then
    echo "❌ dist 目录不存在，先执行构建..."
    npm run build
fi

# 推送
git subtree push --prefix dist origin gh-pages

echo "✅ 部署完成！"
echo "📱 访问地址：https://$(git remote get-url origin | sed 's/.*\/\([^/]*\)\/\([^/]*\).git/\1.github.io\/\2/')"
