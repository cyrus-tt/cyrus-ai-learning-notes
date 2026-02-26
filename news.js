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
const SEARCH_MAX_LENGTH = 80;
const UNSAFE_INPUT_PATTERN = /[<>"'`]/g;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/g;
const NEWS_PAYLOAD_URLS = ["/api/news", "./data/news.json"];
const NEWS_REFRESH_BUCKET_MS = 5 * 60 * 1000;

const state = {
  query: "",
  platform: "全部",
  stage: "全部",
  topic: "全部",
  selectedDate: "",
  langByCard: {}
};

const elements = {
  search: document.getElementById("newsSearch"),
  platformTags: document.getElementById("newsPlatformTags"),
  stageTags: document.getElementById("newsStageTags"),
  topicTags: document.getElementById("newsTopicTags"),
  date: document.getElementById("newsDate"),
  dateReset: document.getElementById("newsDateReset"),
  cards: document.getElementById("newsCards"),
  count: document.getElementById("newsCount"),
  updatedAt: document.getElementById("newsUpdatedAt")
};

async function bootstrap() {
  renderLoadingState();
  const payload = await loadNewsPayload();
  newsItems = payload.items.length ? payload.items : FALLBACK_NEWS_ITEMS;
  renderUpdatedAt(payload.generatedAt);
  applyDateBounds();

  bindEvents();
  renderAllFilters();
  renderCards();
}

async function loadNewsPayload() {
  const emptyPayload = { items: [], generatedAt: "" };

  for (const url of NEWS_PAYLOAD_URLS) {
    const payload = await tryLoadNewsPayload(url);
    if (payload) {
      return payload;
    }
  }

  return emptyPayload;
}

async function tryLoadNewsPayload(baseUrl) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  const bucket = Math.floor(Date.now() / NEWS_REFRESH_BUCKET_MS);
  const requestUrl = `${baseUrl}${separator}v=${bucket}`;

  try {
    const response = await fetch(requestUrl, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.items)) {
      return null;
    }

    return {
      items: payload.items,
      generatedAt: payload.generatedAt || ""
    };
  } catch {
    return null;
  }
}

function renderLoadingState() {
  elements.count.textContent = "...";
  elements.updatedAt.textContent = "加载中...";
  elements.cards.innerHTML = Array.from({ length: 6 })
    .map(
      (_, index) => `
        <article class="card skeleton card-animate" style="--stagger:${index};">
          <div class="sk-line w-90"></div>
          <div class="sk-line w-76"></div>
          <div class="sk-line w-55"></div>
        </article>
      `
    )
    .join("");
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
    const sanitized = sanitizeSearchInput(event.target.value);
    if (event.target.value !== sanitized) {
      event.target.value = sanitized;
    }
    state.query = sanitized.toLowerCase();
    renderCards();
  });

  if (elements.date) {
    elements.date.addEventListener("change", (event) => {
      state.selectedDate = event.target.value || "";
      renderCards();
    });
  }

  if (elements.dateReset && elements.date) {
    elements.dateReset.addEventListener("click", () => {
      state.selectedDate = "";
      elements.date.value = "";
      renderCards();
    });
  }

  elements.cards.addEventListener("click", (event) => {
    const switcher = event.target.closest("[data-lang-switch='true']");
    if (!switcher) {
      return;
    }

    let key = switcher.dataset.itemKey || "";
    try {
      key = decodeURIComponent(key);
    } catch {
      key = "";
    }
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
    const matchesDate = matchesSelectedDate(item, state.selectedDate);

    return matchesQuery && matchesPlatform && matchesStage && matchesTopic && matchesDate;
  });
}

function getItemDateKey(item) {
  if (item && typeof item.date === "string" && item.date) {
    return item.date;
  }

  const parsed = Date.parse(item?.publishedAt || "");
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return "";
}

function matchesSelectedDate(item, selectedDate) {
  if (!selectedDate) {
    return true;
  }

  return getItemDateKey(item) === selectedDate;
}

function applyDateBounds() {
  if (!elements.date) {
    return;
  }

  const days = Array.from(
    new Set(newsItems.map((item) => getItemDateKey(item)).filter((value) => Boolean(value)))
  ).sort();

  if (!days.length) {
    elements.date.removeAttribute("min");
    elements.date.removeAttribute("max");
    return;
  }

  elements.date.min = days[0];
  elements.date.max = days[days.length - 1];
}

function getCardKey(item) {
  return item.sourceUrl || `${item.platform || ""}-${item.titleOriginal || item.title || ""}`;
}

function renderCards() {
  const filtered = getFilteredNews();
  elements.count.textContent = String(filtered.length);

  elements.cards.innerHTML = filtered.length
    ? filtered.map((item, index) => renderCard(item, index)).join("")
    : '<p class="empty-note">当前没有匹配资讯，换个关键词试试。</p>';

  window.dispatchEvent(new Event("cyrus:cards-rendered"));
}

function renderCard(item, index) {
  const cardKey = getCardKey(item);
  const encodedKey = encodeURIComponent(cardKey);
  const safeSourceUrl = sanitizeExternalUrl(item.sourceUrl || "");

  const showLangToggle =
    item.region === "海外" &&
    Boolean(item.hasTranslation || (item.titleOriginal && item.titleZh && item.titleOriginal !== item.titleZh));

  const lang = showLangToggle ? state.langByCard[cardKey] || "zh" : "zh";

  const title = lang === "en" ? item.titleOriginal || item.title : item.titleZh || item.title;
  const summary = lang === "en" ? item.summaryOriginal || item.summary : item.summaryZh || item.summary;

  const stage = item.industryStage || "中游";
  const contentTags = Array.isArray(item.contentTags) ? item.contentTags : [];
  const sourceName = escapeHtml(item.sourceName || "来源");
  const sourceLinkHtml = safeSourceUrl
    ? `<a class="source-link" href="${escapeHtml(safeSourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">原内容链接（${sourceName}）</a>`
    : `<span class="source-link">原内容链接不可用（${sourceName}）</span>`;

  return `
    <article class="card card-animate" style="--stagger:${index};">
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
        ${sourceLinkHtml}
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

function sanitizeSearchInput(rawValue) {
  return String(rawValue || "")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(UNSAFE_INPUT_PATTERN, "")
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);
}

function sanitizeExternalUrl(rawUrl) {
  const text = String(rawUrl || "").trim();
  if (!text) {
    return "";
  }

  try {
    const parsed = new URL(text, window.location.origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.href;
  } catch {
    return "";
  }
}

bootstrap();
