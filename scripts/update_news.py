#!/usr/bin/env python3
"""Build data/news.json by aggregating AI-related feeds.

Capabilities:
- Pull RSS/Atom sources from data/news_sources.json
- Keep original source URL for each item
- Tag each item with AI industry stage (upstream/midstream/downstream)
- Tag each item with content labels
- For overseas items, generate zh translation to support EN/ZH toggle in UI
- Score each item with a deterministic AI score (0-100)
- Build daily/weekly digest data for newsroom notifications
- Optionally persist each fetch run into Cloudflare D1
"""

from __future__ import annotations

import calendar
import datetime as dt
import html
import json
import math
import os
import re
import subprocess
import tempfile
import uuid
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from zoneinfo import ZoneInfo

import feedparser
import requests
from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parent.parent
SOURCES_FILE = ROOT / "data" / "news_sources.json"
OUTPUT_FILE = ROOT / "data" / "news.json"
DIGEST_OUTPUT_FILE = ROOT / "data" / "news_digest.json"
DIGEST_RULES_FILE = ROOT / "data" / "digest_scoring_rules.json"
TRANSLATION_CACHE_FILE = ROOT / "data" / "translation_cache.json"

USER_AGENT = "Mozilla/5.0 (compatible; CyrusNewsBot/1.0; +https://cyrustyj.xyz)"
REQUEST_TIMEOUT = 20
MAX_ITEMS = 80
PER_SOURCE_LIMIT = 15

DEFAULT_D1_DATABASE_NAME = "cyrus-ai-news"
D1_DATABASE_NAME_ENV = "D1_DATABASE_NAME"
D1_ENABLE_ENV = "ENABLE_D1_SYNC"
D1_REMOTE_ENV = "D1_REMOTE"

SHANGHAI_TZ = ZoneInfo("Asia/Shanghai")

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

DEFAULT_ACTION_FALLBACK = "先点原文链接，记录一句结论和一个可执行动作。"

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

DEFAULT_DIGEST_RULES: dict[str, Any] = {
    "timezone": "Asia/Shanghai",
    "historyDays": 90,
    "topN": 10,
    "weights": {
        "recency": 35,
        "authority": 25,
        "topic": 20,
        "actionability": 10,
        "heat": 10,
    },
    "recencyBuckets": [
        {"maxHours": 6, "score": 35},
        {"maxHours": 24, "score": 28},
        {"maxHours": 48, "score": 20},
        {"maxHours": 72, "score": 12},
        {"maxHours": None, "score": 6},
    ],
    "authority": {
        "tierScores": {"A": 25, "B": 18, "default": 12},
        "tiers": {
            "A": [
                "OpenAI",
                "Google AI Blog",
                "Hugging Face",
                "TechCrunch",
                "The Verge",
                "36氪",
                "机器之心",
                "量子位",
            ],
            "B": ["Hacker News", "Reddit", "爱范儿", "少数派"],
        },
    },
    "topicTagScores": {
        "芯片算力": 11,
        "模型进展": 10,
        "Agent": 10,
        "开源生态": 8,
        "应用落地": 9,
        "内容生产": 6,
        "自动化": 7,
        "投融资": 6,
        "安全治理": 8,
        "AI动态": 5,
    },
    "topicTopCount": 2,
    "topicScoreCap": 20,
    "actionability": {
        "fallbackScore": 4,
        "normalScore": 7,
        "strongScore": 10,
        "strongMinLength": 20,
        "fallbackActions": [DEFAULT_ACTION_FALLBACK],
    },
    "heat": {
        "defaultScore": 5,
        "pointsWeight": 1.0,
        "commentsWeight": 1.5,
        "referenceValue": 500,
    },
}

HTML_TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")
POINTS_RE = re.compile(r"points?\s*[:：]\s*(\d+)", re.IGNORECASE)
COMMENTS_RE = re.compile(r"comments?\s*[:：]\s*(\d+)", re.IGNORECASE)
CN_POINTS_RE = re.compile(r"积分\s*[:：]?\s*(\d+)")
CN_COMMENTS_RE = re.compile(r"评论\s*[:：]?\s*(\d+)")


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


def load_digest_rules() -> dict[str, Any]:
    rules = deep_copy(DEFAULT_DIGEST_RULES)
    if not DIGEST_RULES_FILE.exists():
        return rules

    try:
        custom_rules = json.loads(DIGEST_RULES_FILE.read_text(encoding="utf-8"))
    except Exception:
        return rules

    if not isinstance(custom_rules, dict):
        return rules

    return deep_merge_dict(rules, custom_rules)


def deep_copy(value: Any) -> Any:
    return json.loads(json.dumps(value, ensure_ascii=False))


def deep_merge_dict(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge_dict(merged[key], value)
        else:
            merged[key] = value
    return merged


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


def parse_datetime(value: Any) -> dt.datetime:
    raw = str(value or "").strip()
    if not raw:
        return dt.datetime.now(tz=dt.timezone.utc)

    normalized = raw.replace("Z", "+00:00")
    try:
        parsed = dt.datetime.fromisoformat(normalized)
    except Exception:
        return dt.datetime.now(tz=dt.timezone.utc)

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


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
    return DEFAULT_ACTION_FALLBACK


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


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def compute_recency_score(item: dict[str, Any], generated_at: dt.datetime, rules: dict[str, Any]) -> int:
    max_score = int(rules.get("weights", {}).get("recency", 35))
    buckets = rules.get("recencyBuckets", [])
    published_at = parse_datetime(item.get("publishedAt")).astimezone(SHANGHAI_TZ)
    generated_bj = generated_at.astimezone(SHANGHAI_TZ)
    delta_hours = max((generated_bj - published_at).total_seconds() / 3600, 0)

    for bucket in buckets:
        max_hours = bucket.get("maxHours")
        score = int(bucket.get("score", 0))
        if max_hours is None or delta_hours <= float(max_hours):
            return int(clamp(score, 0, max_score))

    return 0


def compute_authority_score(item: dict[str, Any], rules: dict[str, Any]) -> int:
    authority_rules = rules.get("authority", {})
    tier_scores = authority_rules.get("tierScores", {})
    tiers = authority_rules.get("tiers", {})

    platform = str(item.get("platform", "")).strip().lower()
    matched_tier = ""
    for tier_name, platforms in tiers.items():
        if not isinstance(platforms, list):
            continue
        lookup = {str(name).strip().lower() for name in platforms if str(name).strip()}
        if platform in lookup:
            matched_tier = str(tier_name)
            break

    if matched_tier:
        return int(tier_scores.get(matched_tier, tier_scores.get("default", 12)))

    return int(tier_scores.get("default", 12))


def compute_topic_score(item: dict[str, Any], rules: dict[str, Any]) -> int:
    tag_scores = rules.get("topicTagScores", {})
    tags = item.get("contentTags", []) if isinstance(item.get("contentTags"), list) else []
    candidates = [float(tag_scores.get(str(tag), 0)) for tag in tags]
    candidates.sort(reverse=True)

    top_count = max(int(rules.get("topicTopCount", 2)), 1)
    cap_score = float(rules.get("topicScoreCap", rules.get("weights", {}).get("topic", 20)))
    score = sum(candidates[:top_count])
    return int(clamp(round(score), 0, cap_score))


def compute_actionability_score(item: dict[str, Any], rules: dict[str, Any]) -> int:
    action_rules = rules.get("actionability", {})
    fallback_score = int(action_rules.get("fallbackScore", 4))
    normal_score = int(action_rules.get("normalScore", 7))
    strong_score = int(action_rules.get("strongScore", 10))
    strong_min_length = int(action_rules.get("strongMinLength", 20))

    fallback_actions = {
        str(text).strip()
        for text in action_rules.get("fallbackActions", [])
        if str(text).strip()
    }

    action = str(item.get("action", "")).strip()
    if not action or action in fallback_actions:
        return fallback_score
    if len(action) >= strong_min_length:
        return strong_score
    return normal_score


def extract_points_and_comments(text: str) -> tuple[int | None, int | None]:
    points = None
    comments = None

    points_match = POINTS_RE.search(text) or CN_POINTS_RE.search(text)
    comments_match = COMMENTS_RE.search(text) or CN_COMMENTS_RE.search(text)

    if points_match:
        points = int(points_match.group(1))
    if comments_match:
        comments = int(comments_match.group(1))

    return points, comments


def compute_heat_score(item: dict[str, Any], rules: dict[str, Any]) -> int:
    heat_rules = rules.get("heat", {})
    default_score = int(heat_rules.get("defaultScore", 5))
    points_weight = float(heat_rules.get("pointsWeight", 1.0))
    comments_weight = float(heat_rules.get("commentsWeight", 1.5))
    reference_value = max(float(heat_rules.get("referenceValue", 500)), 1.0)
    max_score = int(rules.get("weights", {}).get("heat", 10))

    candidates = [
        str(item.get("summaryOriginal", "")),
        str(item.get("summaryZh", "")),
        str(item.get("summary", "")),
    ]

    parsed_points = None
    parsed_comments = None
    for text in candidates:
        points, comments = extract_points_and_comments(text)
        if points is not None:
            parsed_points = points
        if comments is not None:
            parsed_comments = comments
        if parsed_points is not None and parsed_comments is not None:
            break

    if parsed_points is None and parsed_comments is None:
        return int(clamp(default_score, 0, max_score))

    points_value = max(parsed_points or 0, 0)
    comments_value = max(parsed_comments or 0, 0)

    weighted = points_value * points_weight + comments_value * comments_weight
    normalized = math.log1p(max(weighted, 0.0)) / math.log1p(reference_value)
    score = round(clamp(normalized, 0, 1) * max_score)
    return int(clamp(score, 0, max_score))


def apply_ai_scores(items: list[dict[str, Any]], generated_at: dt.datetime, rules: dict[str, Any]) -> None:
    weights = rules.get("weights", {})
    max_total = int(sum(float(value) for value in weights.values()))

    for item in items:
        recency = compute_recency_score(item, generated_at, rules)
        authority = compute_authority_score(item, rules)
        topic = compute_topic_score(item, rules)
        actionability = compute_actionability_score(item, rules)
        heat = compute_heat_score(item, rules)

        total = int(round(recency + authority + topic + actionability + heat))
        total = int(clamp(total, 0, max_total if max_total > 0 else 100))

        item["aiScore"] = total
        item["aiScoreBreakdown"] = {
            "recency": recency,
            "authority": authority,
            "topic": topic,
            "actionability": actionability,
            "heat": heat,
        }


def sort_top_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def key(item: dict[str, Any]) -> tuple[int, float, str]:
        score = int(item.get("aiScore", 0) or 0)
        ts = parse_datetime(item.get("publishedAt", "")).timestamp()
        source_url = str(item.get("sourceUrl", "") or "")
        return (-score, -ts, source_url)

    return sorted(items, key=key)


def top_platforms(items: list[dict[str, Any]], limit: int = 5) -> list[dict[str, Any]]:
    counter = Counter(str(item.get("platform", "未知平台")) for item in items if item.get("platform"))
    return [{"name": name, "count": count} for name, count in counter.most_common(limit)]


def top_topics(items: list[dict[str, Any]], limit: int = 8) -> list[dict[str, Any]]:
    counter: Counter[str] = Counter()
    for item in items:
        for tag in item.get("contentTags", []) if isinstance(item.get("contentTags"), list) else []:
            text = str(tag).strip()
            if text:
                counter[text] += 1
    return [{"name": name, "count": count} for name, count in counter.most_common(limit)]


def to_digest_item(item: dict[str, Any], rank: int) -> dict[str, Any]:
    return {
        "rank": rank,
        "title": item.get("titleZh") or item.get("title") or item.get("titleOriginal") or "",
        "platform": item.get("platform") or "",
        "aiScore": int(item.get("aiScore", 0) or 0),
        "publishedAt": item.get("publishedAt") or "",
        "sourceUrl": item.get("sourceUrl") or "",
        "sourceName": item.get("sourceName") or "",
        "industryStage": item.get("industryStage") or "",
        "contentTags": item.get("contentTags") if isinstance(item.get("contentTags"), list) else [],
        "summary": item.get("summaryZh") or item.get("summary") or "",
        "action": item.get("action") or DEFAULT_ACTION_FALLBACK,
        "aiScoreBreakdown": item.get("aiScoreBreakdown") if isinstance(item.get("aiScoreBreakdown"), dict) else {},
    }


def make_day_label(day: dt.date) -> str:
    return f"{day.month}月{day.day}日"


def week_meta(day: dt.date) -> tuple[str, str, dt.date, dt.date]:
    week_index = (day.day - 1) // 7 + 1
    week_key = f"{day.year}-{day.month:02d}-W{week_index}"
    week_label = f"{day.month}月第{week_index}周"
    start_day = (week_index - 1) * 7 + 1
    end_day = min(start_day + 6, calendar.monthrange(day.year, day.month)[1])
    start_date = dt.date(day.year, day.month, start_day)
    end_date = dt.date(day.year, day.month, end_day)
    return week_key, week_label, start_date, end_date


def ensure_daily_entry_shape(entry: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(entry, dict):
        return None

    raw_date = str(entry.get("date", "")).strip()
    if not raw_date:
        return None

    try:
        dt.date.fromisoformat(raw_date)
    except ValueError:
        return None

    return {
        "date": raw_date,
        "label": str(entry.get("label") or raw_date),
        "top10": entry.get("top10") if isinstance(entry.get("top10"), list) else [],
        "metrics": entry.get("metrics") if isinstance(entry.get("metrics"), dict) else {},
        "briefing": entry.get("briefing") if isinstance(entry.get("briefing"), list) else [],
    }


def build_current_day_entry(items: list[dict[str, Any]], target_day: dt.date, top_n: int) -> dict[str, Any]:
    day_items: list[dict[str, Any]] = []
    for item in items:
        published_at = parse_datetime(item.get("publishedAt", "")).astimezone(SHANGHAI_TZ).date()
        if published_at == target_day:
            day_items.append(item)

    ranked = sort_top_items(day_items)
    top_items = [to_digest_item(item, idx + 1) for idx, item in enumerate(ranked[:top_n])]

    score_values = [int(item.get("aiScore", 0) or 0) for item in day_items]
    top_score = max(score_values) if score_values else 0
    avg_score = round(sum(score_values) / len(score_values), 1) if score_values else 0

    topics = top_topics(day_items)
    topic_text = " / ".join(topic["name"] for topic in topics[:3]) if topics else "暂无"

    top_title = top_items[0]["title"] if top_items else "暂无"
    top_action = top_items[0]["action"] if top_items else "等待下一轮抓取后生成动作建议。"

    briefing = [
        f"今日共收录 {len(day_items)} 条 AI 资讯，Top10 通报见下。",
        f"高频主题：{topic_text}",
        f"最高分事件：{top_title}（{top_score} 分）",
        f"首要动作：{top_action}",
    ]

    return {
        "date": target_day.isoformat(),
        "label": make_day_label(target_day),
        "top10": top_items,
        "metrics": {
            "totalItems": len(day_items),
            "avgScore": avg_score,
            "topScore": top_score,
            "topPlatforms": top_platforms(day_items),
            "topTopics": topics,
        },
        "briefing": briefing,
    }


def dedupe_top_events(items: list[dict[str, Any]], top_n: int) -> list[dict[str, Any]]:
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for item in items:
        source = str(item.get("sourceUrl", "")).strip()
        title = str(item.get("title", "")).strip()
        key = source or title
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(item)
        if len(deduped) >= top_n:
            break
    return deduped


def build_weekly_entry(week_key: str, day_entries: list[dict[str, Any]], top_n: int) -> dict[str, Any]:
    day_values: list[dt.date] = []
    for entry in day_entries:
        try:
            day_values.append(dt.date.fromisoformat(entry.get("date", "")))
        except Exception:
            continue

    if day_values:
        anchor_day = max(day_values)
    else:
        now_day = dt.datetime.now(tz=SHANGHAI_TZ).date()
        anchor_day = now_day

    _, week_label, start_date, end_date = week_meta(anchor_day)

    all_top_items: list[dict[str, Any]] = []
    for day in day_entries:
        rows = day.get("top10") if isinstance(day.get("top10"), list) else []
        for row in rows:
            if isinstance(row, dict):
                all_top_items.append(row)

    all_top_items = sorted(
        all_top_items,
        key=lambda row: (
            -int(row.get("aiScore", 0) or 0),
            -parse_datetime(row.get("publishedAt", "")).timestamp(),
            str(row.get("sourceUrl", "") or ""),
        ),
    )

    top_events = dedupe_top_events(all_top_items, top_n)
    for idx, item in enumerate(top_events, start=1):
        item["rank"] = idx

    total_items = 0
    for day in day_entries:
        metrics = day.get("metrics") if isinstance(day.get("metrics"), dict) else {}
        total_items += int(metrics.get("totalItems", 0) or 0)

    top_scores = [int(item.get("aiScore", 0) or 0) for item in top_events]
    avg_top_score = round(sum(top_scores) / len(top_scores), 1) if top_scores else 0
    top_score = max(top_scores) if top_scores else 0

    platform_counter: Counter[str] = Counter()
    topic_counter: Counter[str] = Counter()
    for item in top_events:
        platform = str(item.get("platform", "")).strip()
        if platform:
            platform_counter[platform] += 1
        for tag in item.get("contentTags") if isinstance(item.get("contentTags"), list) else []:
            tag_text = str(tag).strip()
            if tag_text:
                topic_counter[tag_text] += 1

    top_topics = [{"name": name, "count": count} for name, count in topic_counter.most_common(6)]
    topic_text = " / ".join(topic["name"] for topic in top_topics[:3]) if top_topics else "暂无"
    top_title = top_events[0]["title"] if top_events else "暂无"
    top_action = top_events[0]["action"] if top_events else "等待后续抓取后补充。"

    briefing = [
        f"{week_label}累计收录 {total_items} 条资讯，覆盖 {len(day_entries)} 天。",
        f"高频主题：{topic_text}",
        f"本周最高分：{top_title}（{top_score} 分）",
        f"本周优先动作：{top_action}",
    ]

    return {
        "weekKey": week_key,
        "weekLabel": week_label,
        "range": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "metrics": {
            "daysCovered": len(day_entries),
            "totalItems": total_items,
            "avgTop10Score": avg_top_score,
            "topScore": top_score,
            "topPlatforms": [{"name": name, "count": count} for name, count in platform_counter.most_common(5)],
            "topTopics": top_topics,
        },
        "topEvents": top_events,
        "briefing": briefing,
    }


def build_weekly_history(daily_history: list[dict[str, Any]], top_n: int) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in daily_history:
        try:
            day = dt.date.fromisoformat(entry.get("date", ""))
        except Exception:
            continue
        week_key, _, _, _ = week_meta(day)
        grouped[week_key].append(entry)

    weekly_entries: list[dict[str, Any]] = []
    for week_key, entries in grouped.items():
        sorted_entries = sorted(entries, key=lambda row: row.get("date", ""), reverse=True)
        weekly_entries.append(build_weekly_entry(week_key, sorted_entries, top_n))

    weekly_entries.sort(key=lambda row: row.get("range", {}).get("start", ""), reverse=True)
    return weekly_entries


def build_news_digest(payload: dict[str, Any], generated_at: dt.datetime, rules: dict[str, Any]) -> dict[str, Any]:
    history_days = max(int(rules.get("historyDays", 90)), 1)
    top_n = max(int(rules.get("topN", 10)), 1)
    target_day = generated_at.astimezone(SHANGHAI_TZ).date()

    current_day = build_current_day_entry(payload.get("items", []), target_day, top_n)

    existing_daily: list[dict[str, Any]] = []
    if DIGEST_OUTPUT_FILE.exists():
        try:
            existing_payload = json.loads(DIGEST_OUTPUT_FILE.read_text(encoding="utf-8"))
            for row in existing_payload.get("dailyHistory", []) if isinstance(existing_payload, dict) else []:
                normalized = ensure_daily_entry_shape(row)
                if normalized:
                    existing_daily.append(normalized)
        except Exception:
            existing_daily = []

    daily_map: dict[str, dict[str, Any]] = {row["date"]: row for row in existing_daily}
    daily_map[current_day["date"]] = current_day

    daily_history = sorted(daily_map.values(), key=lambda row: row.get("date", ""), reverse=True)[:history_days]
    current_day = daily_map.get(target_day.isoformat(), current_day)

    weekly_history = build_weekly_history(daily_history, top_n)
    current_week_key, current_week_label, current_week_start, current_week_end = week_meta(target_day)
    current_week = next((row for row in weekly_history if row.get("weekKey") == current_week_key), None)
    if current_week is None:
        current_week = {
            "weekKey": current_week_key,
            "weekLabel": current_week_label,
            "range": {"start": current_week_start.isoformat(), "end": current_week_end.isoformat()},
            "metrics": {
                "daysCovered": 0,
                "totalItems": 0,
                "avgTop10Score": 0,
                "topScore": 0,
                "topPlatforms": [],
                "topTopics": [],
            },
            "topEvents": [],
            "briefing": [
                f"{current_week_label}暂无可用周报数据。",
                "等待后续抓取任务后自动补齐。",
            ],
        }

    digest_payload = {
        "generatedAt": generated_at.isoformat(),
        "timezone": str(rules.get("timezone", "Asia/Shanghai")),
        "currentDay": current_day,
        "dailyHistory": daily_history,
        "currentWeek": current_week,
        "weeklyHistory": weekly_history,
    }
    return digest_payload


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

    if os.getenv("GITHUB_ACTIONS") == "true" and not os.getenv("CLOUDFLARE_API_TOKEN"):
        print("[INFO] D1 sync skipped in GitHub Actions: CLOUDFLARE_API_TOKEN not configured")
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

    digest_rules = load_digest_rules()
    apply_ai_scores(payload.get("items", []), finished_at, digest_rules)
    payload["total"] = len(payload.get("items", []))

    digest_payload = build_news_digest(payload, finished_at, digest_rules)

    OUTPUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    DIGEST_OUTPUT_FILE.write_text(json.dumps(digest_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    save_translation_cache(translation_cache)

    print(f"[OK] wrote {OUTPUT_FILE} with {payload['total']} items")
    print(f"[OK] wrote {DIGEST_OUTPUT_FILE} with {len(digest_payload.get('dailyHistory', []))} daily records")

    sync_to_d1(payload, started_at, finished_at)


if __name__ == "__main__":
    main()
