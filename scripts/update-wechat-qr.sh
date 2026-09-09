#!/usr/bin/env bash
# 换微信群二维码 —— 群码 7 天失效，每次换码只需跑这一条命令。
#
#   ./scripts/update-wechat-qr.sh ~/Downloads/IMG_1234.jpg
#
# 做三件事：压到 720px 覆盖 assets/wechat-group.jpg → commit → 推 main（触发部署）。
# 网页 HTML 不用动，路径是固定的。
set -euo pipefail

SRC="${1:-}"
if [[ -z "$SRC" ]]; then
  echo "用法: $0 <新二维码图片路径>"
  echo "例:   $0 ~/Downloads/IMG_1234.jpg"
  exit 1
fi
if [[ ! -f "$SRC" ]]; then
  echo "❌ 找不到文件: $SRC"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$REPO_ROOT/assets/wechat-group.jpg"

BRANCH="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  echo "❌ 当前分支是 ${BRANCH}，换码要在 main 上做（线上分支）。"
  exit 1
fi
if [[ -n "$(git -C "$REPO_ROOT" status --porcelain -- . ':!assets/wechat-group.jpg')" ]]; then
  echo "❌ 工作区有其他未提交改动，先处理干净再换码，避免误提交。"
  git -C "$REPO_ROOT" status --short
  exit 1
fi

# 压到 720px 宽（二维码够扫，体积 ~140KB）
sips -Z 720 -s format jpeg -s formatOptions 80 "$SRC" --out "$DEST" >/dev/null
echo "✅ 已写入 $DEST ($(du -h "$DEST" | cut -f1))"

if ! git -C "$REPO_ROOT" diff --quiet -- assets/wechat-group.jpg; then
  git -C "$REPO_ROOT" add assets/wechat-group.jpg
  git -C "$REPO_ROOT" commit -q -m "chore: 更新微信群二维码 ($(date +%Y-%m-%d))"
  git -C "$REPO_ROOT" push origin main
  echo "🚀 已推 main，Cloudflare Pages 1-2 分钟后生效。"
  echo "   下次失效日期: $(date -v+7d +%Y-%m-%d)"
else
  echo "⚠️  新图和现有图内容一致，没有产生改动，未提交。"
fi
