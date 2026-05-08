#!/usr/bin/env python3
"""Build weekly AI news digest from data/news.json.

Generates:
  - weekly/YYYY-WNN.html  (the digest page for the current ISO week)
  - weekly/index.json      (listing of all weekly digests)

Uses only Python stdlib. Idempotent: running multiple times for the same week
overwrites the same file.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NEWS_FILE = ROOT / "data" / "news.json"
WEEKLY_DIR = ROOT / "weekly"
INDEX_JSON = WEEKLY_DIR / "index.json"

TOP_N = 10


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_dt(raw: str) -> datetime | None:
    """Parse an ISO datetime string into a UTC-aware datetime."""
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def iso_week_range(iso_year: int, iso_week: int) -> tuple[str, str]:
    """Return (start_date, end_date) strings for an ISO week (Mon-Sun)."""
    # Jan 4 is always in ISO week 1
    jan4 = datetime(iso_year, 1, 4)
    # Monday of week 1
    week1_monday = jan4 - timedelta(days=jan4.weekday())
    monday = week1_monday + timedelta(weeks=iso_week - 1)
    sunday = monday + timedelta(days=6)
    return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")


def escape_html(text: str) -> str:
    """Minimal HTML entity escaping."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


# ---------------------------------------------------------------------------
# HTML generation
# ---------------------------------------------------------------------------

def build_item_html(rank: int, item: dict) -> str:
    """Build HTML for a single ranked item."""
    title = escape_html(item.get("titleZh") or item.get("title") or "Untitled")
    url = escape_html(item.get("sourceUrl") or "#")
    platform = escape_html(item.get("platform") or "Unknown")
    score = int(item.get("aiScore", 0) or 0)
    summary = escape_html(item.get("summaryZh") or item.get("summary") or "")
    action = escape_html(item.get("action") or "")

    return f"""    <article class="weekly-item card fade-up" style="--stagger:{rank}">
      <div class="card-top">
        <div class="card-title-wrap">
          <span class="score-pill">{rank:02d}</span>
          <h3><a href="{url}" target="_blank" rel="noopener">{title}</a></h3>
        </div>
        <span class="score-pill" style="background:var(--ink);font-size:11px;">{score}</span>
      </div>
      <div class="meta-line">
        <span class="badge tag">{platform}</span>
      </div>
      <p>{summary}</p>
      {f'<div class="takeaway-box">{action}</div>' if action else ''}
    </article>"""


def build_digest_html(
    iso_year: int,
    iso_week: int,
    date_start: str,
    date_end: str,
    items: list[dict],
) -> str:
    """Build the full HTML page for a weekly digest."""
    week_label = f"W{iso_week:02d}"
    page_title = f"Cyrus Weekly #{iso_week}"
    items_html = "\n".join(
        build_item_html(i + 1, item) for i, item in enumerate(items)
    )

    return f"""<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{page_title} | Cyrus的AI学习笔记</title>
    <meta name="description" content="{page_title}：本周 AI 资讯 Top {len(items)}，附一句可执行结论。" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="https://cyrustyj.xyz/weekly/{iso_year}-{week_label}.html" />

    <meta property="og:type" content="article" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:site_name" content="Cyrus的AI学习笔记" />
    <meta property="og:title" content="{page_title}" />
    <meta property="og:description" content="本周 AI 资讯 Top {len(items)}，附一句可执行结论。" />
    <meta property="og:url" content="https://cyrustyj.xyz/weekly/{iso_year}-{week_label}.html" />
    <meta property="og:image" content="https://cyrustyj.xyz/og-cover.svg" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{page_title}" />
    <meta name="twitter:description" content="本周 AI 资讯 Top {len(items)}，附一句可执行结论。" />
    <meta name="twitter:image" content="https://cyrustyj.xyz/og-cover.svg" />

    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
    />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <nav class="site-nav">
      <a href="/" class="site-nav-brand">Cyrus</a>
      <div class="site-nav-links">
        <a href="/">首页</a>
        <a href="/about.html">关于</a>
        <a href="/field-notes/">实验室</a>
        <a href="/news.html">资讯</a>
        <button id="themeToggle" class="theme-toggle" aria-label="切换主题"></button>
      </div>
    </nav>

    <div class="mg-inner">

      <!-- Breadcrumb -->
      <nav class="mg-crumb">
        <a href="/">← CYRUS QUARTERLY</a>
        <span>/ <a href="/weekly/" style="color:inherit;text-decoration:none;">Weekly</a></span>
        <span>/ #{iso_week}</span>
      </nav>

      <!-- Page hero -->
      <section class="mg-page-hero">
        <div class="mg-tag-row">
          <span class="mg-tag">§ WEEKLY DIGEST</span>
          <span class="mg-tag">{iso_year}-{week_label}</span>
        </div>
        <h1 class="mg-page-title"><em>Cyrus Weekly</em> #{iso_week}</h1>
        <p class="mg-page-kicker">{date_start} &mdash; {date_end}<br>本周 AI 资讯 Top {len(items)}，附一句可执行结论。</p>
      </section>

      <!-- Top items -->
      <div class="mg-section-rule">&sect; TOP {len(items)}</div>
      <section class="weekly-grid">
{items_html}
      </section>

      <!-- Back link -->
      <div style="padding:40px 0 24px;text-align:center;">
        <a href="/weekly/" style="font-size:14px;color:var(--accent);text-decoration:none;">&larr; 所有周报</a>
      </div>

    </div><!-- /.mg-inner -->

    <footer class="site-footer">
      <span>&copy; 2026 Cyrus</span>
      <span>
        <a href="/about.html">关于</a> &middot;
        <a href="https://github.com/cyrus-tt" target="_blank" rel="noopener">GitHub</a> &middot;
        <a href="https://xhslink.com/m/AQ5LCxoWJeF" target="_blank" rel="noopener">小红书</a>
      </span>
    </footer>

    <script src="/ui.js"></script>
    <script src="/visit-stats.js"></script>
  </body>
</html>"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    # Load news data
    payload = json.loads(NEWS_FILE.read_text(encoding="utf-8"))
    all_items: list[dict] = payload.get("items", []) if isinstance(payload, dict) else payload

    # Determine current ISO week
    now = datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()

    # Compute the week date range
    date_start, date_end = iso_week_range(iso_year, iso_week)

    # Filter items from this ISO week (Mon-Sun)
    start_dt = datetime.strptime(date_start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_dt = datetime.strptime(date_end, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(
        hours=23, minutes=59, seconds=59
    )

    week_items = []
    for item in all_items:
        pub = parse_dt(item.get("publishedAt") or "")
        if pub is None:
            # Fall back to date field
            date_str = item.get("date", "")
            if date_str:
                pub = parse_dt(date_str + "T00:00:00+00:00")
        if pub is None:
            continue
        if start_dt <= pub <= end_dt:
            week_items.append(item)

    # Sort by aiScore descending, take top N
    week_items.sort(key=lambda x: int(x.get("aiScore", 0) or 0), reverse=True)
    top_items = week_items[:TOP_N]

    if not top_items:
        print(f"[weekly] No items found for {iso_year}-W{iso_week:02d} ({date_start} to {date_end})")
        print("[weekly] Falling back to top items from all available data")
        # Fall back: use whatever data we have
        fallback = sorted(all_items, key=lambda x: int(x.get("aiScore", 0) or 0), reverse=True)
        top_items = fallback[:TOP_N]
        if not top_items:
            print("[weekly] No data at all. Aborting.")
            return

    # Generate HTML
    WEEKLY_DIR.mkdir(parents=True, exist_ok=True)
    week_label = f"W{iso_week:02d}"
    filename = f"{iso_year}-{week_label}.html"
    html = build_digest_html(iso_year, iso_week, date_start, date_end, top_items)
    (WEEKLY_DIR / filename).write_text(html, encoding="utf-8")
    print(f"[weekly] Generated {WEEKLY_DIR / filename} ({len(top_items)} items)")

    # Update index.json
    index_data: list[dict] = []
    if INDEX_JSON.exists():
        try:
            index_data = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, ValueError):
            index_data = []

    # Upsert this week's entry
    week_key = f"{iso_year}-{week_label}"
    entry = {
        "week": week_key,
        "dateRange": f"{date_start} — {date_end}",
        "file": filename,
        "count": len(top_items),
    }
    # Remove existing entry for this week if present
    index_data = [e for e in index_data if e.get("week") != week_key]
    index_data.insert(0, entry)
    # Sort newest first
    index_data.sort(key=lambda x: x.get("week", ""), reverse=True)

    INDEX_JSON.write_text(
        json.dumps(index_data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[weekly] Updated {INDEX_JSON} ({len(index_data)} issues)")


if __name__ == "__main__":
    main()
