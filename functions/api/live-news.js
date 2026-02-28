import {
  cacheKeyForRequest,
  jsonResponse,
  parseCsv,
  parsePositiveInt
} from "./_lib/intel.js";

const CACHE_TTL_SECONDS = 180;
const MAX_ITEMS_PER_TOPIC = 20;
const DEFAULT_TOPICS = ["电商", "国家政策", "经济", "科技", "互联网"];

const TOPIC_STAGE = {
  电商: "下游",
  国家政策: "上游",
  经济: "上游",
  科技: "中游",
  互联网: "中游"
};

const TOPIC_ACTION = {
  电商: "关注平台规则、商家成本与用户转化变化。",
  国家政策: "重点标记政策发布日期与执行范围。",
  经济: "关注宏观数据与市场预期偏差。",
  科技: "跟踪技术节点与产业化进展。",
  互联网: "观察平台产品节奏与商业模式变化。"
};

export async function onRequest(context) {
  const { request } = context;

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
  const cacheKey = cacheKeyForRequest(request, "/api/live-news");
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 80, 150);
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 100);

  const topics = parseCsv(url.searchParams.get("topics") || "", 12)
    .map((topic) => topic.slice(0, 24))
    .filter((topic) => Boolean(topic));

  const topicList = topics.length ? topics : DEFAULT_TOPICS;

  try {
    const byTopic = await Promise.all(
      topicList.map((topic) => fetchTopicNews(topic, query))
    );

    const merged = byTopic.flat();
    const uniqueItems = dedupeItems(merged)
      .sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""))
      .slice(0, limit);

    const response = jsonResponse(
      {
        ok: true,
        source: "google-news-rss",
        generatedAt: new Date().toISOString(),
        filters: {
          topics: topicList,
          query: query || null
        },
        count: uniqueItems.length,
        items: uniqueItems
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
        error: "live_news_fetch_failed",
        message: String(error?.message || error || "unknown_error")
      },
      502,
      "no-store"
    );
  }
}

async function fetchTopicNews(topic, query) {
  const q = buildGoogleNewsQuery(topic, query);
  const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;

  const response = await fetch(feedUrl, {
    cf: {
      cacheEverything: true,
      cacheTtl: CACHE_TTL_SECONDS
    }
  });

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  const rssItems = parseRssItems(xml).slice(0, MAX_ITEMS_PER_TOPIC);

  return rssItems.map((item) => normalizeLiveNewsItem(item, topic));
}

function buildGoogleNewsQuery(topic, query) {
  const tokens = [topic, query].filter((item) => Boolean(item));
  return `${tokens.join(" ")} when:1d`;
}

function parseRssItems(xml) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return blocks.map((block) => {
    const title = decodeEntities(stripTags(extractTag(block, "title")));
    const link = decodeEntities(stripTags(extractTag(block, "link")));
    const pubDate = decodeEntities(stripTags(extractTag(block, "pubDate")));
    const description = decodeEntities(stripTags(extractTag(block, "description")));
    const sourceRaw = extractTag(block, "source");
    const source = decodeEntities(stripTags(sourceRaw));

    return {
      title: title || "实时资讯",
      link,
      pubDate,
      description,
      source
    };
  });
}

function normalizeLiveNewsItem(item, topic) {
  const publishedAt = normalizeDate(item.pubDate);
  const sourceUrl = safeHttpUrl(item.link);
  const summary = item.description || item.title;
  const sourceName = item.source || guessSourceName(sourceUrl) || "Google News";

  return {
    title: item.title,
    titleOriginal: item.title,
    titleZh: item.title,
    summary,
    summaryOriginal: summary,
    summaryZh: summary,
    hasTranslation: false,
    platform: sourceName,
    region: "全球资讯",
    industryStage: TOPIC_STAGE[topic] || "中游",
    contentTags: ["实时新闻", topic],
    date: publishedAt.slice(0, 10),
    action: TOPIC_ACTION[topic] || "先看政策和数据，再做动作判断。",
    sourceUrl,
    sourceName,
    publishedAt
  };
}

function dedupeItems(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = `${item.sourceUrl || ""}|${item.title || ""}`;
    if (!key.trim() || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}

function extractTag(block, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(regex);
  return match ? match[1] : "";
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeDate(input) {
  const parsed = Date.parse(String(input || ""));
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

function safeHttpUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function guessSourceName(url) {
  if (!url) {
    return "";
  }

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname || "";
  } catch {
    return "";
  }
}
