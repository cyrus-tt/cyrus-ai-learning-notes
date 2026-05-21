const ALLOWED_ORIGINS = [
  "https://cyrusai.me",
  "https://www.cyrusai.me",
  "https://cyrus-ai-learning-notes.pages.dev",
  "http://localhost:8788",
  "http://127.0.0.1:8788",
];

export function getAllowedOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (origin.endsWith(".cyrus-ai-learning-notes.pages.dev")) return origin;
  return ALLOWED_ORIGINS[0];
}

export function corsHeaders(request) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(request),
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleOptions(request) {
  return new Response(null, { headers: corsHeaders(request) });
}
