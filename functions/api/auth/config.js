// GET /api/auth/config — returns public auth config (Google Client ID)
export async function onRequest(context) {
  const { env } = context;
  const googleClientId = String(env?.GOOGLE_CLIENT_ID || "").trim();

  return new Response(JSON.stringify({ googleClientId }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
