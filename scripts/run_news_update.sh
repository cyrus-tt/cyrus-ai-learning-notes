#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

load_secret() {
  security find-generic-password -a "$USER" -s "$1" -w 2>/dev/null || true
}

"$PROJECT_DIR/.venv-news/bin/python" "$PROJECT_DIR/scripts/update_news.py"

if [ -f "$PROJECT_DIR/.dev.vars" ]; then
  set -a
  source "$PROJECT_DIR/.dev.vars"
  set +a
fi

if [ -z "${TWITTER_TOKEN:-}" ] || [ "${TWITTER_TOKEN:-}" = "replace_me" ]; then
  export TWITTER_TOKEN="$(load_secret CYRUS_TWITTER_TOKEN)"
fi

if [ -z "${OPENNEWS_TOKEN:-}" ] || [ "${OPENNEWS_TOKEN:-}" = "replace_me" ]; then
  export OPENNEWS_TOKEN="$(load_secret CYRUS_OPENNEWS_TOKEN)"
fi

if [ -n "${TWITTER_TOKEN:-}" ] || [ -n "${OPENNEWS_TOKEN:-}" ]; then
  "$PROJECT_DIR/.venv-news/bin/python" "$PROJECT_DIR/scripts/build_x_watchlist.py"
else
  echo "Skip X watchlist build: TWITTER_TOKEN / OPENNEWS_TOKEN not configured."
fi

PUBLISH_DIR="$PROJECT_DIR/.publish"
rm -rf "$PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR/data"

cp "$PROJECT_DIR/index.html" "$PUBLISH_DIR/index.html"
cp "$PROJECT_DIR/news.html" "$PUBLISH_DIR/news.html"
cp "$PROJECT_DIR/resources.html" "$PUBLISH_DIR/resources.html"
cp "$PROJECT_DIR/privacy.html" "$PUBLISH_DIR/privacy.html"
cp "$PROJECT_DIR/disclaimer.html" "$PUBLISH_DIR/disclaimer.html"
cp "$PROJECT_DIR/404.html" "$PUBLISH_DIR/404.html"
cp "$PROJECT_DIR/consulting.html" "$PUBLISH_DIR/consulting.html"
cp "$PROJECT_DIR/work.html" "$PUBLISH_DIR/work.html"
cp "$PROJECT_DIR/styles.css" "$PUBLISH_DIR/styles.css"
cp "$PROJECT_DIR/news.js" "$PUBLISH_DIR/news.js"
cp "$PROJECT_DIR/resources.js" "$PUBLISH_DIR/resources.js"
cp "$PROJECT_DIR/ui.js" "$PUBLISH_DIR/ui.js"
cp "$PROJECT_DIR/favicon.svg" "$PUBLISH_DIR/favicon.svg"
cp "$PROJECT_DIR/og-cover.svg" "$PUBLISH_DIR/og-cover.svg"
cp "$PROJECT_DIR/robots.txt" "$PUBLISH_DIR/robots.txt"
cp "$PROJECT_DIR/sitemap.xml" "$PUBLISH_DIR/sitemap.xml"
cp "$PROJECT_DIR/site.webmanifest" "$PUBLISH_DIR/site.webmanifest"
cp "$PROJECT_DIR/_headers" "$PUBLISH_DIR/_headers"
cp "$PROJECT_DIR/data/news.json" "$PUBLISH_DIR/data/news.json"
cp "$PROJECT_DIR/data/news_digest.json" "$PUBLISH_DIR/data/news_digest.json"
cp "$PROJECT_DIR/data/xhs_feed.json" "$PUBLISH_DIR/data/xhs_feed.json"
cp "$PROJECT_DIR/data/x_watchlist.json" "$PUBLISH_DIR/data/x_watchlist.json"
cp "$PROJECT_DIR/data/x_feed.json" "$PUBLISH_DIR/data/x_feed.json"

/opt/homebrew/bin/wrangler pages deploy "$PUBLISH_DIR" --project-name cyrus-ai-notes --commit-dirty=true
