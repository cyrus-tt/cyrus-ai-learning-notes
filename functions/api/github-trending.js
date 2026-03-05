import {
  cacheKeyForRequest,
  jsonResponse,
  normalizeGithubRepoItem,
  parsePositiveInt
} from "./_lib/intel.js";

const CACHE_TTL_SECONDS = 300;
const LOCAL_FALLBACK_PATH = "/data/github_trending.json";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, "no-store");
  }

  const cache = caches.default;
  const cacheKey = cacheKeyForRequest(request, "/api/github-trending");
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 100);
  const query = String(url.searchParams.get("q") || "").trim().toLowerCase();
  const langFilter = String(url.searchParams.get("lang") || "").trim().toLowerCase();
  const requestedMinStars = parsePositiveInt(url.searchParams.get("minStars"), 1000, 1000000);
  const minStars = Math.max(1000, requestedMinStars);

  try {
    const payload = await loadGithubPayload(request, env);
    let items = Array.isArray(payload.items) ? payload.items.map(normalizeGithubRepoItem) : [];

    if (query) {
      items = items.filter((item) => {
        const pool = `${item.title || ""} ${item.summary || ""} ${item.sourceName || ""} ${(item.contentTags || []).join(" ")} ${(item.repoMeta?.topics || []).join(" ")}`.toLowerCase();
        return pool.includes(query);
      });
    }

    if (langFilter) {
      items = items.filter((item) => {
        const lang = (item.repoMeta?.language || "").toLowerCase();
        return lang === langFilter;
      });
    }

    items = items.filter((item) => (item.metrics?.stars || 0) >= minStars);

    items = items
      .sort((a, b) => (b.metrics?.stars || 0) - (a.metrics?.stars || 0))
      .slice(0, limit);

    const response = jsonResponse(
      {
        ok: true,
        source: payload.source,
        generatedAt: payload.generatedAt || new Date().toISOString(),
        count: items.length,
        items: items.length ? items : buildFallbackItems()
      },
      200,
      `public, max-age=${CACHE_TTL_SECONDS}`
    );

    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "github_trending_fetch_failed",
        message: String(error?.message || error || "unknown_error")
      },
      502,
      "no-store"
    );
  }
}

async function loadGithubPayload(request, env) {
  const remoteUrl = safeHttpUrl(env?.GITHUB_TRENDING_URL || "");
  if (remoteUrl) {
    const remote = await fetchJson(remoteUrl, 30);
    if (remote) {
      return {
        source: "github-remote",
        generatedAt: remote.generatedAt || new Date().toISOString(),
        items: Array.isArray(remote.items) ? remote.items : []
      };
    }
  }

  const localUrl = new URL(LOCAL_FALLBACK_PATH, request.url).toString();
  const local = await fetchJson(localUrl, 15);
  if (local) {
    return {
      source: "github-local",
      generatedAt: local.generatedAt || new Date().toISOString(),
      items: Array.isArray(local.items) ? local.items : []
    };
  }

  return {
    source: "github-fallback",
    generatedAt: new Date().toISOString(),
    items: buildFallbackItems()
  };
}

async function fetchJson(url, cacheTtl) {
  try {
    const response = await fetch(url, {
      cf: { cacheEverything: true, cacheTtl }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function safeHttpUrl(rawUrl) {
  const text = String(rawUrl || "").trim();
  if (!text) return "";
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function buildFallbackItems() {
  const now = new Date().toISOString();
  return [
    {
      title: "GitHub开源聚合已启用",
      titleOriginal: "GitHub trending aggregation is enabled",
      titleZh: "GitHub开源聚合已启用，等待下一次数据更新",
      summary: "GitHub 热门 AI 项目聚合已就绪，等待 scripts/build_github_trending.py 生成数据。",
      summaryOriginal: "GitHub trending AI project aggregation is ready.",
      summaryZh: "GitHub 热门 AI 项目聚合已就绪，等待 scripts/build_github_trending.py 生成数据。",
      hasTranslation: true,
      platform: "GitHub",
      region: "全球开源",
      industryStage: "中游",
      contentTags: ["GitHub开源"],
      date: now.slice(0, 10),
      action: "运行 build_github_trending.py 即可刷新项目列表。",
      sourceUrl: "https://github.com/trending",
      sourceName: "GitHub",
      publishedAt: now,
      metrics: { stars: 0, forks: 0, openIssues: 0 }
    }
  ];
}
