#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_SCRIPT="$PROJECT_DIR/scripts/run_news_update.sh"
DEFAULT_LOG_FILE="${HOME:-/tmp}/Library/Logs/cyrus-ai-news-cron.log"
LOG_FILE="${NEWS_CRON_LOG_FILE:-$DEFAULT_LOG_FILE}"
SCHEDULE="${NEWS_CRON_SCHEDULE:-0 9,21 * * *}"

if [ ! -x "$RUN_SCRIPT" ]; then
  echo "run script not executable: $RUN_SCRIPT" >&2
  exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

cron_entry="$SCHEDULE NEWS_CRON_LOG_FILE=\"$LOG_FILE\" /bin/bash \"$RUN_SCRIPT\""

current_crontab="$(crontab -l 2>/dev/null || true)"
filtered_crontab="$(
  printf '%s\n' "$current_crontab" | awk '
    /run_news_update\.sh/ {next}
    /news-cron\.log/ {next}
    /cyrus-ai-news-cron\.log/ {next}
    {print}
  '
)"

if [ -n "$filtered_crontab" ]; then
  new_crontab="$(printf '%s\n%s\n' "$filtered_crontab" "$cron_entry")"
else
  new_crontab="$cron_entry"
fi

printf '%s\n' "$new_crontab" | crontab -

echo "Installed news cron:"
echo "$cron_entry"
echo "Log file: $LOG_FILE"
