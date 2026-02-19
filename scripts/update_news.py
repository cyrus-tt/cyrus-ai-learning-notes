#!/usr/bin/env python3
"""Build data/news.json by aggregating AI-related feeds.

Capabilities:
- Pull RSS/Atom sources from data/news_sources.json
- Keep original source URL for each item
- Tag each item with AI industry stage (upstream/midstream/downstream)
- Tag each item with content labels
- For overseas items, generate zh translation to support EN/ZH toggle in UI
- Optionally persist each fetch run into Cloudflare D1
"""

from __future__ import annotations

import calendar
import datetime as dt
import html
import json
import os
import re
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import feedparser
import requests
from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parent.parent
SOURCES_FILE = ROOT / "data" / "news_sources.json"
OUTPUT_FILE = ROOT / "data" / "news.json"
TRANSLATION_CACHE_FILE = ROOT / "data" / "translation_cache.json"

USER_AGENT = "Mozilla/5.0 (compatible; CyrusNewsBot/1.0; +https://cyrustyj.xyz)"
REQUEST_TIMEOUT = 20
MAX_ITEMS = 80
PER_SOURCE_LIMIT = 15

DEFAULT_D1_DATABASE_NAME = "cyrus-ai-news"
D1_DATABASE_NAME_ENV = "D1_DATABASE_NAME"
D1_ENABLE_ENV = "ENABLE_D1_SYNC"
D1_REMOTE_ENV = "D1_REMOTE"

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

STAGE_RULES = {
    "上游": [
        "chip",
        "gpu",
        "nvidia",
        "amd",
        "semiconductor",
        "datacenter",
        "infrastructure",
        "infra",
        "算力",
        "芯片",
        "显卡",
        "数据中心",
        "硬件",
    ],
    "中游": [
        "model",
        "llm",
        "multimodal",
        "agent framework",
        "mcp",
        "sdk",
        "api",
        "training",
        "finetune",
        "benchmark",
        "eval",
        "foundation model",
        "模型",
        "大模型",
        "训练",
        "评测",
        "开源模型",
    ],
    "下游": [
        "application",
        "assistant",
        "productivity",
        "workflow",
        "marketing",
        "education",
        "healthcare",
        "sales",
        "customer service",
        "落地",
        "应用",
        "生产力",
        "场景",
        "企业服务",
        "内容创作",
        "自动化",
    ],
}

TAG_RULES = [
    ("芯片算力", ["chip", "gpu", "nvidia", "amd", "算力", "芯片", "显卡", "数据中心"]),
    ("模型进展", ["model", "llm", "foundation", "大模型", "模型", "多模态", "multimodal"]),
    ("Agent", ["agent", "智能体", "mcp", "workflow", "编排"]),
    ("开源生态", ["open source", "github", "开源", "repo"]),
    ("应用落地", ["application", "product", "落地", "应用", "企业服务"]),
    ("内容生产", ["content", "creator", "小红书", "图文", "视频", "口播"]),
    ("自动化", ["automation", "自动化", "pipeline", "workflow"]),
    ("投融资", ["funding", "investment", "融资", "估值", "投"]),
    ("安全治理", ["security", "privacy", "safety", "合规", "治理", "安全"]),
]

HTML_TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def load_sources() -> list[dict[str, Any]]:
    return json.loads(SOURCES_FILE.read_text(encoding="utf-8"))


def load_translation_cache() -> dict[str, str]:
    if not TRANSLATION_CACHE_FILE.exists():
        return {}
    try:
        return json.loads(TRANSLATION_CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_translation_cache(cache: dict[str, str]) -> None:
    TRANSLATION_CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


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


def infer_industry_stage(text: str) -> str:
    lower = text.lower()
    scores: dict[str, int] = {}
    for stage, keywords in STAGE_RULES.items():
        scores[stage] = sum(1 for kw in keywords if kw in lower)

    max_score = max(scores.values()) if scores else 0
    if max_score <= 0:
        return "中游"

    for stage in ["上游", "中游", "下游"]:
        if scores.get(stage, 0) == max_score:
            return stage

    return "中游"


def infer_content_tags(text: str) -> list[str]:
    lower = text.lower()
    tags: list[str] = []

    for tag, keywords in TAG_RULES:
        if any(keyword in lower for keyword in keywords):
            tags.append(tag)
        if len(tags) >= 3:
            break

    if not tags:
        tags = ["AI动态"]

    return tags


def has_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def translate_to_zh(text: str, translator: GoogleTranslator | None, cache: dict[str, str]) -> tuple[str, bool]:
    stripped = (text or "").strip()
    if not stripped:
        return "", False

    if has_cjk(stripped):
        return stripped, False

    key = f"zh::{stripped}"
    if key in cache:
        translated = cache[key]
        return translated, translated.strip() != stripped

    if translator is None:
        return stripped, False

    try:
        translated = translator.translate(stripped)
    except Exception:
        translated = stripped

    translated = (translated or stripped).strip()
    cache[key] = translated
    return translated, translated != stripped


def normalize_item(
    source: dict[str, Any],
    entry: Any,
    translator: GoogleTranslator | None,
    translation_cache: dict[str, str],
) -> dict[str, Any] | None:
    title_raw = strip_html(getattr(entry, "title", ""))
    if not title_raw:
        return None

    summary_raw = strip_html(getattr(entry, "summary", "") or getattr(entry, "description", ""))
    link = clean_url(getattr(entry, "link", ""))
    if not link:
        return None

    text_for_filter = f"{title_raw} {summary_raw}"
    if source.get("keywords_only", False) and not contains_keyword(text_for_filter):
        return None

    published = entry_datetime(entry)
    action = infer_action(text_for_filter)
    stage = infer_industry_stage(text_for_filter)
    tags = infer_content_tags(text_for_filter)

    title_original = shorten(title_raw, 140)
    summary_original = shorten(summary_raw or title_raw, 190)

    if source["region"] == "海外":
        title_zh, title_changed = translate_to_zh(title_original, translator, translation_cache)
        summary_zh, summary_changed = translate_to_zh(summary_original, translator, translation_cache)
        has_translation = title_changed or summary_changed
    else:
        title_zh = title_original
        summary_zh = summary_original
        has_translation = False

    return {
        "title": title_zh,
        "summary": summary_zh,
        "titleOriginal": title_original,
        "summaryOriginal": summary_original,
        "titleZh": title_zh,
        "summaryZh": summary_zh,
        "hasTranslation": has_translation,
        "platform": source["platform"],
        "region": source["region"],
        "industryStage": stage,
        "contentTags": tags,
        "date": published.date().isoformat(),
        "action": action,
        "sourceUrl": link,
        "sourceName": source["name"],
        "publishedAt": published.isoformat(),
    }


def fetch_feed(
    source: dict[str, Any],
    translator: GoogleTranslator | None,
    translation_cache: dict[str, str],
) -> list[dict[str, Any]]:
    url = source["url"]
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    }

    try:
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"[WARN] failed {source['name']}: {exc}")
        return []

    parsed = feedparser.parse(response.content)
    if getattr(parsed, "bozo", False):
        bozo_exc = getattr(parsed, "bozo_exception", None)
        if bozo_exc:
            print(f"[WARN] parse issue {source['name']}: {bozo_exc}")

    normalized: list[dict[str, Any]] = []
    for entry in parsed.entries[: PER_SOURCE_LIMIT * 3]:
        item = normalize_item(source, entry, translator, translation_cache)
        if item:
            normalized.append(item)
            if len(normalized) >= PER_SOURCE_LIMIT:
                break

    return normalized


def dedupe_and_sort(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []

    for item in items:
        key = item["sourceUrl"] or item["titleOriginal"]
        if key in seen:
            continue
        seen.add(key)
        out.append(item)

    out.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)
    return out[:MAX_ITEMS]


def build_news() -> tuple[dict[str, Any], dict[str, str]]:
    sources = load_sources()
    translation_cache = load_translation_cache()

    translator: GoogleTranslator | None
    try:
        translator = GoogleTranslator(source="auto", target="zh-CN")
    except Exception:
        translator = None

    items: list[dict[str, Any]] = []
    for source in sources:
        items.extend(fetch_feed(source, translator, translation_cache))

    merged = dedupe_and_sort(items)
    now = dt.datetime.now(tz=dt.timezone.utc)

    payload = {
        "generatedAt": now.isoformat(),
        "timezone": "UTC",
        "total": len(merged),
        "items": merged,
    }
    return payload, translation_cache


def sql_text(value: Any) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def sql_int(value: Any) -> str:
    return str(int(bool(value)))


def build_d1_sync_sql(
    payload: dict[str, Any],
    run_id: str,
    started_at: dt.datetime,
    finished_at: dt.datetime,
) -> str:
    items = payload.get("items", [])
    started_iso = started_at.isoformat()
    finished_iso = finished_at.isoformat()

    lines = [
        "PRAGMA foreign_keys = ON;",
        (
            "INSERT INTO fetch_runs (run_id, started_at, finished_at, item_count, status, message) VALUES "
            f"({sql_text(run_id)}, {sql_text(started_iso)}, {sql_text(finished_iso)}, {int(payload.get('total', 0))}, "
            f"{sql_text('success')}, {sql_text('auto-sync')});"
        ),
    ]

    for item in items:
        source_url = item.get("sourceUrl", "") or ""
        source_name = item.get("sourceName", "") or ""
        platform = item.get("platform", "") or ""
        region = item.get("region", "") or ""
        stage = item.get("industryStage", "中游") or "中游"
        title_original = item.get("titleOriginal", "") or ""
        title_zh = item.get("titleZh", item.get("title", "")) or ""
        summary_original = item.get("summaryOriginal", "") or ""
        summary_zh = item.get("summaryZh", item.get("summary", "")) or ""
        has_translation = item.get("hasTranslation", False)
        action = item.get("action", "") or ""
        published_at = item.get("publishedAt", "") or ""
        date_text = item.get("date", "") or ""
        content_tags_json = json.dumps(item.get("contentTags", []), ensure_ascii=False)

        lines.append(
            "INSERT INTO news_snapshots (run_id, source_url, source_name, platform, region, industry_stage, "
            "title_original, title_zh, summary_original, summary_zh, has_translation, action, published_at, date, "
            "content_tags_json, captured_at) VALUES "
            f"({sql_text(run_id)}, {sql_text(source_url)}, {sql_text(source_name)}, {sql_text(platform)}, "
            f"{sql_text(region)}, {sql_text(stage)}, {sql_text(title_original)}, {sql_text(title_zh)}, "
            f"{sql_text(summary_original)}, {sql_text(summary_zh)}, {sql_int(has_translation)}, {sql_text(action)}, "
            f"{sql_text(published_at)}, {sql_text(date_text)}, {sql_text(content_tags_json)}, {sql_text(finished_iso)});"
        )

        lines.append(
            "INSERT INTO latest_news (source_url, source_name, platform, region, industry_stage, title_original, title_zh, "
            "summary_original, summary_zh, has_translation, action, published_at, date, content_tags_json, updated_at) VALUES "
            f"({sql_text(source_url)}, {sql_text(source_name)}, {sql_text(platform)}, {sql_text(region)}, "
            f"{sql_text(stage)}, {sql_text(title_original)}, {sql_text(title_zh)}, {sql_text(summary_original)}, "
            f"{sql_text(summary_zh)}, {sql_int(has_translation)}, {sql_text(action)}, {sql_text(published_at)}, "
            f"{sql_text(date_text)}, {sql_text(content_tags_json)}, {sql_text(finished_iso)}) "
            "ON CONFLICT(source_url) DO UPDATE SET "
            "source_name=excluded.source_name, "
            "platform=excluded.platform, "
            "region=excluded.region, "
            "industry_stage=excluded.industry_stage, "
            "title_original=excluded.title_original, "
            "title_zh=excluded.title_zh, "
            "summary_original=excluded.summary_original, "
            "summary_zh=excluded.summary_zh, "
            "has_translation=excluded.has_translation, "
            "action=excluded.action, "
            "published_at=excluded.published_at, "
            "date=excluded.date, "
            "content_tags_json=excluded.content_tags_json, "
            "updated_at=excluded.updated_at;"
        )

    return "\n".join(lines) + "\n"


def sync_to_d1(payload: dict[str, Any], started_at: dt.datetime, finished_at: dt.datetime) -> None:
    enabled_raw = os.getenv(D1_ENABLE_ENV, "1").strip().lower()
    if enabled_raw in {"0", "false", "no", "off"}:
        print("[INFO] D1 sync disabled by env")
        return

    db_name = os.getenv(D1_DATABASE_NAME_ENV, DEFAULT_D1_DATABASE_NAME).strip()
    if not db_name:
        print("[WARN] empty D1 database name, skip sync")
        return

    run_id = f"run_{finished_at.strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex[:8]}"
    sql_script = build_d1_sync_sql(payload, run_id, started_at, finished_at)
    temp_file: Path | None = None

    try:
        with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", suffix=".sql") as tmp:
            tmp.write(sql_script)
            temp_file = Path(tmp.name)

        cmd = ["wrangler", "d1", "execute", db_name]
        remote_raw = os.getenv(D1_REMOTE_ENV, "1").strip().lower()
        if remote_raw not in {"0", "false", "no", "off"}:
            cmd.append("--remote")
        cmd.extend(["--file", str(temp_file)])

        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"[OK] D1 synced run={run_id} items={payload.get('total', 0)} db={db_name}")
    except FileNotFoundError:
        print("[WARN] wrangler not found, skip D1 sync")
    except subprocess.CalledProcessError as exc:
        details = (exc.stderr or "").strip() or (exc.stdout or "").strip() or str(exc)
        print(f"[WARN] D1 sync failed: {details}")
    finally:
        if temp_file and temp_file.exists():
            temp_file.unlink()


def main() -> None:
    started_at = dt.datetime.now(tz=dt.timezone.utc)
    payload, translation_cache = build_news()
    finished_at = dt.datetime.now(tz=dt.timezone.utc)
    payload["generatedAt"] = finished_at.isoformat()

    OUTPUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    save_translation_cache(translation_cache)
    print(f"[OK] wrote {OUTPUT_FILE} with {payload['total']} items")
    sync_to_d1(payload, started_at, finished_at)


if __name__ == "__main__":
    main()
