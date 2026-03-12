#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

load_secret() {
  security find-generic-password -a "$USER" -s "$1" -w 2>/dev/null || true
}

pick_python() {
  if [ -x "$PROJECT_DIR/.venv-news/bin/python" ]; then
    echo "$PROJECT_DIR/.venv-news/bin/python"
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    command -v python
    return 0
  fi

  echo "Python runtime not found." >&2
  exit 1
}

ensure_python_deps() {
  if ! "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
import importlib.util
import sys

required = ("feedparser", "requests", "deep_translator")
missing = [name for name in required if importlib.util.find_spec(name) is None]
sys.exit(1 if missing else 0)
PY
  then
    "$PYTHON_BIN" -m pip install -r "$PROJECT_DIR/scripts/news_requirements.txt"
  fi
}

run_optional_step() {
  local label="$1"
  shift

  if ! "$@"; then
    echo "Warn: ${label} failed, keep last successful snapshot."
  fi
}

resolve_wrangler() {
  if [ -x "/opt/homebrew/bin/wrangler" ]; then
    echo "/opt/homebrew/bin/wrangler"
    return 0
  fi

  if command -v wrangler >/dev/null 2>&1; then
    command -v wrangler
    return 0
  fi

  echo ""
}

PYTHON_BIN="$(pick_python)"
ensure_python_deps

if [ -f "$PROJECT_DIR/.dev.vars" ]; then
  set -a
  source "$PROJECT_DIR/.dev.vars"
  set +a
fi

mkdir -p "$PROJECT_DIR/logs"

"$PYTHON_BIN" "$PROJECT_DIR/scripts/update_news.py"

if [ -z "${TWITTER_TOKEN:-}" ] || [ "${TWITTER_TOKEN:-}" = "replace_me" ]; then
  export TWITTER_TOKEN="$(load_secret CYRUS_TWITTER_TOKEN)"
fi

if [ -z "${OPENNEWS_TOKEN:-}" ] || [ "${OPENNEWS_TOKEN:-}" = "replace_me" ]; then
  export OPENNEWS_TOKEN="$(load_secret CYRUS_OPENNEWS_TOKEN)"
fi

if [ -n "${TWITTER_TOKEN:-}" ] || [ -n "${OPENNEWS_TOKEN:-}" ]; then
  run_optional_step "X watchlist build" "$PYTHON_BIN" "$PROJECT_DIR/scripts/build_x_watchlist.py"
else
  echo "Skip X watchlist build: TWITTER_TOKEN / OPENNEWS_TOKEN not configured."
fi

run_optional_step "GitHub trending build" "$PYTHON_BIN" "$PROJECT_DIR/scripts/build_github_trending.py"
run_optional_step "YouTube watchlist build" "$PYTHON_BIN" "$PROJECT_DIR/scripts/build_yt_watchlist.py"

if [ "${SKIP_DEPLOY:-0}" = "1" ]; then
  echo "Skip deploy: SKIP_DEPLOY=1"
  exit 0
fi

WRANGLER_BIN="$(resolve_wrangler)"
if [ -z "$WRANGLER_BIN" ]; then
  echo "Wrangler not found." >&2
  exit 1
fi

"$WRANGLER_BIN" pages deploy "$PROJECT_DIR" --project-name cyrus-ai-notes --commit-dirty=true
