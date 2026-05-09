export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();

  if (!query) {
    return jsonResponse({ error: "Missing q parameter" }, 400);
  }

  // Load knowledge base
  let knowledge;
  try {
    const kUrl = new URL("/data/knowledge.json", request.url);
    knowledge = await (await fetch(kUrl.toString())).json();
  } catch {
    return jsonResponse({ error: "Knowledge base unavailable" }, 500);
  }

  const results = [];

  // Search articles
  for (const article of knowledge.articles || []) {
    const text = `${article.title} ${article.summary} ${article.content || ""}`.toLowerCase();
    if (text.includes(query)) {
      results.push({
        type: "article",
        title: article.title,
        url: `https://cyrustyj.xyz${article.url}`,
        summary: article.summary,
      });
    }
  }

  // Search TIL
  for (const til of knowledge.til || []) {
    const text = `${til.title} ${til.body} ${(til.tags || []).join(" ")}`.toLowerCase();
    if (text.includes(query)) {
      results.push({
        type: "til",
        title: til.title,
        date: til.date,
        body: til.body,
        tags: til.tags,
        url: `https://cyrustyj.xyz/til/#${til.id || ""}`,
      });
    }
  }

  return jsonResponse({ query, total: results.length, results });
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
