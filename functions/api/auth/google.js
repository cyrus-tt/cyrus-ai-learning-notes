// POST /api/auth/google — verify Google ID token, create session

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "POST") {
    return withCors(jsonRes({ ok: false, error: "method_not_allowed" }, 405));
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(jsonRes({ ok: false, error: "invalid_json" }, 400));
  }

  const credential = String(body?.credential || "").trim();
  if (!credential) {
    return withCors(jsonRes({ ok: false, error: "missing_credential" }, 400));
  }

  // Verify ID token with Google
  let googleUser;
  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!resp.ok) {
      return withCors(jsonRes({ ok: false, error: "invalid_token" }, 401));
    }
    googleUser = await resp.json();
  } catch {
    return withCors(jsonRes({ ok: false, error: "google_verify_failed" }, 500));
  }

  // Optional: verify audience matches our client ID
  const expectedClientId = String(env?.GOOGLE_CLIENT_ID || "").trim();
  if (expectedClientId && googleUser.aud !== expectedClientId) {
    return withCors(jsonRes({ ok: false, error: "token_aud_mismatch" }, 401));
  }

  const db = env?.DB;
  if (!db) {
    return withCors(jsonRes({ ok: false, error: "db_not_configured" }, 500));
  }

  const userId = String(googleUser.sub || "").trim();
  if (!userId) {
    return withCors(jsonRes({ ok: false, error: "missing_sub" }, 401));
  }

  const email = String(googleUser.email || "").trim();
  const name = String(googleUser.name || "").trim();
  const picture = String(googleUser.picture || "").trim();
  const now = new Date().toISOString();

  // Upsert user record
  try {
    await db
      .prepare(
        `INSERT INTO users (id, email, name, picture, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           email = excluded.email,
           name = excluded.name,
           picture = excluded.picture,
           updated_at = excluded.updated_at`
      )
      .bind(userId, email, name, picture, now, now)
      .run();
  } catch (err) {
    return withCors(jsonRes({ ok: false, error: "db_user_failed", message: String(err?.message || "") }, 500));
  }

  // Create 30-day session
  const sessionId = genSessionId();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO user_sessions (session_id, user_id, created_at, expires_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(sessionId, userId, now, expiresAt)
      .run();
  } catch (err) {
    return withCors(jsonRes({ ok: false, error: "db_session_failed", message: String(err?.message || "") }, 500));
  }

  const resp = withCors(
    jsonRes({ ok: true, user: { id: userId, email, name, picture } })
  );
  resp.headers.set(
    "Set-Cookie",
    `session_id=${sessionId}; HttpOnly; SameSite=Lax; Secure; Max-Age=${30 * 24 * 60 * 60}; Path=/`
  );
  return resp;
}

function genSessionId() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function withCors(response) {
  for (const [k, v] of Object.entries(corsHeaders())) {
    response.headers.set(k, v);
  }
  return response;
}
