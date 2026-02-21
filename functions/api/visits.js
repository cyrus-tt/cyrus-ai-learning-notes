const CACHE_CONTROL_NO_STORE = "no-store, no-cache, must-revalidate";
const SAFE_PATH_PATTERN = /^\/[a-zA-Z0-9\-._~/]*$/;

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return json(
      {
        ok: false,
        error: "method_not_allowed"
      },
      405
    );
  }

  const url = new URL(request.url);
  const path = sanitizePath(url.searchParams.get("path"));
  const record = url.searchParams.get("record") === "1";
  const visitDate = new Date().toISOString().slice(0, 10);
  const db = resolveD1Binding(env);

  if (!db) {
    return json(
      {
        ok: true,
        available: false,
        source: "none",
        path,
        totalVisits: 0,
        todayVisits: 0,
        recorded: false
      },
      200
    );
  }

  try {
    await ensureVisitTable(db);

    let recorded = false;

    if (record) {
      const visitorHash = await hashVisitorIdentity(request);
      const createdAt = new Date().toISOString();

      const insertResult = await db
        .prepare(
          "INSERT OR IGNORE INTO page_visits (path, visit_date, visitor_hash, created_at) VALUES (?, ?, ?, ?)"
        )
        .bind(path, visitDate, visitorHash, createdAt)
        .run();

      recorded = (insertResult.meta?.changes || 0) > 0;
    }

    const [totalRow, todayRow] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM page_visits WHERE path = ?").bind(path).first(),
      db
        .prepare("SELECT COUNT(*) AS count FROM page_visits WHERE path = ? AND visit_date = ?")
        .bind(path, visitDate)
        .first()
    ]);

    return json(
      {
        ok: true,
        available: true,
        source: "d1",
        path,
        totalVisits: safeCount(totalRow?.count),
        todayVisits: safeCount(todayRow?.count),
        recorded
      },
      200
    );
  } catch {
    return json(
      {
        ok: true,
        available: false,
        source: "d1",
        path,
        totalVisits: 0,
        todayVisits: 0,
        recorded: false
      },
      200
    );
  }
}

function resolveD1Binding(env) {
  if (!env || typeof env !== "object") {
    return null;
  }

  if (looksLikeD1(env.DB)) {
    return env.DB;
  }

  for (const value of Object.values(env)) {
    if (looksLikeD1(value)) {
      return value;
    }
  }

  return null;
}

function looksLikeD1(value) {
  return Boolean(value && typeof value.prepare === "function");
}

function sanitizePath(inputPath) {
  const raw = String(inputPath || "/").trim();
  const withoutQuery = raw.split("?")[0].split("#")[0] || "/";
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const compact = normalized.replace(/\/{2,}/g, "/").slice(0, 120);

  if (!SAFE_PATH_PATTERN.test(compact)) {
    return "/";
  }

  return compact || "/";
}

function safeCount(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

async function ensureVisitTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      visitor_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(path, visit_date, visitor_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_page_visits_path ON page_visits(path);
    CREATE INDEX IF NOT EXISTS idx_page_visits_path_date ON page_visits(path, visit_date);
    CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at DESC);
  `);
}

async function hashVisitorIdentity(request) {
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").trim();
  const ua = (request.headers.get("user-agent") || "").trim();
  const lang = (request.headers.get("accept-language") || "").trim();
  const raw = `${ip}|${ua}|${lang}`;
  return sha256Hex(raw || "anonymous");
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
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
