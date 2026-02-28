import {
  cacheKeyForRequest,
  getOpennewsBase,
  jsonResponse,
  normalizeMarketItem,
  parseBoolean,
  parseCsv,
  parsePositiveInt,
  request6551Json,
  resolveNewsToken
} from "./_lib/intel.js";

const CACHE_TTL_SECONDS = 45;

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

  const token = resolveNewsToken(env);
  if (!token) {
    return jsonResponse(
      {
        ok: false,
        error: "missing_opennews_token",
        message: "Configure OPENNEWS_TOKEN in Cloudflare Pages environment variables."
      },
      500,
      "no-store"
    );
  }

  const cache = caches.default;
  const cacheKey = cacheKeyForRequest(request, "/api/market-news");
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 80, 100);
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 120);
  const signal = String(url.searchParams.get("signal") || "").trim().toLowerCase();
  const minScore = parsePositiveInt(url.searchParams.get("minScore"), 0, 100);
  const hasCoin = parseBoolean(url.searchParams.get("hasCoin"), false);

  const coins = parseCsv(url.searchParams.get("coins") || "", 10)
    .map((coin) => coin.toUpperCase())
    .filter((coin) => /^[A-Z0-9]{2,12}$/.test(coin));

  const engines = parseCsv(url.searchParams.get("engines") || "", 8)
    .map((engine) => engine.toLowerCase())
    .filter((engine) => /^[a-z]{3,16}$/.test(engine));

  const body = {
    limit,
    page: 1
  };

  if (query) {
    body.q = query;
  }

  if (coins.length) {
    body.coins = coins;
  }

  if (hasCoin) {
    body.hasCoin = true;
  }

  if (engines.length) {
    body.engineTypes = engines.reduce((acc, engine) => {
      acc[engine] = [];
      return acc;
    }, {});
  }

  try {
    const payload = await request6551Json({
      baseUrl: getOpennewsBase(env),
      token,
      endpoint: "/open/news_search",
      body
    });

    const rows = Array.isArray(payload?.data) ? payload.data : [];

    const filteredRows = rows.filter((item) => {
      const itemSignal = String(item?.aiRating?.signal || "").toLowerCase();
      const itemScore = Number(item?.aiRating?.score || 0);

      const matchSignal = !signal || itemSignal === signal;
      const matchScore = !minScore || itemScore >= minScore;

      return matchSignal && matchScore;
    });

    const items = filteredRows.map((item) => normalizeMarketItem(item));

    const response = jsonResponse(
      {
        ok: true,
        source: "opennews-6551",
        generatedAt: new Date().toISOString(),
        filters: {
          query,
          coins,
          engines,
          signal: signal || null,
          minScore,
          hasCoin
        },
        count: items.length,
        total: Number(payload?.total || items.length),
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
        error: "market_news_fetch_failed",
        message: String(error?.message || error || "unknown_error")
      },
      502,
      "no-store"
    );
  }
}
