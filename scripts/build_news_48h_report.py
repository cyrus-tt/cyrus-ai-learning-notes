#!/usr/bin/env python3
"""Build a 48-hour AI news visualization snapshot from data/news.json."""

from __future__ import annotations

import json
import math
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
INPUT_FILE = ROOT / "data" / "news.json"
OUTPUT_FILE = ROOT / "data" / "news_48h_report.json"

REPORT_TZ = ZoneInfo(os.getenv("NEWS_REPORT_TZ", "America/Los_Angeles"))
WINDOW_HOURS = int(os.getenv("NEWS_REPORT_WINDOW_HOURS", "48"))
BUCKET_HOURS = int(os.getenv("NEWS_REPORT_BUCKET_HOURS", "4"))
TOP_ITEM_LIMIT = 12
LATEST_ITEM_LIMIT = 20
SOURCE_LIMIT = 10
TAG_LIMIT = 12


def load_items() -> list[dict[str, Any]]:
    payload = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        items = payload.get("items", [])
    else:
        items = []
    return [item for item in items if isinstance(item, dict)]


def parse_published_at(item: dict[str, Any]) -> datetime | None:
    raw = str(item.get("publishedAt") or "").strip()
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def format_local(value: datetime) -> str:
    return value.astimezone(REPORT_TZ).strftime("%Y-%m-%d %H:%M")


def normalize_count_rows(counter: Counter[str], total: int) -> list[dict[str, Any]]:
    rows = []
    for name, count in sorted(counter.items(), key=lambda item: (-item[1], item[0])):
        rows.append(
            {
                "name": name,
                "count": count,
                "percentage": round((count / total) * 100, 1) if total else 0,
            }
        )
    return rows


def build_source_rows(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        grouped[str(item.get("sourceName") or "未知来源")].append(item)

    rows = []
    for name, group in grouped.items():
        scores = [float(item.get("aiScore", 0) or 0) for item in group]
        latest_dt = max(item["_publishedAt"] for item in group)
        rows.append(
            {
                "name": name,
                "count": len(group),
                "avgScore": round(sum(scores) / len(scores), 1) if scores else 0,
                "latestPublishedAt": latest_dt.isoformat(),
                "latestPublishedAtLocal": format_local(latest_dt),
            }
        )

    return sorted(rows, key=lambda item: (-item["count"], -item["avgScore"], item["name"]))[
        :SOURCE_LIMIT
    ]


def build_timeline(items: list[dict[str, Any]], window_start: datetime, window_end: datetime) -> list[dict[str, Any]]:
    bucket_count = max(1, math.ceil(WINDOW_HOURS / BUCKET_HOURS))
    bucket_span = timedelta(hours=BUCKET_HOURS)
    counts = [0] * bucket_count

    for item in items:
        delta = item["_publishedAt"] - window_start
        raw_index = int(delta.total_seconds() // bucket_span.total_seconds())
        index = min(max(raw_index, 0), bucket_count - 1)
        counts[index] += 1

    rows = []
    for index in range(bucket_count):
        bucket_start = window_start + (bucket_span * index)
        bucket_end = min(bucket_start + bucket_span, window_end)
        rows.append(
            {
                "bucketStart": bucket_start.isoformat(),
                "bucketEnd": bucket_end.isoformat(),
                "bucketStartLocal": format_local(bucket_start),
                "bucketEndLocal": format_local(bucket_end),
                "label": bucket_start.astimezone(REPORT_TZ).strftime("%m-%d %H:%M"),
                "count": counts[index],
            }
        )
    return rows


def simplify_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": item.get("title") or item.get("titleOriginal") or "",
        "titleZh": item.get("titleZh") or "",
        "summary": item.get("summary") or item.get("summaryOriginal") or "",
        "summaryZh": item.get("summaryZh") or "",
        "platform": item.get("platform") or "未知平台",
        "sourceName": item.get("sourceName") or "未知来源",
        "sourceUrl": item.get("sourceUrl") or "",
        "industryStage": item.get("industryStage") or "未分类",
        "contentTags": item.get("contentTags") or [],
        "region": item.get("region") or "",
        "aiScore": int(item.get("aiScore", 0) or 0),
        "publishedAt": item["_publishedAt"].isoformat(),
        "publishedAtLocal": format_local(item["_publishedAt"]),
        "action": item.get("action") or "",
    }


def build_report() -> dict[str, Any]:
    generated_at = datetime.now(timezone.utc)
    window_start = generated_at - timedelta(hours=WINDOW_HOURS)

    prepared_items = []
    for item in load_items():
        published_at = parse_published_at(item)
        if published_at is None:
            continue
        if published_at < window_start or published_at > generated_at:
            continue
        enriched = dict(item)
        enriched["_publishedAt"] = published_at
        prepared_items.append(enriched)

    prepared_items.sort(key=lambda item: item["_publishedAt"], reverse=True)

    platform_counter: Counter[str] = Counter()
    stage_counter: Counter[str] = Counter()
    tag_counter: Counter[str] = Counter()
    for item in prepared_items:
        platform_counter[str(item.get("platform") or "未知平台")] += 1
        stage_counter[str(item.get("industryStage") or "未分类")] += 1
        for tag in item.get("contentTags") or []:
            tag_counter[str(tag)] += 1

    total_items = len(prepared_items)
    total_sources = len({str(item.get("sourceName") or "未知来源") for item in prepared_items})
    total_platforms = len(platform_counter)
    scores = [float(item.get("aiScore", 0) or 0) for item in prepared_items]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    high_score_count = sum(1 for score in scores if score >= 80)

    top_items = sorted(
        prepared_items,
        key=lambda item: (float(item.get("aiScore", 0) or 0), item["_publishedAt"]),
        reverse=True,
    )[:TOP_ITEM_LIMIT]

    latest_items = prepared_items[:LATEST_ITEM_LIMIT]
    top_platform = normalize_count_rows(platform_counter, total_items)[:1]
    top_stage = normalize_count_rows(stage_counter, total_items)[:1]
    top_tag = normalize_count_rows(tag_counter, total_items)[:1]

    return {
        "generatedAt": generated_at.isoformat(),
        "generatedAtLocal": format_local(generated_at),
        "timezone": str(REPORT_TZ),
        "windowHours": WINDOW_HOURS,
        "windowStart": window_start.isoformat(),
        "windowStartLocal": format_local(window_start),
        "windowEnd": generated_at.isoformat(),
        "windowEndLocal": format_local(generated_at),
        "stats": {
            "totalItems": total_items,
            "sourceCount": total_sources,
            "platformCount": total_platforms,
            "avgScore": avg_score,
            "highScoreCount": high_score_count,
            "avgItemsPerHour": round(total_items / WINDOW_HOURS, 2) if WINDOW_HOURS else 0,
        },
        "highlights": {
            "topPlatform": top_platform[0] if top_platform else None,
            "topStage": top_stage[0] if top_stage else None,
            "topTag": top_tag[0] if top_tag else None,
            "latestTitle": latest_items[0].get("title") if latest_items else "",
        },
        "timeline": build_timeline(prepared_items, window_start, generated_at),
        "platformBreakdown": normalize_count_rows(platform_counter, total_items),
        "stageBreakdown": normalize_count_rows(stage_counter, total_items),
        "tagBreakdown": normalize_count_rows(tag_counter, total_items)[:TAG_LIMIT],
        "sourceBreakdown": build_source_rows(prepared_items),
        "topItems": [simplify_item(item) for item in top_items],
        "latestItems": [simplify_item(item) for item in latest_items],
    }


def main() -> None:
    report = build_report()
    OUTPUT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[news-report] wrote {OUTPUT_FILE}")
    print(
        "[news-report] items={items} window={start} -> {end}".format(
            items=report["stats"]["totalItems"],
            start=report["windowStartLocal"],
            end=report["windowEndLocal"],
        )
    )


if __name__ == "__main__":
    main()
