#!/usr/bin/env python3
"""Build data/news.json by aggregating AI-related feeds.

This script is intentionally minimal and self-host friendly:
- Pulls from RSS/Atom sources configured in data/news_sources.json
- Filters and normalizes items
- Preserves original source links
- Produces a static JSON file consumed by the website
"""

from __future__ import annotations

import calendar
import datetime as dt
import html
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import feedparser
import requests

ROOT = Path(__file__).resolve().parent.parent
SOURCES_FILE = ROOT / "data" / "news_sources.json"
OUTPUT_FILE = ROOT / "data" / "news.json"

USER_AGENT = "Mozilla/5.0 (compatible; CyrusNewsBot/1.0; +https://cyrustyj.xyz)"
REQUEST_TIMEOUT = 20
MAX_ITEMS = 80
PER_SOURCE_LIMIT = 15

KEYWORDS = [
    "ai",
    "artificial intelligence",
    "generative",
    "llm",
    "agent",
    "gpt",
    "chatgpt",
    "claude",
    "gemini",
    "deepseek",
    "openai",
    "anthropic",
    "copilot",
    "mcp",
    "机器学习",
    "人工智能",
    "大模型",
    "智能体",
    "提示词",
    "生成式",
    "模型",
]

ACTION_RULES = [
    (
        ["agent", "workflow", "automation", "自动化", "流程", "mcp"],
        "把原文拆成流程步骤，先选一个环节做 1 次试跑。",
    ),
    (
        ["prompt", "提示词", "instruction"],
        "提取提示词结构，再改成你自己的业务场景。",
    ),
    (
        ["release", "发布", "更新", "模型", "model", "feature"],
        "记录新功能变化点，并用你的真实任务做一次前后对比。",
    ),
    (
        ["benchmark", "评测", "性能", "latency", "speed"],
        "关注与你场景最相关的指标，不只看总分。",
    ),
]

HTML_TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


def load_sources() -> list[dict[str, Any]]:
    return json.loads(SOURCES_FILE.read_text(encoding="utf-8"))


def strip_html(text: str) -> str:
    clean = HTML_TAG_RE.sub(" ", text or "")
    clean = html.unescape(clean)
    clean = SPACE_RE.sub(" ", clean).strip()
    return clean


def shorten(text: str, max_len: int = 140) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def entry_datetime(entry: Any) -> dt.datetime:
    for key in ("published_parsed", "updated_parsed", "created_parsed"):
        parsed = getattr(entry, key, None)
        if parsed:
            ts = calendar.timegm(parsed)
            return dt.datetime.fromtimestamp(ts, tz=dt.timezone.utc)
    return dt.datetime.now(tz=dt.timezone.utc)


def contains_keyword(text: str) -> bool:
    lower = text.lower()
    return any(keyword in lower for keyword in KEYWORDS)


def clean_url(url: str) -> str:
    if not url:
        return ""

    parsed = urlparse(url)
    safe_query = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        if key.lower().startswith("utm_"):
            continue
        if key.lower() in {"spm", "from", "source", "ref"}:
            continue
        safe_query.append((key, value))

    cleaned = parsed._replace(query=urlencode(safe_query), fragment="")
    return urlunparse(cleaned)


def infer_action(text: str) -> str:
    lower = text.lower()
    for keywords, action in ACTION_RULES:
        if any(keyword in lower for keyword in keywords):
            return action
    return "先点原文链接，记录一句结论和一个可执行动作。"


def normalize_item(source: dict[str, Any], entry: Any) -> dict[str, Any] | None:
    title = strip_html(getattr(entry, "title", ""))
    if not title:
        return None

    summary = strip_html(getattr(entry, "summary", "") or getattr(entry, "description", ""))
    link = clean_url(getattr(entry, "link", ""))
    if not link:
        return None

    text_for_filter = f"{title} {summary}"
    if source.get("keywords_only", False) and not contains_keyword(text_for_filter):
        return None

    published = entry_datetime(entry)
    action = infer_action(text_for_filter)

    return {
        "title": shorten(title, 120),
        "platform": source["platform"],
        "region": source["region"],
        "date": published.date().isoformat(),
        "summary": shorten(summary or title, 160),
        "action": action,
        "sourceUrl": link,
        "sourceName": source["name"],
        "publishedAt": published.isoformat(),
    }


def fetch_feed(source: dict[str, Any]) -> list[dict[str, Any]]:
    url = source["url"]
    headers = {"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"}

    try:
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"[WARN] failed {source['name']}: {exc}")
        return []

    parsed = feedparser.parse(response.content)
    if getattr(parsed, "bozo", False):
        # Keep parsing results when possible; just log warning.
        bozo_exc = getattr(parsed, "bozo_exception", None)
        if bozo_exc:
            print(f"[WARN] parse issue {source['name']}: {bozo_exc}")

    normalized: list[dict[str, Any]] = []
    for entry in parsed.entries[: PER_SOURCE_LIMIT * 3]:
        item = normalize_item(source, entry)
        if item:
            normalized.append(item)
            if len(normalized) >= PER_SOURCE_LIMIT:
                break

    return normalized


def dedupe_and_sort(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []

    for item in items:
        key = item["sourceUrl"] or item["title"]
        if key in seen:
            continue
        seen.add(key)
        out.append(item)

    out.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)
    return out[:MAX_ITEMS]


def build_news() -> dict[str, Any]:
    sources = load_sources()

    items: list[dict[str, Any]] = []
    for source in sources:
        items.extend(fetch_feed(source))

    merged = dedupe_and_sort(items)
    now = dt.datetime.now(tz=dt.timezone.utc)

    return {
        "generatedAt": now.isoformat(),
        "timezone": "UTC",
        "total": len(merged),
        "items": merged,
    }


def main() -> None:
    payload = build_news()
    OUTPUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] wrote {OUTPUT_FILE} with {payload['total']} items")


if __name__ == "__main__":
    main()
