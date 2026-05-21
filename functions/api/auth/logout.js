// POST /api/auth/logout — clear session cookie
import { corsHeaders, handleOptions } from "../_lib/cors.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  const sessionId = getSessionId(request);
  if (sessionId && env?.DB) {
    try {
      await env.DB.prepare("DELETE FROM user_sessions WHERE session_id = ?")
        .bind(sessionId)
        .run();
    } catch {
      // best-effort delete
    }
  }

  const resp = withCors(request, jsonRes({ ok: true }));
  resp.headers.set(
    "Set-Cookie",
    "session_id=; HttpOnly; SameSite=Lax; Secure; Max-Age=0; Path=/"
  );
  return resp;
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

function withCors(request, response) {
  for (const [k, v] of Object.entries(corsHeaders(request))) {
    response.headers.set(k, v);
  }
  return response;
}
