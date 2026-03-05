import { jsonResponse, parsePositiveInt } from "./_lib/intel.js";

const VALID_PLATFORMS = new Set(["x", "xhs", "youtube"]);

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }

  if (method === "GET") {
    return handleGet(request, env);
  }
  if (method === "POST") {
    return handlePost(request, env);
  }
  if (method === "DELETE") {
    return handleDelete(request, env);
  }

  return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, "no-store");
}

async function handleGet(request, env) {
  const db = env?.DB;
  if (!db) {
    return withCors(jsonResponse({ ok: true, platform: "all", count: 0, items: [] }));
  }

  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "").trim().toLowerCase();
  const limit = parsePositiveInt(url.searchParams.get("limit"), 100, 500);

  try {
    let result;
    if (platform && VALID_PLATFORMS.has(platform)) {
      result = await db
        .prepare("SELECT platform, username, display_name, notes, added_at, updated_at FROM custom_watchlist WHERE platform = ? ORDER BY added_at DESC LIMIT ?")
        .bind(platform, limit)
        .all();
    } else {
      result = await db
        .prepare("SELECT platform, username, display_name, notes, added_at, updated_at FROM custom_watchlist ORDER BY added_at DESC LIMIT ?")
        .bind(limit)
        .all();
    }

    const items = (result?.results || []).map((row) => ({
      platform: row.platform,
      username: row.username,
      displayName: row.display_name,
      notes: row.notes,
      addedAt: row.added_at,
      updatedAt: row.updated_at
    }));

    return withCors(jsonResponse({
      ok: true,
      platform: platform || "all",
      count: items.length,
      items
    }));
  } catch (error) {
    return withCors(jsonResponse(
      { ok: false, error: "db_read_failed", message: String(error?.message || "") },
      500,
      "no-store"
    ));
  }
}

async function handlePost(request, env) {
  const authError = checkAuth(request, env);
  if (authError) return withCors(authError);

  const db = env?.DB;
  if (!db) {
    return withCors(jsonResponse({ ok: false, error: "db_not_configured" }, 500, "no-store"));
  }

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
        `INSERT INTO custom_watchlist (platform, username, display_name, notes, added_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(platform, username) DO UPDATE SET
           display_name = excluded.display_name,
           notes = excluded.notes,
           updated_at = excluded.updated_at`
      )
      .bind(platform, username, displayName || username, notes, now, now)
      .run();

    return withCors(jsonResponse({ ok: true, action: "added", platform, username }));
  } catch (error) {
    return withCors(jsonResponse(
      { ok: false, error: "db_write_failed", message: String(error?.message || "") },
      500,
      "no-store"
    ));
  }
}

async function handleDelete(request, env) {
  const authError = checkAuth(request, env);
  if (authError) return withCors(authError);

  const db = env?.DB;
  if (!db) {
    return withCors(jsonResponse({ ok: false, error: "db_not_configured" }, 500, "no-store"));
  }

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
      .prepare("DELETE FROM custom_watchlist WHERE platform = ? AND username = ?")
      .bind(platform, username)
      .run();

    return withCors(jsonResponse({
      ok: true,
      action: result?.meta?.changes > 0 ? "removed" : "not_found",
      platform,
      username
    }));
  } catch (error) {
    return withCors(jsonResponse(
      { ok: false, error: "db_delete_failed", message: String(error?.message || "") },
      500,
      "no-store"
    ));
  }
}

function checkAuth(request, env) {
  const token = String(env?.WATCHLIST_TOKEN || "").trim();
  if (!token) {
    return jsonResponse({ ok: false, error: "watchlist_token_not_configured" }, 500, "no-store");
  }

  const authHeader = String(request.headers.get("Authorization") || "").trim();
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!bearerToken || bearerToken !== token) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401, "no-store");
  }

  return null;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

function withCors(response) {
  const headers = corsHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
