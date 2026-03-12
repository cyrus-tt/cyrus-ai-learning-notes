#!/usr/bin/env python3
"""Fetch latest videos from YouTube channels via RSS and build yt_feed.json.

Outputs:
- data/yt_watchlist.json: channel metadata with latest activity timestamps
- data/yt_feed.json: latest video snapshot for website aggregation
"""

from __future__ import annotations

import json
import os
import re
import signal
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import feedparser
import requests

try:
    from deep_translator import GoogleTranslator
except ImportError:
    GoogleTranslator = None

ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = ROOT / "data" / "yt_discovery_config.json"
WATCHLIST_OUT = ROOT / "data" / "yt_watchlist.json"
FEED_OUT = ROOT / "data" / "yt_feed.json"
TRANSLATION_CACHE_FILE = ROOT / "data" / "translation_cache.json"

YT_RSS_TEMPLATE = "https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
DEFAULT_TIMEOUT = 15
SUMMARY_MAX_LEN = 700
SUMMARY_AI_SCAN_LEN = 260
TRANSLATION_TIMEOUT_SECONDS = 8
TRANSLATION_FAILURE_LIMIT = 5
DEFAULT_AI_KEYWORDS = [
    "ai",
    "llm",
    "gpt",
    "chatgpt",
    "openai",
    "anthropic",
    "claude",
    "gemini",
    "deepseek",
    "agent",
    "agents",
    "rag",
    "machine learning",
    "deep learning",
    "transformer",
    "multimodal",
    "fine-tuning",
    "inference",
    "模型",
    "大模型",
    "智能体",
    "生成式",
    "机器学习",
    "深度学习",
    "多模态",
    "提示词",
]


def _translation_timeout_handler(signum: int, frame: Any) -> None:
    raise TimeoutError("translation timed out")


def main() -> int:
    config = load_json(CONFIG_FILE)
    if not config:
        print(f"[yt-watchlist] config not found: {CONFIG_FILE}", file=sys.stderr)
        return 1

    channels = config.get("channels", [])
    if not isinstance(channels, list) or not channels:
        print("[yt-watchlist] no channels in config", file=sys.stderr)
        return 1

    limits = config.get("limits", {})
    per_channel_limit = safe_int(limits.get("perChannelFeedLimit"), 5, 1, 15)
    feed_size = safe_int(limits.get("feedSize"), 100, 10, 500)
    feed_channel_limit = safe_int(limits.get("feedChannelLimit"), 30, 5, 100)
    ai_keywords = load_ai_keywords(config.get("aiKeywords"))

    translator, cache = init_translator()
    translation_state = {"failures": 0, "disabled": False}
    now = datetime.now(timezone.utc).isoformat()

    watchlist_channels = []
    all_items: list[dict[str, Any]] = []

    for ch_cfg in channels[:feed_channel_limit]:
        channel_id = safe_text(ch_cfg.get("channelId", ""))
        channel_name = safe_text(ch_cfg.get("name", ""))
        tags = ch_cfg.get("tags", []) if isinstance(ch_cfg.get("tags"), list) else []

        if not channel_id:
            continue

        entries = fetch_channel_feed(channel_id)
        entries = entries[:per_channel_limit]

        latest_at = ""
        ai_video_count = 0
        for entry in entries:
            item = normalize_entry(entry, channel_id, channel_name, tags, translator, cache, translation_state)
            if item and is_ai_related_item(item, ai_keywords):
                all_items.append(item)
                ai_video_count += 1
                if item["publishedAt"] > latest_at:
                    latest_at = item["publishedAt"]

        watchlist_channels.append({
            "channelId": channel_id,
            "name": channel_name,
            "tags": tags,
            "latestVideoAt": latest_at or now,
            "videoCount": ai_video_count,
        })

        print(f"[yt-watchlist] {channel_name}: raw={len(entries)} ai={ai_video_count}")

    all_items.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)
    deduped = dedupe_items(all_items)[:feed_size]

    if not deduped:
        deduped = [build_fallback_item(now)]

    watchlist_payload = {
        "generatedAt": now,
        "source": "yt-rss-feed",
        "channels": watchlist_channels,
    }
    write_json(WATCHLIST_OUT, watchlist_payload)

    feed_payload = {
        "generatedAt": now,
        "source": "yt-rss-live",
        "total": len(deduped),
        "items": deduped,
    }
    write_json(FEED_OUT, feed_payload)

    save_translation_cache(cache)

    print(f"[yt-watchlist] done: channels={len(watchlist_channels)} items={len(deduped)}")
    return 0


def fetch_channel_feed(channel_id: str) -> list[dict[str, Any]]:
    url = YT_RSS_TEMPLATE.format(channel_id=channel_id)
    try:
        resp = requests.get(url, timeout=DEFAULT_TIMEOUT)
        if not resp.ok:
            print(f"[yt-watchlist] RSS fetch failed: {resp.status_code} channel={channel_id}", file=sys.stderr)
            return []
        feed = feedparser.parse(resp.text)
        return feed.entries if hasattr(feed, "entries") else []
    except Exception as err:
        print(f"[yt-watchlist] RSS error channel={channel_id}: {err}", file=sys.stderr)
        return []


def normalize_entry(
    entry: Any,
    channel_id: str,
    channel_name: str,
    tags: list[str],
    translator: Any,
    cache: dict[str, str],
    translation_state: dict[str, Any],
) -> dict[str, Any] | None:
    title_original = safe_text(getattr(entry, "title", ""))
    if not title_original:
        return None

    video_id = safe_text(getattr(entry, "yt_videoid", ""))
    link = safe_text(getattr(entry, "link", ""))
    published = safe_text(getattr(entry, "published", ""))
    published_at = to_iso_datetime(published)

    author = safe_text(getattr(entry, "author", "")) or channel_name

    thumbnail = ""
    media_group = getattr(entry, "media_thumbnail", None)
    if isinstance(media_group, list) and media_group:
        thumbnail = safe_text(media_group[0].get("url", ""))
    if not thumbnail and video_id:
        thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

    summary_original = safe_text(getattr(entry, "summary", "")) or title_original
    summary_original = truncate_text(summary_original, SUMMARY_MAX_LEN)

    title_zh = translate_text(title_original, translator, cache, translation_state)
    summary_zh = (
        translate_text(summary_original, translator, cache, translation_state)
        if summary_original != title_original
        else title_zh
    )
    has_translation = bool(title_zh and title_zh != title_original)

    source_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else link

    content_tags = dedupe(["YouTube监控"] + [safe_text(t) for t in tags if safe_text(t)])[:8]

    return {
        "title": f"{author} · YouTube监控",
        "titleOriginal": title_original,
        "titleZh": title_zh or title_original,
        "summary": summary_zh or summary_original or "暂无摘要",
        "summaryOriginal": summary_original,
        "summaryZh": summary_zh or summary_original,
        "hasTranslation": has_translation,
        "platform": "YouTube",
        "region": "海外",
        "industryStage": "中游",
        "contentTags": content_tags,
        "date": published_at[:10],
        "action": "值得观看的AI视频，建议收藏并提取关键信息。",
        "sourceUrl": source_url,
        "sourceName": author,
        "publishedAt": published_at,
        "ytMeta": {
            "channelId": channel_id,
            "videoId": video_id,
            "thumbnailUrl": thumbnail,
        },
    }


def build_fallback_item(now: str) -> dict[str, Any]:
    return {
        "title": "YouTube监控已启用",
        "titleOriginal": "YouTube monitoring is enabled",
        "titleZh": "YouTube监控已启用，等待下一次抓取",
        "summary": "YouTube RSS 聚合已就绪，等待下一次定时抓取写入最新视频。",
        "summaryOriginal": "YouTube RSS aggregation is ready. Waiting for the next scheduled fetch.",
        "summaryZh": "YouTube RSS 聚合已就绪，等待下一次定时抓取写入最新视频。",
        "hasTranslation": True,
        "platform": "YouTube",
        "region": "海外",
        "industryStage": "中游",
        "contentTags": ["YouTube监控"],
        "date": now[:10],
        "action": "运行 scripts/build_yt_watchlist.py 即可刷新聚合视频。",
        "sourceUrl": "https://www.youtube.com",
        "sourceName": "YouTube",
        "publishedAt": now,
        "ytMeta": {"channelId": "", "videoId": "", "thumbnailUrl": ""},
    }


def dedupe_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for item in items:
        key = safe_text(item.get("sourceUrl", ""))
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        result.append(item)
    return result


def init_translator() -> tuple[Any, dict[str, str]]:
    cache = load_translation_cache()
    if GoogleTranslator is None:
        return None, cache
    try:
        return GoogleTranslator(source="en", target="zh-CN"), cache
    except Exception:
        return None, cache


def translate_via_service(text: str, translator: Any) -> str:
    if hasattr(signal, "SIGALRM") and hasattr(signal, "setitimer"):
        previous_handler = signal.getsignal(signal.SIGALRM)
        try:
            signal.signal(signal.SIGALRM, _translation_timeout_handler)
            signal.setitimer(signal.ITIMER_REAL, TRANSLATION_TIMEOUT_SECONDS)
            return translator.translate(text)
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
            signal.signal(signal.SIGALRM, previous_handler)

    return translator.translate(text)


def translate_text(text: str, translator: Any, cache: dict[str, str], translation_state: dict[str, Any]) -> str:
    if not text or not translator or translation_state.get("disabled"):
        return text
    if has_cjk(text):
        return text

    cache_key = f"zh::{text}"
    if cache_key in cache:
        return cache[cache_key]

    try:
        result = translate_via_service(text, translator)
        translation_state["failures"] = 0
        if result:
            cache[cache_key] = result
            return result
    except Exception as err:
        failures = int(translation_state.get("failures", 0)) + 1
        translation_state["failures"] = failures
        if failures >= TRANSLATION_FAILURE_LIMIT and not translation_state.get("disabled"):
            translation_state["disabled"] = True
            print(
                f"[yt-watchlist] translation disabled after {failures} failures: {type(err).__name__}: {err}",
                file=sys.stderr,
            )
        else:
            print(f"[yt-watchlist] translate error: {err}", file=sys.stderr)
    return text


def has_cjk(text: str) -> bool:
    for ch in text:
        code = ord(ch)
        if 0x4E00 <= code <= 0x9FFF or 0x3400 <= code <= 0x4DBF:
            return True
    return False


def load_ai_keywords(raw: Any) -> list[str]:
    base = raw if isinstance(raw, list) and raw else DEFAULT_AI_KEYWORDS
    normalized = []
    for item in base:
        text = safe_text(item).lower()
        if text and text not in normalized:
            normalized.append(text)
    return normalized


def is_ai_related_item(item: dict[str, Any], ai_keywords: list[str]) -> bool:
    title = safe_text(item.get("titleOriginal") or item.get("title") or "")
    pool = title.lower()
    return contains_ai_keyword(pool, ai_keywords)


def contains_ai_keyword(text: str, ai_keywords: list[str]) -> bool:
    for kw in ai_keywords:
        if not kw:
            continue
        if is_ascii_word(kw) and len(kw) <= 3:
            if re.search(rf"\b{re.escape(kw)}\b", text):
                return True
            continue
        if kw in text:
            return True
    return False


def is_ascii_word(value: str) -> bool:
    return bool(value) and all(ord(ch) < 128 and (ch.isalpha() or ch == "-") for ch in value)


def truncate_text(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return f"{text[:limit]}..."


def load_translation_cache() -> dict[str, str]:
    try:
        return json.loads(TRANSLATION_CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_translation_cache(cache: dict[str, str]) -> None:
    try:
        TRANSLATION_CACHE_FILE.write_text(
            json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as err:
        print(f"[yt-watchlist] cache save error: {err}", file=sys.stderr)


def load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def safe_text(value: Any) -> str:
    return str(value or "").strip()


def safe_int(value: Any, fallback: int, lower: int, upper: int) -> int:
    try:
        parsed = int(str(value))
    except Exception:
        return fallback
    return max(lower, min(parsed, upper))


def to_non_negative_int(value: Any) -> int:
    try:
        return max(int(float(str(value))), 0)
    except Exception:
        return 0


def to_iso_datetime(value: Any) -> str:
    raw = safe_text(value)
    if not raw:
        return datetime.now(timezone.utc).isoformat()
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(raw)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        pass
    normalized = raw.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for v in values:
        if v not in seen:
            seen.add(v)
            result.append(v)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
