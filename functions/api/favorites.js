import { jsonResponse, parsePositiveInt } from "./_lib/intel.js";
import { corsHeaders, handleOptions } from "./_lib/cors.js";

const GUEST_ID_HEADER = "x-guest-id";
const GUEST_ID_COOKIE = "guest_id";
const GUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === "OPTIONS") {
    return handleOptions(request);
  }

  if (method === "GET") return handleGet(request, env);
  if (method === "POST") return handlePost(request, env);
  if (method === "DELETE") return handleDelete(request, env);

  return withCors(request, jsonResponse({ ok: false, error: "method_not_allowed" }, 405, "no-store"));
}

async function handleGet(request, env) {
  const db = env?.DB;
  if (!db) {
    return withCors(request,
      jsonResponse({ ok: true, count: 0, items: [], actorType: "none", actorId: null, available: false })
    );
  }

  const actor = await resolveActor(request, env);
  if (!actor.userId) {
    return withCors(request, jsonResponse({ ok: true, count: 0, items: [], actorType: actor.type, actorId: null }));
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 200, 500);

  try {
    const result = await db
      .prepare(
        `SELECT id, news_id, news_title, news_summary, news_url, news_platform, news_date, created_at
         FROM user_favorites
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(actor.userId, limit)
      .all();

    const items = (result?.results || []).map((row) => ({
      id: row.id,
      newsId: row.news_id,
      newsTitle: row.news_title,
      newsSummary: row.news_summary,
      newsUrl: row.news_url,
      newsPlatform: row.news_platform,
      newsDate: row.news_date,
      createdAt: row.created_at
    }));

    return withCors(request,
      jsonResponse({
        ok: true,
        actorType: actor.type,
        actorId: actor.rawId,
        count: items.length,
        items
      })
    );
  } catch (error) {
    return withCors(request,
      jsonResponse(
        { ok: false, error: "db_read_failed", message: String(error?.message || "") },
        500,
        "no-store"
      )
    );
  }
}

async function handlePost(request, env) {
  const db = env?.DB;
  if (!db) {
    return withCors(request, jsonResponse({ ok: false, error: "db_not_configured" }, 500, "no-store"));
  }

  const actor = await resolveActor(request, env);
  if (!actor.userId) {
    return withCors(request, jsonResponse({ ok: false, error: "unauthorized" }, 401, "no-store"));
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(request, jsonResponse({ ok: false, error: "invalid_json" }, 400, "no-store"));
  }

  const normalized = normalizeFavorite(body);
  if (!normalized.ok) {
    return withCors(request, jsonResponse({ ok: false, error: normalized.error }, 400, "no-store"));
  }

  const favorite = normalized.favorite;

  try {
    await db
      .prepare(
        `INSERT INTO user_favorites
          (user_id, news_id, news_title, news_summary, news_url, news_platform, news_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, news_id) DO UPDATE SET
           news_title = excluded.news_title,
           news_summary = excluded.news_summary,
           news_url = excluded.news_url,
           news_platform = excluded.news_platform,
           news_date = excluded.news_date`
      )
      .bind(
        actor.userId,
        favorite.newsId,
        favorite.newsTitle,
        favorite.newsSummary,
        favorite.newsUrl,
        favorite.newsPlatform,
        favorite.newsDate,
        favorite.createdAt
      )
      .run();

    return withCors(request,
      jsonResponse({
        ok: true,
        action: "added",
        actorType: actor.type,
        actorId: actor.rawId,
        item: favorite
      })
    );
  } catch (error) {
    return withCors(request,
      jsonResponse(
        { ok: false, error: "db_write_failed", message: String(error?.message || "") },
        500,
        "no-store"
      )
    );
  }
}

async function handleDelete(request, env) {
  const db = env?.DB;
  if (!db) {
    return withCors(request, jsonResponse({ ok: false, error: "db_not_configured" }, 500, "no-store"));
  }

  const actor = await resolveActor(request, env);
  if (!actor.userId) {
    return withCors(request, jsonResponse({ ok: false, error: "unauthorized" }, 401, "no-store"));
  }

  const url = new URL(request.url);
  const newsId = String(url.searchParams.get("news_id") || "").trim().slice(0, 200);
  if (!newsId) {
    return withCors(request, jsonResponse({ ok: false, error: "invalid_news_id" }, 400, "no-store"));
  }

  try {
    const result = await db
      .prepare("DELETE FROM user_favorites WHERE user_id = ? AND news_id = ?")
      .bind(actor.userId, newsId)
      .run();

    return withCors(request,
      jsonResponse({
        ok: true,
        action: result?.meta?.changes > 0 ? "removed" : "not_found",
        actorType: actor.type,
        actorId: actor.rawId,
        newsId
      })
    );
  } catch (error) {
    return withCors(request,
      jsonResponse(
        { ok: false, error: "db_delete_failed", message: String(error?.message || "") },
        500,
        "no-store"
      )
    );
  }
}

async function resolveActor(request, env) {
  const userId = await resolveSessionUserId(request, env);
  if (userId) {
    return { type: "user", userId, rawId: userId };
  }

  const guestId = resolveGuestId(request);
  if (guestId) {
    return { type: "guest", userId: `guest:${guestId}`, rawId: guestId };
  }

  return { type: "anonymous", userId: null, rawId: null };
}

async function resolveSessionUserId(request, env) {
  const sessionId = getCookieValue(request, "session_id");
  if (!sessionId || !env?.DB) return null;

  const now = new Date().toISOString();
  try {
    const row = await env.DB
      .prepare(
        `SELECT u.id
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_id = ? AND s.expires_at > ?`
      )
      .bind(sessionId, now)
      .first();
    return row?.id ? String(row.id) : null;
  } catch {
    return null;
  }
}

function resolveGuestId(request) {
  const headerGuestId = sanitizeGuestId(request.headers.get(GUEST_ID_HEADER));
  if (headerGuestId) return headerGuestId;

  const url = new URL(request.url);
  const queryGuestId = sanitizeGuestId(url.searchParams.get("guest_id"));
  if (queryGuestId) return queryGuestId;

  return sanitizeGuestId(getCookieValue(request, GUEST_ID_COOKIE));
}

function getCookieValue(request, key) {
  const cookie = String(request.headers.get("Cookie") || "");
  const pattern = new RegExp(`(?:^|;\\s*)${key}=([^;]+)`);
  const match = cookie.match(pattern);
  return match ? match[1].trim() : null;
}

function sanitizeGuestId(value) {
  const text = String(value || "").trim();
  if (!text || !GUEST_ID_PATTERN.test(text)) {
    return null;
  }
  return text;
}

function normalizeFavorite(body) {
  const newsId = String(body?.news_id || body?.newsId || "").trim().slice(0, 200);
  const newsTitle = String(body?.news_title || body?.newsTitle || "").trim().slice(0, 300);
  const newsSummary = String(body?.news_summary || body?.newsSummary || "").trim().slice(0, 5000);
  const newsUrl = String(body?.news_url || body?.newsUrl || "").trim().slice(0, 2000);
  const newsPlatform = String(body?.news_platform || body?.newsPlatform || "").trim().slice(0, 64);
  const newsDate = String(body?.news_date || body?.newsDate || "").trim().slice(0, 32);
  const createdAt = normalizeCreatedAt(body?.created_at || body?.createdAt);

  if (!newsId) return { ok: false, error: "invalid_news_id" };
  if (!newsTitle) return { ok: false, error: "invalid_news_title" };

  return {
    ok: true,
    favorite: {
      newsId,
      newsTitle,
      newsSummary,
      newsUrl,
      newsPlatform,
      newsDate,
      createdAt
    }
  };
}

function normalizeCreatedAt(raw) {
  const text = String(raw || "").trim();
  if (!text) return new Date().toISOString();
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return new Date().toISOString();
  return new Date(parsed).toISOString();
}

function withCors(request, response) {
  for (const [k, v] of Object.entries(corsHeaders(request))) {
    response.headers.set(k, v);
  }
  return response;
}
