const CACHE_CONTROL_NO_STORE = "no-store, no-cache, must-revalidate";
const MAX_FIELD_LENGTH = 80;
const MAX_LANDING_LENGTH = 120;
const SAFE_PATH_PATTERN = /^\/[a-zA-Z0-9\-._~/]*$/;

// utm_events 表由 d1/migration_007_analytics.sql 管理，运行时不建表。

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db || typeof db.prepare !== "function") {
    return json({ ok: false, error: "d1_unavailable" }, 503);
  }

  if (request.method === "POST") {
    return handleRecord(request, db);
  }

  if (request.method === "GET") {
    return handleSummary(db);
  }

  return json({ ok: false, error: "method_not_allowed" }, 405);
}

async function handleRecord(request, db) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const source = sanitizeField(payload?.source);
  if (!source) {
    return json({ ok: false, error: "missing_source" }, 400);
  }

  const medium = sanitizeField(payload?.medium);
  const campaign = sanitizeField(payload?.campaign);
  const landing = sanitizeLanding(payload?.landing);
  const visitDate = new Date().toISOString().slice(0, 10);
  const createdAt = new Date().toISOString();

  try {
    const visitorHash = await hashVisitorIdentity(request);
    const result = await db
      .prepare(
        "INSERT OR IGNORE INTO utm_events (utm_source, utm_medium, utm_campaign, landing, visit_date, visitor_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(source, medium, campaign, landing, visitDate, visitorHash, createdAt)
      .run();

    return json({ ok: true, recorded: (result.meta?.changes || 0) > 0 }, 200);
  } catch (error) {
    console.error("utm api record failed:", error?.message || error);
    return json({ ok: false, error: "storage_failed" }, 500);
  }
}

async function handleSummary(db) {
  try {
    const { results } = await db
      .prepare(
        `SELECT utm_source, utm_campaign, visit_date, COUNT(*) AS visitors
         FROM utm_events
         WHERE visit_date >= date('now', '-30 days')
         GROUP BY utm_source, utm_campaign, visit_date
         ORDER BY visit_date DESC, visitors DESC
         LIMIT 200`
      )
      .all();

    return json({ ok: true, days: 30, rows: results || [] }, 200);
  } catch (error) {
    console.error("utm api summary failed:", error?.message || error);
    return json({ ok: false, error: "query_failed" }, 500);
  }
}

function sanitizeField(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  return text.replace(/[^a-z0-9\-_.]/g, "").slice(0, MAX_FIELD_LENGTH) || null;
}

function sanitizeLanding(value) {
  const raw = String(value || "/").trim();
  const withoutQuery = raw.split("?")[0].split("#")[0] || "/";
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const compact = normalized.replace(/\/{2,}/g, "/").slice(0, MAX_LANDING_LENGTH);
  return SAFE_PATH_PATTERN.test(compact) ? compact : "/";
}

async function hashVisitorIdentity(request) {
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").trim();
  const ua = (request.headers.get("user-agent") || "").trim();
  const lang = (request.headers.get("accept-language") || "").trim();
  const raw = `${ip}|${ua}|${lang}`;
  const data = new TextEncoder().encode(raw || "anonymous");
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": CACHE_CONTROL_NO_STORE
    }
  });
}
