const FALLBACK_NEWS_ITEMS = [
  {
    title: "自动抓取已启用：若首次为空，稍后会自动更新",
    titleOriginal: "Auto collection is enabled and will update soon",
    titleZh: "自动抓取已启用：若首次为空，稍后会自动更新",
    summary: "这个页面会从 data/news.json 读取每日两次自动更新的数据。",
    summaryOriginal: "This page reads data/news.json updated twice daily.",
    summaryZh: "这个页面会从 data/news.json 读取每日两次自动更新的数据。",
    hasTranslation: true,
    platform: "系统提示",
    region: "站点",
    industryStage: "中游",
    contentTags: ["AI动态"],
    date: "2026-02-19",
    action: "先等待下一次自动任务，或手动触发更新脚本。",
    sourceUrl: "https://github.com/cyrus-tt/cyrus-ai-learning-notes",
    sourceName: "GitHub",
    publishedAt: "2026-02-19T00:00:00+00:00"
  }
];

let newsItems = [];

const state = {
  query: "",
  platform: "全部",
  stage: "全部",
  topic: "全部",
  timeRange: "all",
  langByCard: {}
};

const elements = {
  search: document.getElementById("newsSearch"),
  platformTags: document.getElementById("newsPlatformTags"),
  stageTags: document.getElementById("newsStageTags"),
  topicTags: document.getElementById("newsTopicTags"),
  timeRange: document.getElementById("newsTimeRange"),
  cards: document.getElementById("newsCards"),
  count: document.getElementById("newsCount"),
  updatedAt: document.getElementById("newsUpdatedAt")
};

async function bootstrap() {
  const payload = await loadNewsPayload();
  newsItems = payload.items.length ? payload.items : FALLBACK_NEWS_ITEMS;
  renderUpdatedAt(payload.generatedAt);

  bindEvents();
  renderAllFilters();
  renderCards();
}

async function loadNewsPayload() {
  const emptyPayload = { items: [], generatedAt: "" };

  try {
    const response = await fetch(`./data/news.json?ts=${Date.now()}`, { cache: "no-store" });
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
  } catch {
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

function bindEvents() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderCards();
  });

  elements.timeRange.addEventListener("change", (event) => {
    state.timeRange = event.target.value;
    renderCards();
  });

  elements.cards.addEventListener("click", (event) => {
    const switcher = event.target.closest("[data-lang-switch='true']");
    if (!switcher) {
      return;
    }

    const key = decodeURIComponent(switcher.dataset.itemKey || "");
    const lang = switcher.dataset.lang || "zh";
    if (!key) {
      return;
    }

    state.langByCard[key] = lang;
    renderCards();
  });
}

function renderAllFilters() {
  renderChips(
    elements.platformTags,
    ["全部", ...new Set(newsItems.map((item) => item.platform).filter(Boolean))],
    state.platform,
    (value) => {
      state.platform = value;
      renderAllFilters();
      renderCards();
    }
  );

  renderChips(
    elements.stageTags,
    ["全部", ...new Set(newsItems.map((item) => item.industryStage).filter(Boolean))],
    state.stage,
    (value) => {
      state.stage = value;
      renderAllFilters();
      renderCards();
    }
  );

  const topics = newsItems.flatMap((item) => (Array.isArray(item.contentTags) ? item.contentTags : []));
  renderChips(
    elements.topicTags,
    ["全部", ...new Set(topics)],
    state.topic,
    (value) => {
      state.topic = value;
      renderAllFilters();
      renderCards();
    }
  );
}

function renderChips(container, values, active, onSelect) {
  container.innerHTML = "";

  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${value === active ? " active" : ""}`;
    button.textContent = value;
    button.addEventListener("click", () => onSelect(value));
    container.appendChild(button);
  });
}

function getFilteredNews() {
  return newsItems.filter((item) => {
    const pool = `${item.titleOriginal || item.title || ""} ${item.titleZh || ""} ${item.summaryOriginal || item.summary || ""} ${item.summaryZh || ""} ${item.action || ""} ${item.platform || ""} ${item.region || ""} ${(item.contentTags || []).join(" ")}`.toLowerCase();

    const matchesQuery = !state.query || pool.includes(state.query);
    const matchesPlatform = state.platform === "全部" || item.platform === state.platform;
    const matchesStage = state.stage === "全部" || item.industryStage === state.stage;
    const matchesTopic = state.topic === "全部" || (Array.isArray(item.contentTags) && item.contentTags.includes(state.topic));
    const matchesTime = withinTimeRange(item, state.timeRange);

    return matchesQuery && matchesPlatform && matchesStage && matchesTopic && matchesTime;
  });
}

function withinTimeRange(item, range) {
  if (range === "all") {
    return true;
  }

  const ts = Date.parse(item.publishedAt || item.date || "");
  if (Number.isNaN(ts)) {
    return true;
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (range === "24h") {
    return ts >= now - dayMs;
  }
  if (range === "7d") {
    return ts >= now - 7 * dayMs;
  }
  if (range === "30d") {
    return ts >= now - 30 * dayMs;
  }

  return true;
}

function getCardKey(item) {
  return item.sourceUrl || `${item.platform || ""}-${item.titleOriginal || item.title || ""}`;
}

function renderCards() {
  const filtered = getFilteredNews();
  elements.count.textContent = String(filtered.length);

  elements.cards.innerHTML = filtered.length
    ? filtered.map((item) => renderCard(item)).join("")
    : '<p class="empty-note">当前没有匹配资讯，换个关键词试试。</p>';
}

function renderCard(item) {
  const cardKey = getCardKey(item);
  const encodedKey = encodeURIComponent(cardKey);

  const showLangToggle =
    item.region === "海外" &&
    Boolean(item.hasTranslation || (item.titleOriginal && item.titleZh && item.titleOriginal !== item.titleZh));

  const lang = showLangToggle ? state.langByCard[cardKey] || "zh" : "zh";

  const title = lang === "en" ? item.titleOriginal || item.title : item.titleZh || item.title;
  const summary = lang === "en" ? item.summaryOriginal || item.summary : item.summaryZh || item.summary;

  const stage = item.industryStage || "中游";
  const contentTags = Array.isArray(item.contentTags) ? item.contentTags : [];

  return `
    <article class="card">
      <div class="card-top">
        <div class="card-title-wrap">
          <h3>${escapeHtml(title || "")}</h3>
        </div>
        ${
          showLangToggle
            ? `<div class="lang-toggle" role="group" aria-label="翻译切换">
                <button class="lang-btn ${lang === "zh" ? "active" : ""}" data-lang-switch="true" data-item-key="${encodedKey}" data-lang="zh">中文</button>
                <button class="lang-btn ${lang === "en" ? "active" : ""}" data-lang-switch="true" data-item-key="${encodedKey}" data-lang="en">EN</button>
              </div>`
            : ""
        }
      </div>

      <p>${escapeHtml(summary || "")}</p>

      <div class="meta-line">
        <span class="badge tag">${escapeHtml(item.platform || "")}</span>
        <span class="badge date">${escapeHtml(item.region || "")} · ${formatDate(item.date)}</span>
        <span class="badge stage">${escapeHtml(stage)}</span>
      </div>

      ${
        contentTags.length
          ? `<div class="meta-line">${contentTags
              .map((tag) => `<span class="badge topic">${escapeHtml(tag)}</span>`)
              .join("")}</div>`
          : ""
      }

      <div class="takeaway-box">可执行动作：${escapeHtml(item.action || "")}</div>

      <div class="meta-line">
        <a class="source-link" href="${escapeHtml(item.sourceUrl || "")}" target="_blank" rel="noopener noreferrer">原内容链接（${escapeHtml(item.sourceName || "来源")})</a>
      </div>
    </article>
  `;
}

function formatDate(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return dateText || "";
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
