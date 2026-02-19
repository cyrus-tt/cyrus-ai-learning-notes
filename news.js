const FALLBACK_NEWS_ITEMS = [
  {
    title: "自动抓取已启用：若首次为空，稍后会自动更新",
    platform: "系统提示",
    region: "站点",
    date: "2026-02-19",
    summary: "这个页面会从 data/news.json 读取每日两次自动更新的数据。",
    action: "先等待下一次自动任务，或手动触发 GitHub Action。",
    sourceUrl: "https://github.com/cyrus-tt/cyrus-ai-learning-notes/actions",
    sourceName: "GitHub Actions",
    publishedAt: "2026-02-19T00:00:00+00:00"
  }
];

let newsItems = [];

const state = {
  query: "",
  tag: "全部"
};

const elements = {
  search: document.getElementById("newsSearch"),
  tags: document.getElementById("newsTags"),
  cards: document.getElementById("newsCards"),
  count: document.getElementById("newsCount"),
  updatedAt: document.getElementById("newsUpdatedAt")
};

async function bootstrap() {
  const payload = await loadNewsPayload();
  newsItems = payload.items.length ? payload.items : FALLBACK_NEWS_ITEMS;
  renderUpdatedAt(payload.generatedAt);

  setup();
}

async function loadNewsPayload() {
  const emptyPayload = { items: [], generatedAt: "" };

  try {
    const response = await fetch(`./data/news.json?ts=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return emptyPayload;
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.items)) {
      return emptyPayload;
    }

    return {
      items: payload.items,
      generatedAt: payload.generatedAt || ""
    };
  } catch (error) {
    return emptyPayload;
  }
}

function renderUpdatedAt(raw) {
  if (!elements.updatedAt) {
    return;
  }

  if (!raw) {
    elements.updatedAt.textContent = "等待首次更新";
    return;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    elements.updatedAt.textContent = raw;
    return;
  }

  elements.updatedAt.textContent = date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function setup() {
  renderTags();
  bindSearch();
  renderCards();
}

function bindSearch() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderCards();
  });
}

function renderTags() {
  const tags = ["全部", ...new Set(newsItems.map((item) => item.platform))];
  elements.tags.innerHTML = "";

  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${tag === state.tag ? " active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => {
      state.tag = tag;
      renderTags();
      renderCards();
    });
    elements.tags.appendChild(button);
  });
}

function getFilteredNews() {
  return newsItems.filter((item) => {
    const matchesTag = state.tag === "全部" || item.platform === state.tag;
    const pool = `${item.title} ${item.summary} ${item.action} ${item.platform} ${item.region}`.toLowerCase();
    const matchesQuery = !state.query || pool.includes(state.query);
    return matchesTag && matchesQuery;
  });
}

function renderCards() {
  const filtered = getFilteredNews();
  elements.count.textContent = String(filtered.length);

  elements.cards.innerHTML = filtered.length
    ? filtered
        .map(
          (item) => `
            <article class="card">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.summary)}</p>
              <div class="meta-line">
                <span class="badge tag">${escapeHtml(item.platform)}</span>
                <span class="badge date">${escapeHtml(item.region)} · ${formatDate(item.date)}</span>
              </div>
              <div class="takeaway-box">可执行动作：${escapeHtml(item.action)}</div>
              <div class="meta-line">
                <a class="source-link" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">原内容链接（${escapeHtml(item.sourceName || "来源") }）</a>
              </div>
            </article>
          `
        )
        .join("")
    : '<p class="empty-note">当前没有匹配资讯，换个关键词试试。</p>';
}

function formatDate(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

bootstrap();
