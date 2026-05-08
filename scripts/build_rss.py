#!/usr/bin/env python3
"""Build RSS 2.0 feed from field-notes articles.

Scans field-notes/*/index.html, extracts metadata from <meta> and <title> tags,
and generates a valid RSS 2.0 feed at feed.xml in the project root.

Stdlib only — no pip dependencies required.
"""

import glob
import os
import re
from datetime import datetime, timezone, timedelta
from html import escape as html_escape

# ── Config ──────────────────────────────────────────────────────────────────

SITE_URL = "https://cyrustyj.xyz"
FEED_TITLE = "Cyrus Field Notes"
FEED_DESC = "AI 全栈实践者 Cyrus 的田野笔记"
FEED_LANG = "zh-CN"
TITLE_SUFFIX = " | 实验室 · Cyrus的AI学习笔记"

# Paths (relative to project root)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIELD_NOTES_DIR = os.path.join(PROJECT_ROOT, "field-notes")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "feed.xml")

# Beijing time offset
TZ_BEIJING = timezone(timedelta(hours=8))


# ── Helpers ─────────────────────────────────────────────────────────────────

def extract_meta(html: str, attr: str, attr_value: str) -> str | None:
    """Extract content attribute from a <meta> tag matching attr=attr_value."""
    # Handles both name="..." and property="..." attributes
    pattern = rf'<meta\s+[^>]*?{re.escape(attr)}="{re.escape(attr_value)}"[^>]*?content="([^"]*)"'
    m = re.search(pattern, html, re.IGNORECASE)
    if m:
        return m.group(1)
    # Also try reversed attribute order: content before name/property
    pattern2 = rf'<meta\s+[^>]*?content="([^"]*)"[^>]*?{re.escape(attr)}="{re.escape(attr_value)}"'
    m2 = re.search(pattern2, html, re.IGNORECASE)
    if m2:
        return m2.group(1)
    return None


def extract_title(html: str) -> str | None:
    """Extract text from <title> tag."""
    m = re.search(r"<title>([^<]+)</title>", html, re.IGNORECASE)
    if m:
        title = m.group(1).strip()
        # Strip site-wide suffix
        if title.endswith(TITLE_SUFFIX):
            title = title[: -len(TITLE_SUFFIX)].strip()
        return title
    return None


def iso_to_rfc822(iso_str: str) -> str:
    """Convert ISO 8601 date string to RFC 822 format for RSS.

    Example: '2026-05-08T00:00:00+08:00' -> 'Fri, 08 May 2026 00:00:00 +0800'
    """
    # Parse ISO 8601 with timezone
    # Handle +08:00 format
    iso_str = iso_str.strip()
    if iso_str.endswith("Z"):
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    else:
        dt = datetime.fromisoformat(iso_str)
    # Format as RFC 822
    return dt.strftime("%a, %d %b %Y %H:%M:%S %z")


def scan_articles() -> list[dict]:
    """Scan field-notes subdirectories and extract article metadata."""
    articles = []
    pattern = os.path.join(FIELD_NOTES_DIR, "*", "index.html")

    for filepath in sorted(glob.glob(pattern)):
        rel = os.path.relpath(filepath, FIELD_NOTES_DIR)
        slug = os.path.dirname(rel)

        # Skip template and listing page
        if slug.startswith("_"):
            print(f"  skip: {slug}/ (template)")
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            html = f.read()

        title = extract_title(html)
        if not title:
            print(f"  WARN: {slug}/ — missing <title>, skipped")
            continue

        description = extract_meta(html, "name", "description")
        if not description:
            print(f"  WARN: {slug}/ — missing meta description, skipped")
            continue

        pub_time = extract_meta(html, "property", "article:published_time")
        if not pub_time:
            print(f"  WARN: {slug}/ — missing article:published_time, skipped")
            continue

        try:
            rfc_date = iso_to_rfc822(pub_time)
            dt = datetime.fromisoformat(pub_time.replace("Z", "+00:00"))
        except ValueError as e:
            print(f"  WARN: {slug}/ — bad date '{pub_time}': {e}, skipped")
            continue

        articles.append(
            {
                "title": title,
                "description": description,
                "link": f"{SITE_URL}/field-notes/{slug}/",
                "pub_date": rfc_date,
                "sort_key": dt,
                "slug": slug,
            }
        )
        print(f"  ok: {slug}/ — {title}")

    # Sort newest first
    articles.sort(key=lambda a: a["sort_key"], reverse=True)
    return articles


def build_feed(articles: list[dict]) -> None:
    """Generate RSS 2.0 XML and write to OUTPUT_FILE."""
    now = datetime.now(TZ_BEIJING)
    last_build = now.strftime("%a, %d %b %Y %H:%M:%S %z")

    items_xml = ""
    for a in articles:
        items_xml += f"""    <item>
      <title>{html_escape(a['title'])}</title>
      <link>{html_escape(a['link'])}</link>
      <description>{html_escape(a['description'])}</description>
      <pubDate>{a['pub_date']}</pubDate>
      <guid isPermaLink="true">{html_escape(a['link'])}</guid>
    </item>
"""

    feed = f"""<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{html_escape(FEED_TITLE)}</title>
    <link>{html_escape(SITE_URL)}</link>
    <description>{html_escape(FEED_DESC)}</description>
    <language>{FEED_LANG}</language>
    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>{last_build}</lastBuildDate>
{items_xml}  </channel>
</rss>
"""

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(feed)


# ── Main ────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Scanning {FIELD_NOTES_DIR}/ ...")
    articles = scan_articles()

    if not articles:
        print("\nNo articles found — feed.xml not generated.")
        return

    build_feed(articles)
    print(f"\nGenerated {OUTPUT_FILE}")
    print(f"  {len(articles)} item(s), newest: {articles[0]['title']}")


if __name__ == "__main__":
    main()
