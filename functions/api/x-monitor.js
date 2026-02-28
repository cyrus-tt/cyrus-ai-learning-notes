import {
  cacheKeyForRequest,
  getTwitterBase,
  jsonResponse,
  normalizeTweetItem,
  parseCsv,
  parsePositiveInt,
  request6551Json,
  resolveTwitterToken
} from "./_lib/intel.js";

const CACHE_TTL_SECONDS = 30;
const DEFAULT_KEYWORDS = "bitcoin OR ethereum OR solana OR meme";

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

  const token = resolveTwitterToken(env);
  if (!token) {
    return jsonResponse(
      {
        ok: false,
        error: "missing_twitter_token",
        message: "Configure TWITTER_TOKEN (or OPENNEWS_TOKEN) in Cloudflare Pages environment variables."
      },
      500,
      "no-store"
    );
  }

  const cache = caches.default;
  const cacheKey = cacheKeyForRequest(request, "/api/x-monitor");
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 100);
  const mode = String(url.searchParams.get("mode") || "").trim().toLowerCase();
  const username = normalizeUsername(url.searchParams.get("username"));
  const usernames = parseCsv(url.searchParams.get("usernames") || "", 20)
    .map((item) => normalizeUsername(item))
    .filter((item) => Boolean(item));
  const hashtag = normalizeSimpleValue(url.searchParams.get("hashtag"), 32);
  const rawQuery = String(url.searchParams.get("q") || "").trim().slice(0, 120);
  const minLikes = parsePositiveInt(url.searchParams.get("minLikes"), 0, 1000000);

  const envWatchlist = parseCsv(env?.X_MONITOR_USERS || "", 30)
    .map((item) => normalizeUsername(item))
    .filter((item) => Boolean(item));
  const watchlistUsers = dedupeStrings([...usernames, ...envWatchlist]).slice(0, 20);

  const inferredMode =
    mode || (watchlistUsers.length ? "watchlist" : username ? "user" : "search");

  try {
    const payload =
      inferredMode === "watchlist"
        ? await fetchWatchlistTweets({
            env,
            token,
            users: watchlistUsers,
            limit
          })
        :
      inferredMode === "user"
        ? await fetchUserTweets({ env, token, username, limit })
        : await fetchSearchTweets({
            env,
            token,
            limit,
            query: rawQuery,
            hashtag,
            minLikes
          });

    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const items = rows.map((item) => normalizeTweetItem(item));

    const response = jsonResponse(
      {
        ok: true,
        source: "opentwitter-6551",
        generatedAt: new Date().toISOString(),
        mode: inferredMode,
        filters: {
          username: username || null,
          usernames: watchlistUsers,
          query: rawQuery || null,
          hashtag: hashtag || null,
          minLikes
        },
        count: items.length,
        items
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
        error: "x_monitor_fetch_failed",
        message: String(error?.message || error || "unknown_error")
      },
      502,
      "no-store"
    );
  }
}

async function fetchWatchlistTweets({ env, token, users, limit }) {
  if (!users.length) {
    throw new Error("missing_watchlist_usernames");
  }

  const perUserLimit = Math.min(20, Math.max(3, Math.floor(limit / users.length) || 8));
  const results = await Promise.allSettled(
    users.map((user) =>
      request6551Json({
        baseUrl: getTwitterBase(env),
        token,
        endpoint: "/open/twitter_user_tweets",
        body: {
          username: user,
          maxResults: perUserLimit,
          product: "Latest",
          includeReplies: false,
          includeRetweets: false
        }
      })
    )
  );

  const merged = [];
  for (const result of results) {
    if (result.status !== "fulfilled") {
      continue;
    }
    const rows = Array.isArray(result.value?.data) ? result.value.data : [];
    merged.push(...rows);
  }

  merged.sort((a, b) => {
    const tsA = Date.parse(String(a?.createdAt || "")) || 0;
    const tsB = Date.parse(String(b?.createdAt || "")) || 0;
    return tsB - tsA;
  });

  return { data: merged.slice(0, limit) };
}

async function fetchUserTweets({ env, token, username, limit }) {
  if (!username) {
    throw new Error("missing_username_for_user_mode");
  }

  return request6551Json({
    baseUrl: getTwitterBase(env),
    token,
    endpoint: "/open/twitter_user_tweets",
    body: {
      username,
      maxResults: limit,
      product: "Latest",
      includeReplies: false,
      includeRetweets: false
    }
  });
}

async function fetchSearchTweets({ env, token, limit, query, hashtag, minLikes }) {
  const body = {
    keywords: query || DEFAULT_KEYWORDS,
    maxResults: limit,
    product: "Latest"
  };

  if (hashtag) {
    body.hashtag = hashtag;
  }

  if (minLikes > 0) {
    body.minLikes = minLikes;
  }

  return request6551Json({
    baseUrl: getTwitterBase(env),
    token,
    endpoint: "/open/twitter_search",
    body
  });
}

function normalizeUsername(input) {
  const value = String(input || "")
    .trim()
    .replace(/^@+/, "")
    .slice(0, 32);

  if (!value) {
    return "";
  }

  if (!/^[A-Za-z0-9_]{1,15}$/.test(value)) {
    return "";
  }

  return value;
}

function normalizeSimpleValue(input, maxLen) {
  const value = String(input || "").trim().slice(0, maxLen);
  if (!value) {
    return "";
  }
  return value.replace(/[^A-Za-z0-9_\-]/g, "");
}

function dedupeStrings(values) {
  return Array.from(new Set(values.filter((value) => Boolean(value))));
}
