import {
  cacheKeyForRequest,
  jsonResponse,
  normalizeYtVideoItem,
  parsePositiveInt
} from "./_lib/intel.js";

const CACHE_TTL_SECONDS = 180;
const YT_RSS_CACHE_TTL_SECONDS = 120;
const LOCAL_FALLBACK_PATH = "/data/yt_feed.json";
const LOCAL_WATCHLIST_PATH = "/data/yt_watchlist.json";
const CUSTOM_CHANNEL_FETCH_LIMIT = 20;
const PER_CUSTOM_CHANNEL_ITEM_LIMIT = 3;
const SUMMARY_MAX_LEN = 700;
const SUMMARY_AI_SCAN_LEN = 260;
const AI_THEME_KEYWORDS = [
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
  "提示词"
];

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, "no-store");
  }

  const cache = caches.default;
  const cacheKey = cacheKeyForRequest(request, "/api/yt-feed");
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 80, 200);
  const query = String(url.searchParams.get("q") || "").trim().toLowerCase();

  try {
    const payload = await loadYtPayload(request, env);
    const staticWatchlist = await loadWatchlist(request, env);
    const customWatchlist = await loadCustomWatchlist(env);
    const mergedWatchlist = mergeWatchlists(staticWatchlist, customWatchlist);

    let items = Array.isArray(payload.items) ? payload.items.map(normalizeYtVideoItem) : [];
    const customChannelItems = await loadCustomChannelItems(customWatchlist);
    if (customChannelItems.length) {
      items = [
        ...customChannelItems.map((item) => normalizeYtVideoItem(item)),
        ...items
      ];
    }
    items = dedupeYtItems(items).filter((item) => isAiRelatedYtItem(item));
    const watchlist = applyWatchlistStats(mergedWatchlist, items);

    if (query) {
      items = items.filter((item) => {
        const pool = `${item.title || ""} ${item.titleOriginal || ""} ${item.titleZh || ""} ${item.summary || ""} ${item.sourceName || ""} ${(item.contentTags || []).join(" ")}`.toLowerCase();
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
        items: items.length ? items : buildFallbackItems(),
        watchlist: watchlist
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
        error: "yt_feed_fetch_failed",
        message: String(error?.message || error || "unknown_error")
      },
      502,
      "no-store"
    );
  }
}

async function loadYtPayload(request, env) {
  const remoteUrl = safeHttpUrl(env?.YT_FEED_URL || "");
  if (remoteUrl) {
    const remote = await fetchJson(remoteUrl, 15);
    if (remote) {
      return {
        source: "yt-remote-feed",
        generatedAt: remote.generatedAt || new Date().toISOString(),
        items: Array.isArray(remote.items) ? remote.items : []
      };
    }
  }

  const localUrl = new URL(LOCAL_FALLBACK_PATH, request.url).toString();
  const local = await fetchJson(localUrl, 10);
  if (local) {
    return {
      source: "yt-local-feed",
      generatedAt: local.generatedAt || new Date().toISOString(),
      items: Array.isArray(local.items) ? local.items : []
    };
  }

  return {
    source: "yt-fallback",
    generatedAt: new Date().toISOString(),
    items: buildFallbackItems()
  };
}

async function loadWatchlist(request, env) {
  const localUrl = new URL(LOCAL_WATCHLIST_PATH, request.url).toString();
  const data = await fetchJson(localUrl, 30);
  if (data && Array.isArray(data.channels)) {
    return data.channels.map((ch) => ({
      channelId: String(ch?.channelId || "").trim(),
      name: String(ch?.name || "").trim(),
      tags: Array.isArray(ch?.tags) ? ch.tags : [],
      latestVideoAt: String(ch?.latestVideoAt || "").trim(),
      videoCount: Number(ch?.videoCount) || 0
    })).filter((ch) => ch.channelId);
  }
  return [];
}

async function loadCustomWatchlist(env) {
  const db = env?.DB;
  if (!db) {
    return [];
  }

  try {
    const result = await db
      .prepare(
        "SELECT username, display_name, notes FROM custom_watchlist WHERE platform = ? ORDER BY added_at DESC LIMIT 200"
      )
      .bind("youtube")
      .all();

    const rows = Array.isArray(result?.results) ? result.results : [];
    return rows
      .map((row) => ({
        channelId: String(row?.username || "").trim(),
        name: String(row?.display_name || row?.username || "").trim(),
        tags: ["自定义关注"],
        latestVideoAt: "",
        videoCount: 0,
        notes: String(row?.notes || "").trim()
      }))
      .filter((row) => row.channelId);
  } catch {
    return [];
  }
}

function mergeWatchlists(...groups) {
  const merged = new Map();
  for (const group of groups) {
    const list = Array.isArray(group) ? group : [];
    for (const row of list) {
      const normalized = normalizeWatchlistChannel(row);
      if (!normalized?.channelId) {
        continue;
      }

      const key = normalized.channelId.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, normalized);
        continue;
      }

      const prev = merged.get(key);
      merged.set(key, {
        channelId: prev.channelId,
        name: prev.name || normalized.name,
        tags: unique([...(prev.tags || []), ...(normalized.tags || [])]).slice(0, 8),
        latestVideoAt: newerDate(prev.latestVideoAt, normalized.latestVideoAt),
        videoCount: Math.max(Number(prev.videoCount) || 0, Number(normalized.videoCount) || 0)
      });
    }
  }
  return Array.from(merged.values());
}

function normalizeWatchlistChannel(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const channelId = String(raw?.channelId || raw?.username || "").trim();
  if (!channelId) {
    return null;
  }

  const name = String(raw?.name || raw?.displayName || raw?.display_name || channelId).trim() || channelId;
  const tags = Array.isArray(raw?.tags) ? raw.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : [];

  return {
    channelId,
    name,
    tags: unique(tags).slice(0, 8),
    latestVideoAt: String(raw?.latestVideoAt || "").trim(),
    videoCount: Number(raw?.videoCount) || 0
  };
}

async function loadCustomChannelItems(customWatchlist) {
  const channels = Array.isArray(customWatchlist) ? customWatchlist.slice(0, CUSTOM_CHANNEL_FETCH_LIMIT) : [];
  if (!channels.length) {
    return [];
  }

  const settled = await Promise.allSettled(channels.map((channel) => fetchChannelItems(channel)));
  const items = [];
  for (const result of settled) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      items.push(...result.value);
    }
  }
  return items;
}

async function fetchChannelItems(channel) {
  const channelId = String(channel?.channelId || "").trim();
  if (!channelId) {
    return [];
  }

  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  try {
    const response = await fetch(rssUrl, {
      cf: { cacheEverything: true, cacheTtl: YT_RSS_CACHE_TTL_SECONDS }
    });
    if (!response.ok) {
      return [];
    }

    const xmlText = await response.text();
    return parseYoutubeFeedEntries(xmlText, channel).slice(0, PER_CUSTOM_CHANNEL_ITEM_LIMIT);
  } catch {
    return [];
  }
}

function parseYoutubeFeedEntries(xmlText, channel) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entry = match[1] || "";
    const videoId = decodeXmlEntity(extractTag(entry, "yt:videoId"));
    const title = decodeXmlEntity(extractTag(entry, "title"));
    if (!videoId || !title) {
      continue;
    }

    const publishedAt = toIsoDateTime(extractTag(entry, "published"));
    const author = decodeXmlEntity(extractTag(entry, "name")) || String(channel?.name || channel?.channelId || "YouTube");
    const summary =
      decodeXmlEntity(extractTag(entry, "media:description")) ||
      decodeXmlEntity(extractTag(entry, "content")) ||
      title;
    const normalizedSummary = truncateText(summary, SUMMARY_MAX_LEN);
    const aiScanPool = title.toLowerCase();
    if (!containsAiKeyword(aiScanPool)) {
      continue;
    }

    const sourceUrl =
      decodeXmlEntity(extractAttribute(entry, /<link[^>]*href="([^"]+)"[^>]*\/?>/i)) ||
      `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

    const thumbnailUrl =
      decodeXmlEntity(extractAttribute(entry, /<media:thumbnail[^>]*url="([^"]+)"[^>]*\/?>/i)) ||
      `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;

    entries.push({
      title,
      titleOriginal: title,
      titleZh: title,
      summary: normalizedSummary,
      summaryOriginal: normalizedSummary,
      summaryZh: normalizedSummary,
      hasTranslation: false,
      platform: "YouTube",
      region: "海外",
      industryStage: "中游",
      contentTags: unique(["YouTube监控", "自定义关注", ...(Array.isArray(channel?.tags) ? channel.tags : [])]).slice(0, 8),
      date: publishedAt.slice(0, 10),
      action: "值得观看的AI视频，建议收藏并提取关键信息。",
      sourceUrl,
      sourceName: author,
      publishedAt,
      channelName: author,
      channelId: String(channel?.channelId || ""),
      videoId,
      thumbnailUrl
    });
  }

  return entries;
}

function extractTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = regex.exec(String(xml || ""));
  return match ? match[1] : "";
}

function extractAttribute(xml, regex) {
  const match = regex.exec(String(xml || ""));
  return match ? match[1] : "";
}

function decodeXmlEntity(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function toIsoDateTime(value) {
  const parsed = Date.parse(String(value || ""));
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

function dedupeYtItems(items) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const key = String(item?.ytMeta?.videoId || item?.sourceUrl || "").trim();
    if (key && seen.has(key)) {
      continue;
    }
    if (key) {
      seen.add(key);
    }
    deduped.push(item);
  }

  return deduped;
}

function isAiRelatedYtItem(item) {
  const title = String(item?.titleOriginal || item?.title || "").trim();
  const pool = title.toLowerCase();
  return containsAiKeyword(pool);
}

function containsAiKeyword(text) {
  for (const keyword of AI_THEME_KEYWORDS) {
    if (!keyword) {
      continue;
    }

    if (isAsciiWord(keyword) && keyword.length <= 3) {
      const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
      if (pattern.test(text)) {
        return true;
      }
      continue;
    }

    if (text.includes(keyword)) {
      return true;
    }
  }
  return false;
}

function isAsciiWord(value) {
  return /^[A-Za-z-]+$/.test(String(value || ""));
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truncateText(text, maxLen) {
  const normalized = String(text || "").trim();
  if (normalized.length <= maxLen) {
    return normalized;
  }
  return `${normalized.slice(0, maxLen)}...`;
}

function applyWatchlistStats(watchlist, items) {
  const stats = new Map();
  const rows = Array.isArray(items) ? items : [];

  for (const item of rows) {
    const channelId = String(item?.ytMeta?.channelId || "").trim();
    if (!channelId) {
      continue;
    }
    const key = channelId.toLowerCase();
    const prev = stats.get(key) || { videoCount: 0, latestVideoAt: "" };
    stats.set(key, {
      videoCount: prev.videoCount + 1,
      latestVideoAt: newerDate(prev.latestVideoAt, item?.publishedAt)
    });
  }

  return (Array.isArray(watchlist) ? watchlist : []).map((channel) => {
    const key = String(channel?.channelId || "").toLowerCase();
    const stat = stats.get(key);
    if (!stat) {
      return channel;
    }
    return {
      ...channel,
      videoCount: Math.max(Number(channel?.videoCount) || 0, stat.videoCount),
      latestVideoAt: newerDate(channel?.latestVideoAt, stat.latestVideoAt)
    };
  });
}

function newerDate(a, b) {
  const tsA = Date.parse(String(a || "")) || 0;
  const tsB = Date.parse(String(b || "")) || 0;
  return tsB > tsA ? String(b || "") : String(a || "");
}

function unique(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter((value) => Boolean(value))));
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
      title: "YouTube监控已启用",
      titleOriginal: "YouTube monitoring is enabled",
      titleZh: "YouTube监控已启用，等待下一次数据更新",
      summary: "YouTube RSS 聚合已就绪，等待 scripts/build_yt_watchlist.py 生成数据。",
      summaryOriginal: "YouTube RSS aggregation is ready.",
      summaryZh: "YouTube RSS 聚合已就绪，等待 scripts/build_yt_watchlist.py 生成数据。",
      hasTranslation: true,
      platform: "YouTube",
      region: "海外",
      industryStage: "中游",
      contentTags: ["YouTube监控"],
      date: now.slice(0, 10),
      action: "运行 build_yt_watchlist.py 即可刷新视频列表。",
      sourceUrl: "https://www.youtube.com",
      sourceName: "YouTube",
      publishedAt: now,
      ytMeta: { channelId: "", videoId: "", thumbnailUrl: "" }
    }
  ];
}
