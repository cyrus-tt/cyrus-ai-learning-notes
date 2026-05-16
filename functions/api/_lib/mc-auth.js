/**
 * Mission Control - Auth helper
 * Checks Bearer token against env.MC_AUTH_TOKEN.
 * If no token is configured, access is open (dev mode).
 */
export function checkMcAuth(request, env) {
  const token = env.MC_AUTH_TOKEN;
  if (!token) return true; // no token configured = open (dev mode)
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${token}`;
}
