#!/bin/bash
# Smoke test: verify core endpoints return 200 after deployment.
# Usage: ./scripts/smoke-test.sh [base_url]

BASE="${1:-https://cyrustyj.xyz}"
FAIL=0

check() {
  local url="$1"
  local label="$2"
  local status
  # -L: Pages 开了 clean URL，*.html 会 308 跳转，必须跟随到最终页面
  status=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 15 \
    -H "User-Agent: CyrusSmokeTest/1.0" "$url")
  if [ "$status" = "200" ]; then
    echo "  ✓ $label ($status)"
  elif [ "$status" = "000" ]; then
    echo "  ✗ $label — connection failed (check network/DNS)"
    FAIL=1
  else
    echo "  ✗ $label — got $status"
    FAIL=1
  fi
}

echo "Smoke test: $BASE"
check "$BASE/"                    "Homepage"
check "$BASE/news.html"           "News page"
check "$BASE/field-notes/"        "Field Notes"
check "$BASE/api/news"            "News API"
check "$BASE/data/knowledge.json" "Knowledge JSON"
check "$BASE/feed.xml"            "RSS Feed"
check "$BASE/sitemap.xml"         "Sitemap"

if [ "$FAIL" -eq 1 ]; then
  echo "FAIL: some endpoints returned non-200"
  exit 1
fi
echo "All endpoints OK"
