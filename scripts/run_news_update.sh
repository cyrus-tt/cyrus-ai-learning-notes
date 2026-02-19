#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp"
cd "$PROJECT_DIR"

"$PROJECT_DIR/.venv-news/bin/python" "$PROJECT_DIR/scripts/update_news.py"

PUBLISH_DIR="$PROJECT_DIR/.publish"
rm -rf "$PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR/data"

cp "$PROJECT_DIR/index.html" "$PUBLISH_DIR/index.html"
cp "$PROJECT_DIR/news.html" "$PUBLISH_DIR/news.html"
cp "$PROJECT_DIR/resources.html" "$PUBLISH_DIR/resources.html"
cp "$PROJECT_DIR/consulting.html" "$PUBLISH_DIR/consulting.html"
cp "$PROJECT_DIR/work.html" "$PUBLISH_DIR/work.html"
cp "$PROJECT_DIR/styles.css" "$PUBLISH_DIR/styles.css"
cp "$PROJECT_DIR/news.js" "$PUBLISH_DIR/news.js"
cp "$PROJECT_DIR/resources.js" "$PUBLISH_DIR/resources.js"
cp "$PROJECT_DIR/favicon.svg" "$PUBLISH_DIR/favicon.svg"
cp "$PROJECT_DIR/og-cover.svg" "$PUBLISH_DIR/og-cover.svg"
cp "$PROJECT_DIR/robots.txt" "$PUBLISH_DIR/robots.txt"
cp "$PROJECT_DIR/sitemap.xml" "$PUBLISH_DIR/sitemap.xml"
cp "$PROJECT_DIR/site.webmanifest" "$PUBLISH_DIR/site.webmanifest"
cp "$PROJECT_DIR/data/news.json" "$PUBLISH_DIR/data/news.json"

/opt/homebrew/bin/wrangler pages deploy "$PUBLISH_DIR" --project-name cyrus-ai-notes --commit-dirty=true
