#!/usr/bin/env python3
"""Fetch trending AI repositories from GitHub Search API and build github_trending.json.

Outputs:
- data/github_trending.json: AI repos with >= 1000 stars, bilingual descriptions
"""

from __future__ import annotations

import json
import os
import signal
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

try:
    from deep_translator import GoogleTranslator
except ImportError:
    GoogleTranslator = None

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT / "data" / "github_trending.json"
TRANSLATION_CACHE_FILE = ROOT / "data" / "translation_cache.json"

DEFAULT_TIMEOUT = 20
MIN_STARS = 1000
MAX_ITEMS = 80
PER_PAGE = 30
TRANSLATION_TIMEOUT_SECONDS = 8
TRANSLATION_FAILURE_LIMIT = 5

SEARCH_QUERIES = [
    "ai agent",
    "llm framework",
    "rag pipeline",
    "machine learning tool",
    "generative ai",
    "mcp server",
    "ai workflow automation",
    "vector database",
]

STAGE_UPSTREAM = {"research", "paper", "benchmark", "training", "dataset", "model", "pretrain", "fine-tune"}
STAGE_DOWNSTREAM = {"app", "tool", "workflow", "automation", "deploy", "production", "saas", "cli", "sdk"}


def _translation_timeout_handler(signum: int, frame: Any) -> None:
    raise TimeoutError("translation timed out")


def main() -> int:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    translator, cache = init_translator()
    translation_state = {"failures": 0, "disabled": False}

    print(f"[github-trending] starting, token={'yes' if token else 'no'}, queries={len(SEARCH_QUERIES)}")

    pushed_after = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    all_repos: dict[str, dict[str, Any]] = {}

    for query in SEARCH_QUERIES:
        full_query = f"{query} stars:>={MIN_STARS} pushed:>{pushed_after}"
        repos = search_github(full_query, token)
        for repo in repos:
            full_name = repo.get("full_name", "")
            if full_name and full_name not in all_repos:
                all_repos[full_name] = repo
        time.sleep(2)

    print(f"[github-trending] fetched {len(all_repos)} unique repos")

    items = []
    for repo in all_repos.values():
        item = normalize_repo(repo, translator, cache, translation_state)
        if item:
            items.append(item)

    items.sort(key=lambda x: x.get("metrics", {}).get("stars", 0), reverse=True)
    items = items[:MAX_ITEMS]

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "github-search-api",
        "total": len(items),
        "items": items,
    }

    write_json(OUTPUT_FILE, payload)
    save_translation_cache(cache)

    print(f"[github-trending] done: items={len(items)}")
    return 0


def search_github(query: str, token: str) -> list[dict[str, Any]]:
    url = "https://api.github.com/search/repositories"
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    params = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": PER_PAGE,
    }

    for attempt in range(3):
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=DEFAULT_TIMEOUT)
            if resp.status_code == 403:
                print(f"[github-trending] rate limited, waiting {10 * (attempt + 1)}s", file=sys.stderr)
                time.sleep(10 * (attempt + 1))
                continue
            if not resp.ok:
                print(f"[github-trending] search failed: {resp.status_code} q={query[:40]}", file=sys.stderr)
                return []
            data = resp.json()
            return data.get("items", []) if isinstance(data, dict) else []
        except Exception as err:
            print(f"[github-trending] search error: {err}", file=sys.stderr)
            if attempt < 2:
                time.sleep(5)
    return []


def normalize_repo(
    repo: dict[str, Any],
    translator: Any,
    cache: dict[str, str],
    translation_state: dict[str, Any],
) -> dict[str, Any] | None:
    full_name = safe_text(repo.get("full_name", ""))
    if not full_name:
        return None

    owner = safe_text(repo.get("owner", {}).get("login", "")) if isinstance(repo.get("owner"), dict) else ""
    name = safe_text(repo.get("name", ""))
    desc_original = safe_text(repo.get("description", ""))
    stars = to_non_negative_int(repo.get("stargazers_count"))
    forks = to_non_negative_int(repo.get("forks_count"))
    open_issues = to_non_negative_int(repo.get("open_issues_count"))
    language = safe_text(repo.get("language", ""))
    topics = repo.get("topics", []) if isinstance(repo.get("topics"), list) else []
    topics = [safe_text(t) for t in topics if safe_text(t)][:8]
    license_name = ""
    if isinstance(repo.get("license"), dict):
        license_name = safe_text(repo["license"].get("spdx_id", ""))
    pushed_at = safe_text(repo.get("pushed_at", ""))
    html_url = safe_text(repo.get("html_url", ""))

    desc_zh = translate_text(desc_original, translator, cache, translation_state) if desc_original else ""
    has_translation = bool(desc_zh and desc_zh != desc_original)

    stage = infer_stage(topics, desc_original)

    action = "高Star项目，建议深入阅读文档和社区讨论。"
    if stars < 5000:
        action = "值得关注的AI项目，建议动手试用并评估适用性。"
    elif stars < 10000:
        action = "优质项目，建议关注更新日志和版本变化。"

    base_tags = ["GitHub开源"]
    if language:
        base_tags.append(language)
    base_tags.extend(topics[:5])
    content_tags = dedupe(base_tags)[:8]

    return {
        "title": f"{full_name} · GitHub开源",
        "titleOriginal": f"{full_name} · GitHub Trending",
        "titleZh": f"{full_name} · GitHub开源",
        "summary": desc_zh or desc_original or "暂无描述",
        "summaryOriginal": desc_original or "No description",
        "summaryZh": desc_zh or desc_original or "暂无描述",
        "hasTranslation": has_translation,
        "platform": "GitHub",
        "region": "全球开源",
        "industryStage": stage,
        "contentTags": content_tags,
        "date": pushed_at[:10] if pushed_at else "",
        "action": action,
        "sourceUrl": html_url or f"https://github.com/{full_name}",
        "sourceName": full_name,
        "publishedAt": pushed_at,
        "metrics": {
            "stars": stars,
            "forks": forks,
            "openIssues": open_issues,
        },
        "repoMeta": {
            "owner": owner,
            "repo": name,
            "language": language,
            "topics": topics,
            "license": license_name,
            "lastPushedAt": pushed_at,
        },
    }


def infer_stage(topics: list[str], description: str) -> str:
    text = " ".join(topics + [description]).lower()
    up_score = sum(1 for kw in STAGE_UPSTREAM if kw in text)
    down_score = sum(1 for kw in STAGE_DOWNSTREAM if kw in text)
    if up_score > down_score:
        return "上游"
    if down_score > up_score:
        return "下游"
    return "中游"


def init_translator() -> tuple[Any, dict[str, str]]:
    cache = load_translation_cache()
    if GoogleTranslator is None:
        return None, cache
    try:
        translator = GoogleTranslator(source="en", target="zh-CN")
        return translator, cache
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
                f"[github-trending] translation disabled after {failures} failures: {type(err).__name__}: {err}",
                file=sys.stderr,
            )
        else:
            print(f"[github-trending] translate error: {err}", file=sys.stderr)
    return text


def has_cjk(text: str) -> bool:
    for ch in text:
        code = ord(ch)
        if 0x4E00 <= code <= 0x9FFF or 0x3400 <= code <= 0x4DBF:
            return True
    return False


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
        print(f"[github-trending] cache save error: {err}", file=sys.stderr)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def safe_text(value: Any) -> str:
    return str(value or "").strip()


def to_non_negative_int(value: Any) -> int:
    try:
        parsed = int(float(str(value)))
    except Exception:
        return 0
    return max(parsed, 0)


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
