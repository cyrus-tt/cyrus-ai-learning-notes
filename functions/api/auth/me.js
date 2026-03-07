// GET /api/auth/me — return current user from session cookie

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const db = env?.DB;
  if (!db) {
    return withCors(jsonRes({ ok: true, user: null }));
  }

  const sessionId = getSessionId(request);
  if (!sessionId) {
    return withCors(jsonRes({ ok: true, user: null }));
  }

  const now = new Date().toISOString();

  try {
    const row = await db
      .prepare(
        `SELECT u.id, u.email, u.name, u.picture
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_id = ? AND s.expires_at > ?`
      )
      .bind(sessionId, now)
      .first();

    if (!row) {
      return withCors(jsonRes({ ok: true, user: null }));
    }

    return withCors(
      jsonRes({ ok: true, user: { id: row.id, email: row.email, name: row.name, picture: row.picture } })
    );
  } catch {
    return withCors(jsonRes({ ok: true, user: null }));
  }
}

function getSessionId(request) {
  const cookie = String(request.headers.get("Cookie") || "");
  const m = cookie.match(/(?:^|;\s*)session_id=([^;]+)/);
  return m ? m[1].trim() : null;
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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function withCors(response) {
  for (const [k, v] of Object.entries(corsHeaders())) {
    response.headers.set(k, v);
  }
  return response;
}
