export default {
  async fetch(request, env) {
    const upstream = env.UPSTREAM_URL || "https://cyrus-ai-notes.pages.dev";
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, upstream);

    const upstreamRequest = new Request(target.toString(), request);
    upstreamRequest.headers.set("host", new URL(upstream).host);
    upstreamRequest.headers.set("x-forwarded-host", incoming.host);
    upstreamRequest.headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

    const response = await fetch(upstreamRequest, {
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 300, 404: 60, "500-599": 0 }
      }
    });

    const headers = new Headers(response.headers);
    headers.set("x-cyrus-edge", "domain-proxy");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
