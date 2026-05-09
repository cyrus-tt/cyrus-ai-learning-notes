export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 50);

  let entries;
  try {
    const tilUrl = new URL("/til/entries.json", request.url);
    entries = await (await fetch(tilUrl.toString())).json();
  } catch {
    return jsonResponse({ error: "TIL data unavailable" }, 500);
  }

  if (!Array.isArray(entries)) {
    return jsonResponse({ error: "Invalid TIL data" }, 500);
  }

  entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const items = entries.slice(0, limit).map((e) => ({
    ...e,
    url: `https://cyrustyj.xyz/til/#${e.id || ""}`,
  }));

  return jsonResponse({ total: entries.length, returned: items.length, items });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
