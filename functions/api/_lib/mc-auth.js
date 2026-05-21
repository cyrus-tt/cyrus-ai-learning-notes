/**
 * Mission Control - Auth helper
 * Checks Bearer token against env.MC_AUTH_TOKEN.
 * Fail-closed: rejects all requests if token is not configured.
 */
export function checkMcAuth(request, env) {
  const token = env.MC_AUTH_TOKEN;
  if (!token) return false;
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${token}`;
}
