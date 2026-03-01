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
const WATCHLIST_CACHE_TTL_SECONDS = 180;
const FEED_CACHE_TTL_SECONDS = 120;
const DEFAULT_KEYWORDS = "bitcoin OR ethereum OR solana OR meme";
const LOCAL_WATCHLIST_PATH = "/data/x_watchlist.json";
const LOCAL_FEED_PATH = "/data/x_feed.json";

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
  const watchlistProfiles = await loadWatchlistProfiles(request, env);
  const watchlistProfileMap = new Map(
    watchlistProfiles.map((item) => [String(item.username || "").toLowerCase(), item])
  );
  const autoWatchlistUsers = watchlistProfiles.map((item) => item.username).filter((item) => Boolean(item));
  const explicitWatchlistUsers = dedupeStrings([...usernames, ...envWatchlist]).slice(0, 20);

  const hasSearchInput = Boolean(rawQuery || hashtag || minLikes > 0);
  const inferredMode = inferMode({
    mode,
    username,
    explicitWatchlistUsers,
    autoWatchlistUsers,
    hasSearchInput
  });

  const watchlistUsers = dedupeStrings([
    ...explicitWatchlistUsers,
    ...(inferredMode === "watchlist" && !explicitWatchlistUsers.length ? autoWatchlistUsers : [])
  ]).slice(0, 20);

  const token = resolveTwitterToken(env);
  if (!token) {
    const fallbackPayload = await loadFallbackFeed({
      request,
      env,
      limit,
      mode: inferredMode,
      username,
      watchlistUsers,
      query: rawQuery,
      hashtag,
      minLikes
    });

    if (fallbackPayload) {
      const response = jsonResponse(
        {
          ok: true,
          source: fallbackPayload.source,
          generatedAt: fallbackPayload.generatedAt,
          mode: inferredMode,
          filters: {
            username: username || null,
            usernames: watchlistUsers,
            query: rawQuery || null,
            hashtag: hashtag || null,
            minLikes
          },
          watchlist: summarizeWatchlist(watchlistUsers, watchlistProfileMap),
          degraded: true,
          count: fallbackPayload.items.length,
          items: fallbackPayload.items
        },
        200,
        `public, max-age=${CACHE_TTL_SECONDS}`
      );
      await cache.put(cacheKey, response.clone());
      return response;
    }

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

  try {
    const payload =
      inferredMode === "watchlist"
        ? await fetchWatchlistTweets({
            env,
            token,
            users: watchlistUsers,
            limit,
            watchlistProfileMap
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
    const items = rows.map((item) =>
      enrichWatchlistItem(
        normalizeTweetItem(item),
        normalizeWatchlistProfile(item?.__watchProfile || null)
      )
    );

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
        watchlist: summarizeWatchlist(watchlistUsers, watchlistProfileMap),
        count: items.length,
        items
      },
      200,
      `public, max-age=${CACHE_TTL_SECONDS}`
    );

    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    const fallbackPayload = await loadFallbackFeed({
      request,
      env,
      limit,
      mode: inferredMode,
      username,
      watchlistUsers,
      query: rawQuery,
      hashtag,
      minLikes
    });
    if (fallbackPayload) {
      const response = jsonResponse(
        {
          ok: true,
          source: `${fallbackPayload.source}-fallback`,
          generatedAt: fallbackPayload.generatedAt,
          mode: inferredMode,
          filters: {
            username: username || null,
            usernames: watchlistUsers,
            query: rawQuery || null,
            hashtag: hashtag || null,
            minLikes
          },
          degraded: true,
          error: String(error?.message || error || "x_monitor_fetch_failed"),
          watchlist: summarizeWatchlist(watchlistUsers, watchlistProfileMap),
          count: fallbackPayload.items.length,
          items: fallbackPayload.items
        },
        200,
        `public, max-age=${CACHE_TTL_SECONDS}`
      );
      await cache.put(cacheKey, response.clone());
      return response;
    }

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

async function fetchWatchlistTweets({ env, token, users, limit, watchlistProfileMap }) {
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
  results.forEach((result, index) => {
    if (result.status !== "fulfilled") {
      return;
    }

    const username = String(users[index] || "");
    const profile = normalizeWatchlistProfile(watchlistProfileMap?.get(username.toLowerCase()) || null);
    const rows = Array.isArray(result.value?.data) ? result.value.data : [];
    rows.forEach((row) => {
      merged.push(
        profile
          ? {
              ...row,
              __watchProfile: profile
            }
          : row
      );
    });
  });

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

async function loadWatchlistProfiles(request, env) {
  const remoteUrl = safeHttpUrl(env?.X_MONITOR_WATCHLIST_URL || "");
  if (remoteUrl) {
    const remotePayload = await fetchJson(remoteUrl, WATCHLIST_CACHE_TTL_SECONDS);
    const remoteProfiles = extractWatchlistProfiles(remotePayload);
    if (remoteProfiles.length) {
      return remoteProfiles;
    }
  }

  const localUrl = new URL(LOCAL_WATCHLIST_PATH, request.url).toString();
  const localPayload = await fetchJson(localUrl, WATCHLIST_CACHE_TTL_SECONDS);
  return extractWatchlistProfiles(localPayload);
}

function extractWatchlistProfiles(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const rows = Array.isArray(payload?.users)
    ? payload.users
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];

  return rows
    .map((row) => normalizeWatchlistProfile(row))
    .filter((row) => Boolean(row?.username))
    .slice(0, 200);
}

function normalizeWatchlistProfile(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const username = normalizeUsername(raw?.username || raw?.screenName || raw?.user || raw?.handle);
  if (!username) {
    return null;
  }

  const scoreValue = Number(raw?.score);
  const score = Number.isFinite(scoreValue) ? scoreValue : null;
  const tags = Array.isArray(raw?.tags)
    ? raw.tags.map((item) => String(item || "").trim()).filter((item) => Boolean(item))
    : [];
  const reason = String(raw?.reason || "").trim();
  const displayName = String(raw?.displayName || raw?.name || "").trim();
  const trackScores = raw?.trackScores && typeof raw.trackScores === "object" ? raw.trackScores : {};

  return {
    username,
    displayName,
    score,
    tags: dedupeStrings(tags).slice(0, 8),
    reason,
    trackScores
  };
}

function inferMode({ mode, username, explicitWatchlistUsers, autoWatchlistUsers, hasSearchInput }) {
  if (mode) {
    return mode;
  }

  if (username) {
    return "user";
  }

  if (explicitWatchlistUsers.length) {
    return "watchlist";
  }

  if (!hasSearchInput && autoWatchlistUsers.length) {
    return "watchlist";
  }

  return "search";
}

async function loadFallbackFeed({
  request,
  env,
  limit,
  mode,
  username,
  watchlistUsers,
  query,
  hashtag,
  minLikes
}) {
  const remoteUrl = safeHttpUrl(env?.X_MONITOR_FEED_URL || "");
  if (remoteUrl) {
    const remotePayload = await fetchJson(remoteUrl, FEED_CACHE_TTL_SECONDS);
    const normalizedRemote = normalizeFeedPayload({
      payload: remotePayload,
      source: "x-feed-remote",
      limit,
      mode,
      username,
      watchlistUsers,
      query,
      hashtag,
      minLikes
    });
    if (normalizedRemote) {
      return normalizedRemote;
    }
  }

  const localUrl = new URL(LOCAL_FEED_PATH, request.url).toString();
  const localPayload = await fetchJson(localUrl, FEED_CACHE_TTL_SECONDS);
  return normalizeFeedPayload({
    payload: localPayload,
    source: "x-feed-local",
    limit,
    mode,
    username,
    watchlistUsers,
    query,
    hashtag,
    minLikes
  });
}

function normalizeFeedPayload({
  payload,
  source,
  limit,
  mode,
  username,
  watchlistUsers,
  query,
  hashtag,
  minLikes
}) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const rows = Array.isArray(payload?.items) ? payload.items : [];
  let items = rows.filter((row) => row && typeof row === "object");

  if (mode === "user" && username) {
    const expected = username.toLowerCase();
    items = items.filter((item) => {
      const sourceName = String(item?.sourceName || "").toLowerCase();
      const title = String(item?.title || "").toLowerCase();
      return sourceName.includes(`@${expected}`) || sourceName.includes(expected) || title.includes(`@${expected}`);
    });
  }

  if (mode === "watchlist" && watchlistUsers.length) {
    const lookup = new Set(watchlistUsers.map((item) => item.toLowerCase()));
    items = items.filter((item) => {
      const sourceName = String(item?.sourceName || "").toLowerCase();
      const title = String(item?.title || "").toLowerCase();
      for (const user of lookup) {
        if (sourceName.includes(`@${user}`) || sourceName.includes(user) || title.includes(`@${user}`)) {
          return true;
        }
      }
      return false;
    });
  }

  if (query) {
    const queryLower = query.toLowerCase();
    items = items.filter((item) => {
      const pool = `${item?.title || ""} ${item?.summary || ""} ${item?.sourceName || ""} ${(item?.contentTags || []).join(" ")}`.toLowerCase();
      return pool.includes(queryLower);
    });
  }

  if (hashtag) {
    const normalizedTag = hashtag.replace(/^#/, "").toLowerCase();
    items = items.filter((item) =>
      Array.isArray(item?.contentTags)
        ? item.contentTags.some((tag) => String(tag || "").replace(/^#/, "").toLowerCase() === normalizedTag)
        : false
    );
  }

  if (minLikes > 0) {
    items = items.filter((item) => {
      const likes = Number.parseInt(String(item?.metrics?.likes ?? "0"), 10);
      return Number.isFinite(likes) && likes >= minLikes;
    });
  }

  items = items
    .sort((a, b) => {
      const tsA = Date.parse(String(a?.publishedAt || "")) || 0;
      const tsB = Date.parse(String(b?.publishedAt || "")) || 0;
      return tsB - tsA;
    })
    .slice(0, limit);

  if (!items.length) {
    return null;
  }

  return {
    source: String(payload?.source || source),
    generatedAt: String(payload?.generatedAt || new Date().toISOString()),
    items
  };
}

function summarizeWatchlist(users, profileMap) {
  return users.map((username) => {
    const profile = normalizeWatchlistProfile(profileMap.get(username.toLowerCase()) || null);
    return {
      username,
      score: profile?.score ?? null,
      tags: profile?.tags || []
    };
  });
}

function enrichWatchlistItem(item, profile) {
  if (!profile) {
    return item;
  }

  const tags = dedupeStrings([...(Array.isArray(item?.contentTags) ? item.contentTags : []), ...(profile.tags || [])]);
  const baseAction = String(item?.action || "").trim();
  const reason = String(profile.reason || "").trim();
  const action = reason ? `${baseAction} 账号理由：${reason}` : baseAction;

  return {
    ...item,
    contentTags: tags.slice(0, 8),
    action,
    watchScore: profile.score,
    watchTrackScores: profile.trackScores
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
