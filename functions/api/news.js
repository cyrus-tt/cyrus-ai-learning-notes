const CACHE_CONTROL = "public, max-age=300";
const CACHE_KEY_PATH = "/api/news:v2";
const REMOTE_NEWS_URL =
  "https://raw.githubusercontent.com/cyrus-tt/cyrus-ai-learning-notes/main/data/news.json";
const LOCAL_FALLBACK_PATH = "/data/news.json";

export async function onRequest(context) {
  const { request } = context;

  if (request.method !== "GET") {
    return json(
      {
        ok: false,
        error: "method_not_allowed"
      },
      405,
      "no-store"
    );
  }

  const cacheKey = buildCacheKey(request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const localUrl = new URL(LOCAL_FALLBACK_PATH, request.url).toString();
  const [remotePayload, localPayload] = await Promise.all([
    fetchNewsPayload(REMOTE_NEWS_URL, { cacheTtl: 300 }),
    fetchNewsPayload(localUrl, { cacheTtl: 60 })
  ]);

  const preferredPayload = pickPreferredPayload(remotePayload, localPayload);
  if (preferredPayload) {
    const response = json(
      preferredPayload.payload,
      200,
      preferredPayload.cacheControl,
      preferredPayload.source
    );
    await cache.put(cacheKey, response.clone());
    return response;
  }

  return json(
    {
      ok: false,
      error: "news_unavailable",
      items: [],
      generatedAt: ""
    },
    502,
    "no-store",
    "none"
  );
}

function buildCacheKey(request) {
  const url = new URL(request.url);
  url.pathname = CACHE_KEY_PATH;
  url.search = "";
  return new Request(url.toString(), { method: "GET" });
}

async function fetchNewsPayload(url, cfOptions) {
  try {
    const response = await fetch(url, {
      cf: {
        cacheEverything: true,
        cacheTtl: cfOptions.cacheTtl
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.items)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function json(body, status, cacheControl, source) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": cacheControl,
      "x-news-source": source
    }
  });
}

function pickPreferredPayload(remotePayload, localPayload) {
  if (localPayload && remotePayload) {
    const localTime = timestampOf(localPayload.generatedAt);
    const remoteTime = timestampOf(remotePayload.generatedAt);
    if (localTime >= remoteTime) {
      return {
        payload: localPayload,
        cacheControl: "public, max-age=60",
        source: "local-fresh"
      };
    }

    return {
      payload: remotePayload,
      cacheControl: CACHE_CONTROL,
      source: "github-raw"
    };
  }

  if (localPayload) {
    return {
      payload: localPayload,
      cacheControl: "public, max-age=60",
      source: "local-fallback"
    };
  }

  if (remotePayload) {
    return {
      payload: remotePayload,
      cacheControl: CACHE_CONTROL,
      source: "github-raw"
    };
  }

  return null;
}

function timestampOf(value) {
  const ts = Date.parse(String(value || ""));
  return Number.isFinite(ts) ? ts : 0;
}
