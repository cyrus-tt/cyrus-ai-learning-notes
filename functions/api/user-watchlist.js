// /api/user-watchlist — per-user watchlist CRUD (requires Google session)
import { jsonResponse, parsePositiveInt } from "./_lib/intel.js";

const VALID_PLATFORMS = new Set(["x", "xhs", "youtube"]);

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (method === "GET") return handleGet(request, env);
  if (method === "POST") return handlePost(request, env);
  if (method === "DELETE") return handleDelete(request, env);

  return withCors(jsonResponse({ ok: false, error: "method_not_allowed" }, 405, "no-store"));
}

// Resolve user_id from session cookie, returns null if not authenticated
async function resolveUserId(request, env) {
  const cookie = String(request.headers.get("Cookie") || "");
  const m = cookie.match(/(?:^|;\s*)session_id=([^;]+)/);
  const sessionId = m ? m[1].trim() : null;
  if (!sessionId || !env?.DB) return null;

  const now = new Date().toISOString();
  try {
    const row = await env.DB.prepare(
      `SELECT u.id FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_id = ? AND s.expires_at > ?`
    )
      .bind(sessionId, now)
      .first();
    return row ? row.id : null;
  } catch {
    return null;
  }
}

async function handleGet(request, env) {
  const userId = await resolveUserId(request, env);
  if (!userId) {
    return withCors(jsonResponse({ ok: true, platform: "all", count: 0, items: [] }));
  }

  const db = env.DB;
  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "").trim().toLowerCase();
  const limit = parsePositiveInt(url.searchParams.get("limit"), 200, 500);

  try {
    let result;
    if (platform && VALID_PLATFORMS.has(platform)) {
      result = await db
        .prepare(
          `SELECT platform, username, display_name, notes, added_at
           FROM user_watchlist
           WHERE user_id = ? AND platform = ?
           ORDER BY added_at DESC LIMIT ?`
        )
        .bind(userId, platform, limit)
        .all();
    } else {
      result = await db
        .prepare(
          `SELECT platform, username, display_name, notes, added_at
           FROM user_watchlist
           WHERE user_id = ?
           ORDER BY added_at DESC LIMIT ?`
        )
        .bind(userId, limit)
        .all();
    }

    const items = (result?.results || []).map((row) => ({
      platform: row.platform,
      username: row.username,
      displayName: row.display_name,
      notes: row.notes,
      addedAt: row.added_at
    }));

    return withCors(jsonResponse({ ok: true, platform: platform || "all", count: items.length, items }));
  } catch (error) {
    return withCors(
      jsonResponse({ ok: false, error: "db_read_failed", message: String(error?.message || "") }, 500, "no-store")
    );
  }
}

async function handlePost(request, env) {
  const userId = await resolveUserId(request, env);
  if (!userId) {
    return withCors(jsonResponse({ ok: false, error: "unauthorized" }, 401, "no-store"));
  }

  const db = env.DB;
  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(jsonResponse({ ok: false, error: "invalid_json" }, 400, "no-store"));
  }

  const platform = String(body?.platform || "").trim().toLowerCase();
  const username = String(body?.username || "").trim();
  const displayName = String(body?.displayName || body?.display_name || "").trim();
  const notes = String(body?.notes || "").trim().slice(0, 500);

  if (!platform || !VALID_PLATFORMS.has(platform)) {
    return withCors(jsonResponse({ ok: false, error: "invalid_platform" }, 400, "no-store"));
  }
  if (!username || username.length > 100) {
    return withCors(jsonResponse({ ok: false, error: "invalid_username" }, 400, "no-store"));
  }

  const now = new Date().toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO user_watchlist (user_id, platform, username, display_name, notes, added_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, platform, username) DO UPDATE SET
           display_name = excluded.display_name,
           notes = excluded.notes,
           updated_at = excluded.updated_at`
      )
      .bind(userId, platform, username, displayName || username, notes, now, now)
      .run();

    return withCors(jsonResponse({ ok: true, action: "added", platform, username }));
  } catch (error) {
    return withCors(
      jsonResponse({ ok: false, error: "db_write_failed", message: String(error?.message || "") }, 500, "no-store")
    );
  }
}

async function handleDelete(request, env) {
  const userId = await resolveUserId(request, env);
  if (!userId) {
    return withCors(jsonResponse({ ok: false, error: "unauthorized" }, 401, "no-store"));
  }

  const db = env.DB;
  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "").trim().toLowerCase();
  const username = String(url.searchParams.get("username") || "").trim();

  if (!platform || !VALID_PLATFORMS.has(platform)) {
    return withCors(jsonResponse({ ok: false, error: "invalid_platform" }, 400, "no-store"));
  }
  if (!username) {
    return withCors(jsonResponse({ ok: false, error: "invalid_username" }, 400, "no-store"));
  }

  try {
    const result = await db
      .prepare("DELETE FROM user_watchlist WHERE user_id = ? AND platform = ? AND username = ?")
      .bind(userId, platform, username)
      .run();

    return withCors(
      jsonResponse({
        ok: true,
        action: result?.meta?.changes > 0 ? "removed" : "not_found",
        platform,
        username
      })
    );
  } catch (error) {
    return withCors(
      jsonResponse({ ok: false, error: "db_delete_failed", message: String(error?.message || "") }, 500, "no-store")
    );
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function withCors(response) {
  for (const [k, v] of Object.entries(corsHeaders())) {
    response.headers.set(k, v);
  }
  return response;
}
