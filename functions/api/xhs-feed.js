import {
  cacheKeyForRequest,
  jsonResponse,
  parsePositiveInt
} from "./_lib/intel.js";

const CACHE_TTL_SECONDS = 180;
const LOCAL_FALLBACK_PATH = "/data/xhs_feed.json";

const FALLBACK_ITEMS = [
  {
    title: "小红书聚合已启用，等待接入你的监控列表",
    titleOriginal: "Xiaohongshu aggregation is enabled. Waiting for your watchlist.",
    titleZh: "小红书聚合已启用，等待接入你的监控列表",
    summary: "下一步可把你关注的博主或关键词结果写入 data/xhs_feed.json，页面会自动展示。",
    summaryOriginal: "Next, sync your creator watchlist into data/xhs_feed.json and this page will render it automatically.",
    summaryZh: "下一步可把你关注的博主或关键词结果写入 data/xhs_feed.json，页面会自动展示。",
    hasTranslation: true,
    platform: "小红书",
    region: "中文社媒",
    industryStage: "下游",
    contentTags: ["小红书", "聚合"],
    date: new Date().toISOString().slice(0, 10),
    action: "先提供账号名单，我会接成自动聚合流。",
    sourceUrl: "https://www.xiaohongshu.com",
    sourceName: "小红书",
    publishedAt: new Date().toISOString()
  }
];

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return jsonResponse(
      {
        ok: false,
        error: "method_not_allowed"
      },
      405,
      "no-store"
    );
  }

  const cache = caches.default;
  const cacheKey = cacheKeyForRequest(request, "/api/xhs-feed");
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 80, 200);
  const query = String(url.searchParams.get("q") || "").trim().toLowerCase();

  try {
    const payload = await loadXhsPayload(request, env);
    let items = Array.isArray(payload.items) ? payload.items.map(normalizeXhsItem) : [];

    if (query) {
      items = items.filter((item) => {
        const pool = `${item.title || ""} ${item.summary || ""} ${item.sourceName || ""} ${(item.contentTags || []).join(" ")}`.toLowerCase();
        return pool.includes(query);
      });
    }

    items = items
      .sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""))
      .slice(0, limit);

    const response = jsonResponse(
      {
        ok: true,
        source: payload.source,
        generatedAt: payload.generatedAt || new Date().toISOString(),
        count: items.length,
        items: items.length ? items : FALLBACK_ITEMS
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
        error: "xhs_feed_fetch_failed",
        message: String(error?.message || error || "unknown_error")
      },
      502,
      "no-store"
    );
  }
}

async function loadXhsPayload(request, env) {
  const remoteUrl = safeHttpUrl(env?.XHS_FEED_URL || "");
  if (remoteUrl) {
    const remote = await fetchJson(remoteUrl, 15);
    if (remote) {
      return {
        source: "xhs-remote-feed",
        generatedAt: remote.generatedAt || new Date().toISOString(),
        items: Array.isArray(remote.items) ? remote.items : []
      };
    }
  }

  const localUrl = new URL(LOCAL_FALLBACK_PATH, request.url).toString();
  const local = await fetchJson(localUrl, 10);
  if (local) {
    return {
      source: "xhs-local-feed",
      generatedAt: local.generatedAt || new Date().toISOString(),
      items: Array.isArray(local.items) ? local.items : []
    };
  }

  return {
    source: "xhs-fallback",
    generatedAt: new Date().toISOString(),
    items: FALLBACK_ITEMS
  };
}

async function fetchJson(url, cacheTtl) {
  try {
    const response = await fetch(url, {
      cf: {
        cacheEverything: true,
        cacheTtl
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function normalizeXhsItem(raw) {
  const title = toTitle(
    raw?.title || raw?.titleZh || raw?.noteTitle || raw?.note_title || raw?.content || raw?.summary || ""
  );

  const summary = safeText(
    raw?.summary || raw?.desc || raw?.description || raw?.content || raw?.title || ""
  );

  const sourceName =
    safeText(raw?.sourceName || raw?.author || raw?.nickname || raw?.user || "") || "小红书";

  const noteId = safeText(raw?.noteId || raw?.note_id || raw?.id || "");
  const sourceUrl =
    safeHttpUrl(raw?.sourceUrl || raw?.url || raw?.link || raw?.noteUrl || raw?.note_url || "") ||
    (noteId ? `https://www.xiaohongshu.com/explore/${encodeURIComponent(noteId)}` : "https://www.xiaohongshu.com");

  const publishedAt = normalizeDate(raw?.publishedAt || raw?.publishTime || raw?.date || raw?.time || "");
  const tags = normalizeTags(raw?.contentTags || raw?.tags || raw?.topics || []);

  return {
    title,
    titleOriginal: title,
    titleZh: title,
    summary,
    summaryOriginal: summary,
    summaryZh: summary,
    hasTranslation: false,
    platform: "小红书",
    region: "中文社媒",
    industryStage: "下游",
    contentTags: tags.length ? tags : ["小红书"],
    date: publishedAt.slice(0, 10),
    action: "观察评论区与收藏趋势，提炼真实用户需求。",
    sourceUrl,
    sourceName,
    publishedAt
  };
}

function normalizeTags(input) {
  if (Array.isArray(input)) {
    return unique(
      input
        .map((tag) => safeText(tag).replace(/^#/, ""))
        .filter((tag) => Boolean(tag))
    ).slice(0, 8);
  }

  return unique(
    String(input || "")
      .split(/[\s,，]+/)
      .map((tag) => safeText(tag).replace(/^#/, ""))
      .filter((tag) => Boolean(tag))
  ).slice(0, 8);
}

function toTitle(value) {
  const text = safeText(value);
  if (!text) {
    return "小红书内容更新";
  }
  return text.length > 88 ? `${text.slice(0, 88)}...` : text;
}

function normalizeDate(value) {
  const parsed = Date.parse(String(value || ""));
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

function safeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return Array.from(new Set(values));
}

function safeHttpUrl(rawUrl) {
  const text = String(rawUrl || "").trim();
  if (!text) {
    return "";
  }

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}
