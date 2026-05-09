#!/usr/bin/env python3
"""
build_knowledge.py — Extract site content into data/knowledge.json
for use as AI chatbot context.

Run from project root:
    python scripts/build_knowledge.py

Uses only Python stdlib (re, os, json, html, datetime, glob).
"""

import os
import re
import json
import html
import glob
from datetime import datetime, timezone

# ── Paths (relative to project root) ──────────────────────────────────

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIELD_NOTES_DIR = os.path.join(ROOT, "field-notes")
TIL_ENTRIES = os.path.join(ROOT, "til", "entries.json")
ABOUT_HTML = os.path.join(ROOT, "about.html")
CONSULTING_HTML = os.path.join(ROOT, "consulting.html")
OUTPUT = os.path.join(ROOT, "data", "knowledge.json")

MAX_ARTICLE_CHARS = 2000


# ── Utilities ─────────────────────────────────────────────────────────

def strip_tags(raw_html: str) -> str:
    """Remove HTML tags, decode entities, collapse whitespace."""
    text = re.sub(r"<script[^>]*>.*?</script>", "", raw_html, flags=re.S)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_tag(content: str, tag: str) -> str:
    """Extract text inside <tag>...</tag>."""
    m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", content, re.S)
    return m.group(1).strip() if m else ""


def extract_meta(content: str, name: str) -> str:
    """Extract content= from <meta name="..." content="...">."""
    m = re.search(
        rf'<meta\s+name="{name}"\s+content="([^"]*)"',
        content, re.S,
    )
    return html.unescape(m.group(1).strip()) if m else ""


def extract_between(content: str, start_re: str, end_re: str) -> str:
    """Extract HTML between two regex patterns."""
    m = re.search(start_re + r"(.*?)" + end_re, content, re.S)
    return m.group(1) if m else ""


def read_file(path: str) -> str | None:
    """Read a file, return None with warning if missing."""
    if not os.path.isfile(path):
        print(f"  [WARN] File not found, skipping: {path}")
        return None
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# ── Extractors ────────────────────────────────────────────────────────

def extract_field_notes() -> list[dict]:
    """Scan field-notes/*/index.html for tutorial articles."""
    articles = []
    pattern = os.path.join(FIELD_NOTES_DIR, "*", "index.html")
    paths = sorted(glob.glob(pattern))

    if not paths:
        print("  [WARN] No field-notes articles found")
        return articles

    for path in paths:
        slug = os.path.basename(os.path.dirname(path))
        content = read_file(path)
        if content is None:
            continue

        title = extract_tag(content, "title")
        # Clean up " | ..." suffix from title
        title = re.sub(r"\s*\|.*$", "", title)

        description = extract_meta(content, "description")

        # Extract article body
        body_html = extract_between(
            content,
            r'<article\s+class="article-body"[^>]*>',
            r"</article>",
        )
        body_text = strip_tags(body_html) if body_html else ""
        if len(body_text) > MAX_ARTICLE_CHARS:
            body_text = body_text[:MAX_ARTICLE_CHARS].rsplit(" ", 1)[0] + "..."

        articles.append({
            "type": "tutorial",
            "title": title,
            "url": f"/field-notes/{slug}/",
            "summary": description,
            "content": body_text,
        })
        print(f"  [OK] field-notes/{slug} — {len(body_text)} chars")

    return articles


def extract_til() -> list[dict]:
    """Read til/entries.json as-is."""
    content = read_file(TIL_ENTRIES)
    if content is None:
        return []
    try:
        entries = json.loads(content)
        print(f"  [OK] TIL — {len(entries)} entries")
        return entries
    except json.JSONDecodeError as e:
        print(f"  [WARN] Failed to parse TIL entries: {e}")
        return []


def extract_persona() -> dict:
    """Extract persona info from about.html."""
    content = read_file(ABOUT_HTML)
    if content is None:
        return {}

    # Timeline text
    timeline_html = extract_between(
        content,
        r'<ol\s+class="about-timeline">',
        r"</ol>",
    )
    timeline_text = strip_tags(timeline_html) if timeline_html else ""

    # Project names
    projects = re.findall(
        r'<article\s+class="about-project-card">\s*'
        r'<div[^>]*>[^<]*</div>\s*'
        r'<h3>(.*?)</h3>\s*'
        r'<p>(.*?)</p>',
        content, re.S,
    )
    project_names = [p[0].strip() for p in projects]
    project_descriptions = {
        p[0].strip(): strip_tags(p[1]).strip() for p in projects
    }

    # Quote
    quote_match = re.search(r"<blockquote>(.*?)</blockquote>", content, re.S)
    quote = strip_tags(quote_match.group(1)) if quote_match else ""

    persona = {
        "name": "Cyrus",
        "tagline": "AI 全栈实践者，用 AI 把想法变成产品的人",
        "background": timeline_text,
        "projects": project_names,
        "projectDetails": project_descriptions,
        "quote": quote,
        "social": {
            "xiaohongshu": "https://xhslink.com/m/AQ5LCxoWJeF",
            "github": "https://github.com/cyrus-tt",
        },
    }
    print(f"  [OK] Persona — {len(project_names)} projects")
    return persona


def extract_services() -> dict:
    """Extract service descriptions from consulting.html."""
    content = read_file(CONSULTING_HTML)
    if content is None:
        return {}

    # Service cards
    cards = re.findall(
        r'<article\s+class="consulting-card">\s*'
        r'<div[^>]*>[^<]*</div>\s*'
        r'<h3>(.*?)</h3>\s*'
        r'<p>(.*?)</p>',
        content, re.S,
    )
    offerings = [strip_tags(c[0]) for c in cards]
    offering_details = {
        strip_tags(c[0]): strip_tags(c[1]) for c in cards
    }

    # Audience items
    audience_items = re.findall(r"<li>(.*?)</li>", content, re.S)
    audience = [strip_tags(item) for item in audience_items]

    # Tagline
    tagline = ""
    m = re.search(r'class="consulting-hero-desc">(.*?)</p>', content, re.S)
    if m:
        tagline = strip_tags(m.group(1))

    services = {
        "description": "AI 自动化顾问",
        "tagline": tagline,
        "offerings": offerings,
        "offeringDetails": offering_details,
        "audience": audience,
        "contact": "cyrusttyj2@gmail.com",
    }
    print(f"  [OK] Services — {len(offerings)} offerings")
    return services


# ── Main ──────────────────────────────────────────────────────────────

def main():
    print("Building knowledge base...\n")

    print("[1/4] Field Notes (tutorials)")
    articles = extract_field_notes()

    print("\n[2/4] TIL entries")
    til = extract_til()

    print("\n[3/4] Persona (about page)")
    persona = extract_persona()

    print("\n[4/4] Services (consulting page)")
    services = extract_services()

    knowledge = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "persona": persona,
        "articles": articles,
        "til": til,
        "services": services,
    }

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(knowledge, f, ensure_ascii=False, indent=2)

    total_size = os.path.getsize(OUTPUT)
    print(f"\nDone! Written to {OUTPUT}")
    print(f"  Size: {total_size:,} bytes")
    print(f"  Articles: {len(articles)}")
    print(f"  TIL entries: {len(til)}")


if __name__ == "__main__":
    main()
