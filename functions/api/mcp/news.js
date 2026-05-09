export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 50);
  const tag = (url.searchParams.get("tag") || "").trim();

  let newsData;
  try {
    const newsUrl = new URL("/data/news.json", request.url);
    newsData = await (await fetch(newsUrl.toString())).json();
  } catch {
    return jsonResponse({ error: "News data unavailable" }, 500);
  }

  let items = Array.isArray(newsData.items) ? newsData.items : [];

  // Filter by tag if provided
  if (tag) {
    items = items.filter((item) =>
      Array.isArray(item.contentTags) &&
      item.contentTags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  // Sort by aiScore descending
  items.sort((a, b) => (Number(b.aiScore) || 0) - (Number(a.aiScore) || 0));

  const result = items.slice(0, limit).map((item) => ({
    title: item.titleZh || item.title,
    summary: item.summaryZh || item.summary,
    platform: item.platform,
    date: item.date,
    aiScore: item.aiScore,
    tags: item.contentTags,
    sourceUrl: item.sourceUrl,
    action: item.action,
  }));

  return jsonResponse({
    total: items.length,
    returned: result.length,
    generatedAt: newsData.generatedAt,
    items: result,
  });
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
