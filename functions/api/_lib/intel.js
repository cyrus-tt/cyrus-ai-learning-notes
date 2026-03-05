const OPENNEWS_API_BASE_DEFAULT = "https://ai.6551.io";
const TWITTER_API_BASE_DEFAULT = "https://ai.6551.io";

const SIGNAL_ACTIONS = {
  long: "信号偏多，建议结合量价与仓位风控跟踪。",
  short: "信号偏空，建议收缩风险敞口并设置止损。",
  neutral: "信号中性，建议等待下一次确认信号。"
};

const ENGINE_STAGE = {
  onchain: "上游",
  market: "上游",
  news: "中游",
  meme: "中游",
  listing: "下游"
};

export function resolveNewsToken(env) {
  return safeText(env?.OPENNEWS_TOKEN || env?.TOKEN_6551 || env?.TWITTER_TOKEN);
}

export function resolveTwitterToken(env) {
  return safeText(env?.TWITTER_TOKEN || env?.OPENNEWS_TOKEN || env?.TOKEN_6551);
}

export function getOpennewsBase(env) {
  return safeUrlBase(env?.OPENNEWS_API_BASE || OPENNEWS_API_BASE_DEFAULT);
}

export function getTwitterBase(env) {
  return safeUrlBase(env?.TWITTER_API_BASE || TWITTER_API_BASE_DEFAULT);
}

export function parsePositiveInt(input, fallbackValue, maxValue = 100) {
  const parsed = Number.parseInt(String(input ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return Math.min(parsed, maxValue);
}

export function parseBoolean(input, fallbackValue = false) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) {
    return fallbackValue;
  }
  if (raw === "1" || raw === "true" || raw === "yes") {
    return true;
  }
  if (raw === "0" || raw === "false" || raw === "no") {
    return false;
  }
  return fallbackValue;
}

export function parseCsv(input, maxLength = 20) {
  return String(input ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => Boolean(part))
    .slice(0, maxLength);
}

export function normalizeMarketItem(raw) {
  const text = safeText(raw?.text);
  const ai = raw?.aiRating || {};
  const coins = Array.isArray(raw?.coins)
    ? raw.coins
        .map((coin) => safeText(coin?.symbol || coin?.coin || coin?.name).toUpperCase())
        .filter((symbol) => Boolean(symbol))
    : [];
  const signal = safeText(ai?.signal).toLowerCase();
  const summaryZh = safeText(ai?.summary || "");
  const summaryEn = safeText(ai?.enSummary || "");
  const score = Number.isFinite(Number(ai?.score)) ? Number(ai.score) : null;
  const published = toIsoDateTime(raw?.ts);
  const title = toHeadline(text);

  const baseTags = [safeText(raw?.engineType), safeText(raw?.newsType), ...coins]
    .filter((tag) => Boolean(tag))
    .slice(0, 8);

  if (signal) {
    baseTags.push(`signal:${signal}`);
  }

  return {
    title,
    titleOriginal: title,
    titleZh: title,
    summary: summaryZh || summaryEn || text,
    summaryOriginal: summaryEn || text,
    summaryZh: summaryZh || text,
    hasTranslation: Boolean(summaryZh && summaryEn),
    platform: safeText(raw?.newsType || raw?.engineType || "6551 新闻"),
    region: "全球市场",
    industryStage: ENGINE_STAGE[safeText(raw?.engineType).toLowerCase()] || "中游",
    contentTags: unique(baseTags),
    date: toDateOnly(published),
    action: SIGNAL_ACTIONS[signal] || "关注关键信息并结合风控执行。",
    sourceUrl: safeHttpUrl(raw?.link),
    sourceName: safeText(raw?.newsType || raw?.engineType || "6551"),
    publishedAt: published,
    aiScore: score,
    signal,
    coins
  };
}

export function normalizeTweetItem(raw) {
  const text = safeText(raw?.text);
  const username = safeText(raw?.userScreenName || raw?.screenName || raw?.username).replace(/^@+/, "");
  const tweetId = safeText(raw?.id);
  const createdAt = toIsoDateTime(raw?.createdAt);
  const retweets = toNonNegativeInt(raw?.retweetCount);
  const likes = toNonNegativeInt(raw?.favoriteCount);
  const replies = toNonNegativeInt(raw?.replyCount);
  const engagement = likes + retweets * 2 + replies * 2;
  const action =
    engagement >= 1200
      ? "高互动推文，建议加入重点观察名单。"
      : engagement >= 300
      ? "中等互动推文，可纳入日内情绪跟踪。"
      : "低互动推文，建议结合更多信号再判断。";

  const hashtags = Array.isArray(raw?.hashtags)
    ? raw.hashtags.map((tag) => safeText(tag).replace(/^#/, "")).filter((tag) => Boolean(tag))
    : [];

  return {
    title: `@${username || "unknown"} · X监控`,
    titleOriginal: `@${username || "unknown"} · X monitor`,
    titleZh: `@${username || "unknown"} · X监控`,
    summary: text,
    summaryOriginal: text,
    summaryZh: text,
    hasTranslation: false,
    platform: "X/Twitter",
    region: "全球社媒",
    industryStage: "中游",
    contentTags: unique(["X监控", ...hashtags]).slice(0, 8),
    date: toDateOnly(createdAt),
    action,
    sourceUrl: buildTweetUrl(raw, username, tweetId),
    sourceName: username ? `@${username}` : "X",
    publishedAt: createdAt,
    metrics: {
      likes,
      retweets,
      replies
    }
  };
}

export async function request6551Json({
  baseUrl,
  token,
  endpoint,
  body,
  method = "POST",
  timeoutMs = 10000
}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetchWithTimeout(
    url,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: method === "GET" ? undefined : JSON.stringify(body || {})
    },
    timeoutMs
  );

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new Error(`6551_request_failed:${response.status}:${detail.slice(0, 200)}`);
  }

  const payload = await response.json();
  return payload && typeof payload === "object" ? payload : {};
}

export function cacheKeyForRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), { method: "GET" });
}

export function jsonResponse(body, status = 200, cacheControl = "public, max-age=60") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": cacheControl
    }
  });
}

export function normalizeGithubRepoItem(raw) {
  const owner = safeText(raw?.owner?.login || raw?.owner || "");
  const repo = safeText(raw?.name || raw?.repo || "");
  const fullName = safeText(raw?.full_name || (owner && repo ? `${owner}/${repo}` : ""));
  const descOriginal = safeText(raw?.description || raw?.desc || "");
  const descZh = safeText(raw?.descriptionZh || raw?.summaryZh || descOriginal);
  const stars = toNonNegativeInt(raw?.stargazers_count || raw?.stars);
  const forks = toNonNegativeInt(raw?.forks_count || raw?.forks);
  const openIssues = toNonNegativeInt(raw?.open_issues_count || raw?.openIssues);
  const language = safeText(raw?.language || "");
  const topics = Array.isArray(raw?.topics) ? raw.topics.map(String).filter(Boolean).slice(0, 8) : [];
  const license = safeText(raw?.license?.spdx_id || raw?.license?.name || raw?.licenseName || "");
  const pushedAt = toIsoDateTime(raw?.pushed_at || raw?.lastPushedAt || raw?.updated_at || "");
  const htmlUrl = safeHttpUrl(raw?.html_url || raw?.sourceUrl || "");
  const hasTranslation = Boolean(descZh && descOriginal && descZh !== descOriginal);

  const action = stars >= 10000
    ? "高Star项目，建议深入阅读文档和社区讨论。"
    : stars >= 5000
    ? "优质项目，建议关注更新日志和版本变化。"
    : "值得关注的AI项目，建议动手试用并评估适用性。";

  const baseTags = ["GitHub开源"];
  if (language) baseTags.push(language);
  baseTags.push(...topics.slice(0, 5));

  return {
    title: `${fullName || repo || "unknown"} · GitHub开源`,
    titleOriginal: `${fullName || repo || "unknown"} · GitHub Trending`,
    titleZh: `${fullName || repo || "unknown"} · GitHub开源`,
    summary: descZh || descOriginal || "暂无描述",
    summaryOriginal: descOriginal || "No description",
    summaryZh: descZh || descOriginal || "暂无描述",
    hasTranslation,
    platform: "GitHub",
    region: "全球开源",
    industryStage: inferGithubStage(topics, descOriginal),
    contentTags: unique(baseTags).slice(0, 8),
    date: toDateOnly(pushedAt),
    action,
    sourceUrl: htmlUrl || `https://github.com/${fullName || ""}`,
    sourceName: fullName || repo || "GitHub",
    publishedAt: pushedAt,
    metrics: { stars, forks, openIssues },
    repoMeta: { owner, repo, language, topics, license, lastPushedAt: pushedAt }
  };
}

export function normalizeYtVideoItem(raw) {
  const titleOriginal = safeText(raw?.title || raw?.titleOriginal || "");
  const titleZh = safeText(raw?.titleZh || titleOriginal);
  const channelName = safeText(raw?.channelName || raw?.sourceName || raw?.author || "");
  const channelId = safeText(raw?.channelId || "");
  const videoId = safeText(raw?.videoId || raw?.yt_videoid || "");
  const publishedAt = toIsoDateTime(raw?.publishedAt || raw?.published || "");
  const summary = safeText(raw?.summaryZh || raw?.summary || raw?.description || titleZh);
  const summaryOriginal = safeText(raw?.summaryOriginal || raw?.description || titleOriginal);
  const thumbnail = safeHttpUrl(raw?.thumbnailUrl || raw?.thumbnail || "");
  const hasTranslation = Boolean(titleZh && titleOriginal && titleZh !== titleOriginal);
  const tags = Array.isArray(raw?.tags) ? raw.tags.map(String).filter(Boolean) : [];

  const sourceUrl = videoId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
    : safeHttpUrl(raw?.sourceUrl || raw?.link || "");

  return {
    title: `${channelName || "YouTube"} · YouTube监控`,
    titleOriginal: titleOriginal || "YouTube video",
    titleZh: titleZh || titleOriginal || "YouTube视频",
    summary: summary || "暂无摘要",
    summaryOriginal: summaryOriginal || summary || "No summary",
    summaryZh: summary || "暂无摘要",
    hasTranslation,
    platform: "YouTube",
    region: "海外",
    industryStage: "中游",
    contentTags: unique(["YouTube监控", ...tags]).slice(0, 8),
    date: toDateOnly(publishedAt),
    action: "值得观看的AI视频，建议收藏并提取关键信息。",
    sourceUrl,
    sourceName: channelName || "YouTube",
    publishedAt,
    ytMeta: { channelId, videoId, thumbnailUrl: thumbnail }
  };
}

function inferGithubStage(topics, description) {
  const text = [...topics, description].join(" ").toLowerCase();
  const upstream = ["research", "paper", "benchmark", "training", "dataset", "model", "pretrain"];
  const downstream = ["app", "tool", "workflow", "automation", "deploy", "production", "saas", "cli"];
  let upScore = 0;
  let downScore = 0;
  for (const kw of upstream) { if (text.includes(kw)) upScore++; }
  for (const kw of downstream) { if (text.includes(kw)) downScore++; }
  if (upScore > downScore) return "上游";
  if (downScore > upScore) return "下游";
  return "中游";
}

function buildTweetUrl(raw, username, tweetId) {
  const firstUrl = Array.isArray(raw?.urls) ? safeHttpUrl(raw.urls[0]?.url || raw.urls[0]) : "";
  if (firstUrl) {
    return firstUrl;
  }
  if (username && tweetId) {
    return `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(tweetId)}`;
  }
  return "";
}

function unique(values) {
  return Array.from(new Set(values));
}

function toHeadline(text) {
  const firstLine = safeText(text.split(/\r?\n/)[0]);
  if (!firstLine) {
    return "市场情报更新";
  }
  return firstLine.length > 88 ? `${firstLine.slice(0, 88)}...` : firstLine;
}

function toDateOnly(isoText) {
  const parsed = Date.parse(String(isoText || ""));
  if (Number.isNaN(parsed)) {
    return "";
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

function toIsoDateTime(input) {
  if (typeof input === "number" || /^\d+$/.test(String(input || ""))) {
    const timestamp = Number(input);
    const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  const parsed = Date.parse(String(input || ""));
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  return new Date().toISOString();
}

function toNonNegativeInt(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function safeText(value) {
  return String(value ?? "").trim();
}

function safeUrlBase(rawBase) {
  const fallback = OPENNEWS_API_BASE_DEFAULT;
  const text = safeText(rawBase || fallback);
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return fallback;
    }
    return parsed.origin;
  } catch {
    return fallback;
  }
}

function safeHttpUrl(rawUrl) {
  const text = safeText(rawUrl);
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

async function fetchWithTimeout(url, options, timeoutMs) {
  const timeout = Math.max(2000, Number(timeoutMs) || 10000);
  let timer = null;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("request_timeout"));
    }, timeout);
  });

  try {
    const response = await Promise.race([fetch(url, options), timeoutPromise]);
    return response;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
