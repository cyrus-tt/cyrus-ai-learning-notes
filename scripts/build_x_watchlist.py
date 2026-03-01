#!/usr/bin/env python3
"""Discover high-value X creators and build watchlist/feed snapshots.

Outputs:
- data/x_watchlist.json: ranked creator list for monitoring
- data/x_feed.json: latest post snapshot for website aggregation fallback
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG_FILE = ROOT / "data" / "x_discovery_config.json"
DEFAULT_WATCHLIST_FILE = ROOT / "data" / "x_watchlist.json"
DEFAULT_FEED_FILE = ROOT / "data" / "x_feed.json"

DEFAULT_BASE_URL = "https://ai.6551.io"
DEFAULT_TIMEOUT_SECONDS = 20

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{1,15}$")

TRACK_LABEL_MAP = {
    "toolCommercial": "工具落地",
    "chinaCommercial": "中文落地",
    "researchFrontier": "研究前沿",
}


@dataclass
class TweetExample:
    text: str
    tweet_id: str
    created_at: str
    likes: int
    retweets: int
    replies: int
    engagement: int
    username: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "text": self.text,
            "tweetId": self.tweet_id,
            "publishedAt": self.created_at,
            "metrics": {
                "likes": self.likes,
                "retweets": self.retweets,
                "replies": self.replies,
            },
            "url": build_tweet_url(self.username, self.tweet_id),
        }


@dataclass
class UserAggregate:
    username: str
    display_name: str = ""
    tweet_count: int = 0
    total_engagement: int = 0
    last_active_at: str = ""
    track_hits: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    keyword_hits: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    source_keywords: set[str] = field(default_factory=set)
    commercial_signal_hits: int = 0
    research_signal_hits: int = 0
    seed_tracks: set[str] = field(default_factory=set)
    examples: list[TweetExample] = field(default_factory=list)

    def avg_engagement(self) -> float:
        if self.tweet_count <= 0:
            return 0.0
        return self.total_engagement / self.tweet_count

    def add_example(self, example: TweetExample, max_examples: int = 4) -> None:
        self.examples.append(example)
        self.examples.sort(key=lambda item: (item.engagement, item.created_at), reverse=True)
        del self.examples[max_examples:]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build X watchlist and post feed snapshots.")
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_FILE,
        help=f"Discovery config path (default: {DEFAULT_CONFIG_FILE})",
    )
    parser.add_argument(
        "--watchlist-out",
        type=Path,
        default=DEFAULT_WATCHLIST_FILE,
        help=f"Watchlist output path (default: {DEFAULT_WATCHLIST_FILE})",
    )
    parser.add_argument(
        "--feed-out",
        type=Path,
        default=DEFAULT_FEED_FILE,
        help=f"Feed output path (default: {DEFAULT_FEED_FILE})",
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("TWITTER_API_BASE", DEFAULT_BASE_URL),
        help="6551 API base URL",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help=f"HTTP timeout in seconds (default: {DEFAULT_TIMEOUT_SECONDS})",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = load_json_file(args.config)
    if not config:
        print(f"[x-watchlist] config not found or invalid: {args.config}", file=sys.stderr)
        return 1

    token = resolve_token()
    api = XApiClient(base_url=args.base_url, token=token, timeout_seconds=args.timeout)

    aggregated = discover_users(config=config, api=api)
    watchlist_payload = build_watchlist_payload(config=config, users=aggregated)
    write_json(args.watchlist_out, watchlist_payload)

    feed_payload = build_feed_payload(config=config, api=api, watchlist_users=watchlist_payload.get("users", []))
    write_json(args.feed_out, feed_payload)

    print(
        "[x-watchlist] done: users=%d feed_items=%d source=%s"
        % (
            len(watchlist_payload.get("users", [])),
            len(feed_payload.get("items", [])),
            watchlist_payload.get("source", "unknown"),
        )
    )
    return 0


def resolve_token() -> str:
    for key in ("TWITTER_TOKEN", "OPENNEWS_TOKEN", "TOKEN_6551"):
        value = str(os.getenv(key, "")).strip()
        if value:
            return value
    return ""


def load_json_file(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def discover_users(config: dict[str, Any], api: "XApiClient") -> dict[str, UserAggregate]:
    users: dict[str, UserAggregate] = {}
    tracks = config.get("tracks", {}) if isinstance(config.get("tracks"), dict) else {}
    limits = config.get("limits", {}) if isinstance(config.get("limits"), dict) else {}
    search_limit = safe_int(limits.get("searchResultsPerKeyword"), 40, 5, 100)
    commercial_signals = make_signal_set(config.get("commercialSignals", []))
    research_signals = make_signal_set(config.get("researchSignals", []))

    if api.enabled:
        for track_key, track_cfg in tracks.items():
            keywords = track_cfg.get("keywords", [])
            if not isinstance(keywords, list):
                continue
            for keyword in keywords:
                keyword_text = safe_text(keyword)
                if not keyword_text:
                    continue
                rows = api.search_tweets(keyword_text, search_limit)
                for row in rows:
                    collect_tweet(
                        users=users,
                        row=row,
                        track_key=track_key,
                        keyword=keyword_text,
                        commercial_signals=commercial_signals,
                        research_signals=research_signals,
                    )
    else:
        print("[x-watchlist] token missing, discovery fallback to seed users only.")

    apply_seed_users(users, config.get("seedUsers", []))
    return users


def apply_seed_users(users: dict[str, UserAggregate], seeds: Any) -> None:
    if not isinstance(seeds, list):
        return

    for item in seeds:
        username = ""
        tracks: list[str] = []
        if isinstance(item, str):
            username = normalize_username(item)
        elif isinstance(item, dict):
            username = normalize_username(item.get("username"))
            raw_tracks = item.get("tracks", [])
            if isinstance(raw_tracks, list):
                tracks = [safe_text(track) for track in raw_tracks if safe_text(track)]

        if not username:
            continue

        aggregate = users.get(username)
        if not aggregate:
            aggregate = UserAggregate(username=username)
            users[username] = aggregate

        aggregate.seed_tracks.update(tracks)
        for track in tracks:
            aggregate.track_hits[track] += 2


def collect_tweet(
    users: dict[str, UserAggregate],
    row: dict[str, Any],
    track_key: str,
    keyword: str,
    commercial_signals: set[str],
    research_signals: set[str],
) -> None:
    username = normalize_username(
        row.get("userScreenName") or row.get("screenName") or row.get("username") or row.get("authorUsername")
    )
    if not username:
        return

    display_name = safe_text(
        row.get("userName") or row.get("displayName") or row.get("name") or row.get("authorName") or ""
    )
    text = normalize_text(row.get("text"))
    created_at = to_iso_datetime(row.get("createdAt"))
    tweet_id = safe_text(row.get("id"))

    likes = to_non_negative_int(row.get("favoriteCount") or row.get("likeCount"))
    retweets = to_non_negative_int(row.get("retweetCount") or row.get("repostCount"))
    replies = to_non_negative_int(row.get("replyCount"))
    engagement = likes + retweets * 2 + replies * 2

    aggregate = users.get(username)
    if not aggregate:
        aggregate = UserAggregate(username=username)
        users[username] = aggregate

    if display_name and not aggregate.display_name:
        aggregate.display_name = display_name

    aggregate.tweet_count += 1
    aggregate.total_engagement += engagement
    aggregate.track_hits[track_key] += 1
    aggregate.keyword_hits[keyword] += 1
    aggregate.source_keywords.add(keyword)
    if created_at > aggregate.last_active_at:
        aggregate.last_active_at = created_at

    text_lower = text.lower()
    if contains_any(text_lower, commercial_signals):
        aggregate.commercial_signal_hits += 1
    if contains_any(text_lower, research_signals):
        aggregate.research_signal_hits += 1

    if text:
        aggregate.add_example(
            TweetExample(
                text=truncate_text(text, 240),
                tweet_id=tweet_id,
                created_at=created_at,
                likes=likes,
                retweets=retweets,
                replies=replies,
                engagement=engagement,
                username=username,
            )
        )


def build_watchlist_payload(config: dict[str, Any], users: dict[str, UserAggregate]) -> dict[str, Any]:
    weights = coerce_weights(config.get("weights", {}))
    limits = config.get("limits", {}) if isinstance(config.get("limits"), dict) else {}
    watchlist_size = safe_int(limits.get("watchlistSize"), 80, 10, 200)
    min_tweet_count = safe_int(limits.get("minTweetCount"), 2, 1, 20)
    exclude_users = {normalize_username(user) for user in as_list(config.get("excludeUsers", []))}
    exclude_users.discard("")

    max_track_hits: dict[str, int] = {}
    track_keys = list(weights.keys())
    for track_key in track_keys:
        max_track_hits[track_key] = max((users[user].track_hits.get(track_key, 0) for user in users), default=1)
        if max_track_hits[track_key] <= 0:
            max_track_hits[track_key] = 1

    max_avg_engagement = max((aggregate.avg_engagement() for aggregate in users.values()), default=1.0)
    if max_avg_engagement <= 0:
        max_avg_engagement = 1.0

    ranked: list[dict[str, Any]] = []

    for username, aggregate in users.items():
        if username in exclude_users:
            continue

        has_seed = bool(aggregate.seed_tracks)
        if not has_seed and aggregate.tweet_count < min_tweet_count:
            continue

        track_scores: dict[str, float] = {}
        weighted_track_score = 0.0
        for track_key, weight in weights.items():
            raw_hits = aggregate.track_hits.get(track_key, 0)
            if track_key in aggregate.seed_tracks:
                raw_hits += 2
            normalized = min(raw_hits / max_track_hits.get(track_key, 1), 1.0)
            track_scores[track_key] = normalized
            weighted_track_score += normalized * weight

        if not has_seed and weighted_track_score < 0.1:
            continue

        avg_engagement = aggregate.avg_engagement()
        source_keyword_count = len(aggregate.source_keywords)
        signal_total = aggregate.commercial_signal_hits + aggregate.research_signal_hits
        if not has_seed:
            if aggregate.tweet_count < min_tweet_count * 2:
                continue
            if source_keyword_count < 2:
                continue
            if signal_total < 1:
                continue
            if avg_engagement < 5:
                continue

        engagement_score = min(math.log1p(avg_engagement) / math.log1p(max_avg_engagement), 1.0)
        activity_score = min(aggregate.tweet_count / max(min_tweet_count * 4, 6), 1.0)
        signal_bonus = min(aggregate.commercial_signal_hits / max(aggregate.tweet_count, 1), 1.0) * 0.06
        research_bonus = min(aggregate.research_signal_hits / max(aggregate.tweet_count, 1), 1.0) * 0.04
        seed_bonus = 0.2 if has_seed else 0.0

        base_score = weighted_track_score * 0.7 + engagement_score * 0.2 + activity_score * 0.1
        final_score = min(base_score + signal_bonus + research_bonus + seed_bonus, 1.0)

        top_example = aggregate.examples[0] if aggregate.examples else None
        ranked.append(
            {
                "username": username,
                "displayName": aggregate.display_name or username,
                "score": round(final_score * 100, 2),
                "tweetCount": aggregate.tweet_count,
                "avgEngagement": round(avg_engagement, 2),
                "lastActiveAt": aggregate.last_active_at or datetime.now(timezone.utc).isoformat(),
                "trackScores": {key: round(value, 4) for key, value in track_scores.items()},
                "sourceKeywords": sorted(aggregate.source_keywords)[:12],
                "tags": build_user_tags(track_scores, aggregate),
                "reason": build_user_reason(track_scores, aggregate, avg_engagement),
                "sampleTweet": top_example.to_dict() if top_example else None,
            }
        )

    ranked.sort(
        key=lambda item: (
            item.get("score", 0),
            item.get("avgEngagement", 0),
            item.get("tweetCount", 0),
            item.get("lastActiveAt", ""),
        ),
        reverse=True,
    )

    trimmed = ranked[:watchlist_size]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "discovery" if any(user.get("tweetCount", 0) > 0 for user in trimmed) else "seed",
        "algorithm": {
            "weights": weights,
            "scoreFormula": "0.7*track + 0.2*engagement + 0.1*activity + signal bonuses",
            "limits": {
                "watchlistSize": watchlist_size,
                "minTweetCount": min_tweet_count,
            },
        },
        "users": trimmed,
    }


def build_user_tags(track_scores: dict[str, float], aggregate: UserAggregate) -> list[str]:
    tags: list[str] = ["X监控"]
    for track_key, label in TRACK_LABEL_MAP.items():
        if track_scores.get(track_key, 0) >= 0.25:
            tags.append(label)

    if aggregate.commercial_signal_hits >= max(1, aggregate.tweet_count // 4):
        tags.append("商业化")
    if aggregate.research_signal_hits >= max(1, aggregate.tweet_count // 4):
        tags.append("研究桥接")
    if track_scores.get("toolCommercial", 0) >= 0.4 and track_scores.get("researchFrontier", 0) >= 0.4:
        tags.append("产品+研究")

    return dedupe(tags)[:6]


def build_user_reason(track_scores: dict[str, float], aggregate: UserAggregate, avg_engagement: float) -> str:
    reasons: list[str] = []

    ranked_tracks = sorted(track_scores.items(), key=lambda item: item[1], reverse=True)
    top_tracks = [TRACK_LABEL_MAP.get(key, key) for key, value in ranked_tracks if value >= 0.3][:2]
    if top_tracks:
        reasons.append("主信号：" + " / ".join(top_tracks))

    if avg_engagement >= 180:
        reasons.append("互动强度高")
    elif avg_engagement >= 60:
        reasons.append("互动强度中高")

    if aggregate.commercial_signal_hits > aggregate.research_signal_hits:
        reasons.append("商业化内容占比高")
    elif aggregate.research_signal_hits > 0:
        reasons.append("研究前沿信号稳定")

    if aggregate.seed_tracks:
        reasons.append("种子账号校准")

    if not reasons:
        reasons.append("持续输出 AI 相关内容")

    return "；".join(reasons[:3])


def build_feed_payload(config: dict[str, Any], api: "XApiClient", watchlist_users: list[dict[str, Any]]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    limits = config.get("limits", {}) if isinstance(config.get("limits"), dict) else {}
    per_user_limit = safe_int(limits.get("perUserFeedLimit"), 4, 1, 10)
    feed_size = safe_int(limits.get("feedSize"), 200, 20, 500)
    feed_user_limit = safe_int(limits.get("feedUserLimit"), 20, 5, 80)

    if not watchlist_users:
        return {
            "generatedAt": now,
            "source": "watchlist-fallback",
            "items": [build_feed_fallback_item(now)],
        }

    if not api.enabled:
        return {
            "generatedAt": now,
            "source": "watchlist-no-token",
            "items": [build_feed_fallback_item(now)],
        }

    user_by_name = {normalize_username(item.get("username")): item for item in watchlist_users}
    sorted_users = [item for item in watchlist_users if normalize_username(item.get("username"))][:feed_user_limit]

    collected: list[dict[str, Any]] = []
    for user_item in sorted_users:
        username = normalize_username(user_item.get("username"))
        if not username:
            continue

        rows = api.user_tweets(username=username, max_results=per_user_limit)
        for row in rows:
            normalized = normalize_tweet_to_news_item(row=row, user_item=user_by_name.get(username, {}))
            if normalized:
                collected.append(normalized)

        if len(collected) >= feed_size:
            break

    collected.sort(key=lambda item: item.get("publishedAt", ""), reverse=True)
    deduped = dedupe_items(collected)[:feed_size]

    if not deduped:
        deduped = [build_feed_fallback_item(now)]

    return {
        "generatedAt": now,
        "source": "watchlist-live",
        "items": deduped,
    }


def normalize_tweet_to_news_item(row: dict[str, Any], user_item: dict[str, Any]) -> dict[str, Any] | None:
    username = normalize_username(
        row.get("userScreenName") or row.get("screenName") or row.get("username") or user_item.get("username")
    )
    if not username:
        return None

    tweet_id = safe_text(row.get("id"))
    text = normalize_text(row.get("text"))
    if not text:
        return None

    created_at = to_iso_datetime(row.get("createdAt"))
    likes = to_non_negative_int(row.get("favoriteCount") or row.get("likeCount"))
    retweets = to_non_negative_int(row.get("retweetCount") or row.get("repostCount"))
    replies = to_non_negative_int(row.get("replyCount"))
    engagement = likes + retweets * 2 + replies * 2

    display_name = safe_text(user_item.get("displayName") or username)
    source_url = build_tweet_url(username, tweet_id)
    tags = as_list(user_item.get("tags", []))
    track_scores = user_item.get("trackScores", {}) if isinstance(user_item.get("trackScores"), dict) else {}

    tags = dedupe([safe_text(tag) for tag in tags if safe_text(tag)] + parse_hashtags(row.get("hashtags")))
    tags = tags[:8] if tags else ["X监控"]

    action = "低互动推文，建议结合更多信号再判断。"
    if engagement >= 1200:
        action = "高互动推文，建议加入重点观察名单。"
    elif engagement >= 300:
        action = "中等互动推文，可纳入日内情绪跟踪。"

    reason = safe_text(user_item.get("reason"))
    if reason:
        action = f"{action} 账号理由：{reason}"

    return {
        "title": f"@{username} · X监控",
        "titleOriginal": f"@{username} · X monitor",
        "titleZh": f"@{username} · X监控",
        "summary": text,
        "summaryOriginal": text,
        "summaryZh": text,
        "hasTranslation": False,
        "platform": "X/Twitter",
        "region": "全球社媒",
        "industryStage": infer_stage_from_track_scores(track_scores),
        "contentTags": tags,
        "date": created_at[:10],
        "action": action,
        "sourceUrl": source_url,
        "sourceName": f"@{display_name}",
        "publishedAt": created_at,
        "metrics": {
            "likes": likes,
            "retweets": retweets,
            "replies": replies,
        },
        "watchScore": user_item.get("score"),
    }


def build_feed_fallback_item(now: str) -> dict[str, Any]:
    return {
        "title": "@watchlist · X监控",
        "titleOriginal": "@watchlist · X monitor",
        "titleZh": "@watchlist · X监控",
        "summary": "X watchlist 已启用，等待下一次抓取任务写入最新推文。",
        "summaryOriginal": "X watchlist is enabled. Waiting for the next fetch task.",
        "summaryZh": "X watchlist 已启用，等待下一次抓取任务写入最新推文。",
        "hasTranslation": True,
        "platform": "X/Twitter",
        "region": "全球社媒",
        "industryStage": "中游",
        "contentTags": ["X监控", "watchlist"],
        "date": now[:10],
        "action": "运行 scripts/build_x_watchlist.py 即可刷新聚合推文。",
        "sourceUrl": "https://x.com",
        "sourceName": "X",
        "publishedAt": now,
        "metrics": {
            "likes": 0,
            "retweets": 0,
            "replies": 0,
        },
    }


def infer_stage_from_track_scores(track_scores: dict[str, Any]) -> str:
    tool_score = to_float(track_scores.get("toolCommercial"), 0.0)
    china_score = to_float(track_scores.get("chinaCommercial"), 0.0)
    research_score = to_float(track_scores.get("researchFrontier"), 0.0)

    if research_score >= max(tool_score, china_score):
        return "上游"
    if tool_score + china_score >= 0.7:
        return "下游"
    return "中游"


def dedupe_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique_items: list[dict[str, Any]] = []
    for item in items:
        key = f"{safe_text(item.get('sourceUrl'))}|{safe_text(item.get('summary'))}"
        if key in seen:
            continue
        seen.add(key)
        unique_items.append(item)
    return unique_items


class XApiClient:
    def __init__(self, base_url: str, token: str, timeout_seconds: int) -> None:
        self.base_url = normalize_base_url(base_url)
        self.token = token
        self.timeout_seconds = max(3, timeout_seconds)

    @property
    def enabled(self) -> bool:
        return bool(self.token)

    def search_tweets(self, keyword: str, max_results: int) -> list[dict[str, Any]]:
        payload = {
            "keywords": keyword,
            "maxResults": max_results,
            "product": "Latest",
        }
        return self._post("/open/twitter_search", payload)

    def user_tweets(self, username: str, max_results: int) -> list[dict[str, Any]]:
        payload = {
            "username": username,
            "maxResults": max_results,
            "product": "Latest",
            "includeReplies": False,
            "includeRetweets": False,
        }
        return self._post("/open/twitter_user_tweets", payload)

    def _post(self, endpoint: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
        if not self.enabled:
            return []

        url = f"{self.base_url}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=self.timeout_seconds)
            if not response.ok:
                print(
                    f"[x-watchlist] request failed: {response.status_code} endpoint={endpoint}",
                    file=sys.stderr,
                )
                return []

            body = response.json()
            if not isinstance(body, dict):
                return []
            rows = body.get("data")
            if not isinstance(rows, list):
                return []
            return [row for row in rows if isinstance(row, dict)]
        except Exception as error:
            print(f"[x-watchlist] request error endpoint={endpoint}: {error}", file=sys.stderr)
            return []


def normalize_base_url(raw_value: str) -> str:
    value = safe_text(raw_value) or DEFAULT_BASE_URL
    if not value.startswith("http://") and not value.startswith("https://"):
        value = f"https://{value}"
    return value.rstrip("/")


def normalize_text(value: Any) -> str:
    text = safe_text(value)
    if not text:
        return ""
    return " ".join(text.split())


def normalize_username(value: Any) -> str:
    username = safe_text(value).lstrip("@")
    if not username:
        return ""
    if not USERNAME_RE.match(username):
        return ""
    return username


def safe_text(value: Any) -> str:
    return str(value or "").strip()


def safe_int(value: Any, fallback: int, lower: int, upper: int) -> int:
    try:
        parsed = int(str(value))
    except Exception:
        return fallback
    return max(lower, min(parsed, upper))


def to_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except Exception:
        return fallback


def to_non_negative_int(value: Any) -> int:
    try:
        parsed = int(float(str(value)))
    except Exception:
        return 0
    return max(parsed, 0)


def to_iso_datetime(value: Any) -> str:
    raw = safe_text(value)
    if not raw:
        return datetime.now(timezone.utc).isoformat()

    if raw.isdigit():
        timestamp = int(raw)
        if timestamp > 10**12:
            timestamp /= 1000
        try:
            return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
        except Exception:
            return datetime.now(timezone.utc).isoformat()

    normalized = raw.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    return []


def make_signal_set(values: Any) -> set[str]:
    if not isinstance(values, list):
        return set()
    return {safe_text(item).lower() for item in values if safe_text(item)}


def contains_any(text: str, signals: set[str]) -> bool:
    if not text or not signals:
        return False
    return any(signal in text for signal in signals)


def truncate_text(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def build_tweet_url(username: str, tweet_id: str) -> str:
    if username and tweet_id:
        return f"https://x.com/{username}/status/{tweet_id}"
    if username:
        return f"https://x.com/{username}"
    return "https://x.com"


def parse_hashtags(raw_hashtags: Any) -> list[str]:
    if not isinstance(raw_hashtags, list):
        return []
    tags: list[str] = []
    for value in raw_hashtags:
        text = safe_text(value).lstrip("#")
        if text:
            tags.append(text)
    return tags


def dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def coerce_weights(raw_weights: Any) -> dict[str, float]:
    defaults = {
        "toolCommercial": 0.6,
        "chinaCommercial": 0.25,
        "researchFrontier": 0.15,
    }
    if not isinstance(raw_weights, dict):
        return defaults

    clean_weights: dict[str, float] = {}
    total = 0.0
    for key in defaults:
        value = to_float(raw_weights.get(key), defaults[key])
        if value < 0:
            value = 0.0
        clean_weights[key] = value
        total += value

    if total <= 0:
        return defaults

    return {key: round(value / total, 6) for key, value in clean_weights.items()}


if __name__ == "__main__":
    raise SystemExit(main())
