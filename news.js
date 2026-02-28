const FALLBACK_NEWS_ITEMS_BY_SOURCE = {
  ai: [
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
  ],
  live: [
    {
      title: "实时新闻聚合已启用：支持电商/政策/经济/科技/互联网",
      titleOriginal: "Realtime news aggregation is enabled for ecommerce/policy/economy/tech/internet.",
      titleZh: "实时新闻聚合已启用：支持电商/政策/经济/科技/互联网",
      summary: "在“实时新闻”输入关键词并点击“云端查询”，会从 Google News RSS 实时拉取最新资讯。",
      summaryOriginal: "Use cloud query in the Live News source to fetch latest updates from Google News RSS.",
      summaryZh: "在“实时新闻”输入关键词并点击“云端查询”，会从 Google News RSS 实时拉取最新资讯。",
      hasTranslation: true,
      platform: "Google News",
      region: "全球资讯",
      industryStage: "中游",
      contentTags: ["实时新闻", "聚合"],
      date: "2026-02-27",
      action: "先明确关注领域，再按关键词跟踪事件进展。",
      sourceUrl: "https://news.google.com",
      sourceName: "Google News",
      publishedAt: "2026-02-27T00:00:00+00:00"
    }
  ],
  x: [
    {
      title: "X监控接口可用：请输入关键词或 @用户名",
      titleOriginal: "X monitor API is ready. Query by keyword or @username.",
      titleZh: "X监控接口可用：请输入关键词或 @用户名",
      summary: "例如输入 @elonmusk 后点击“云端查询”，或输入 bitcoin 获取实时推文。",
      summaryOriginal: "Type @elonmusk then click cloud query, or use bitcoin as keyword.",
      summaryZh: "例如输入 @elonmusk 后点击“云端查询”，或输入 bitcoin 获取实时推文。",
      hasTranslation: true,
      platform: "X/Twitter",
      region: "全球社媒",
      industryStage: "中游",
      contentTags: ["X监控", "情绪信号"],
      date: "2026-02-27",
      action: "先用默认热词观察，再收敛到具体账号监控。",
      sourceUrl: "https://x.com",
      sourceName: "X",
      publishedAt: "2026-02-27T00:00:00+00:00"
    }
  ],
  xhs: [
    {
      title: "小红书聚合接口已启用：等待接入你的博主名单",
      titleOriginal: "Xiaohongshu aggregation is enabled and waiting for your creator watchlist.",
      titleZh: "小红书聚合接口已启用：等待接入你的博主名单",
      summary: "你给我账号名单后，我会接成自动聚合流；当前支持从 /api/xhs-feed 展示聚合数据。",
      summaryOriginal: "Once you share creator list, we can auto-aggregate via /api/xhs-feed.",
      summaryZh: "你给我账号名单后，我会接成自动聚合流；当前支持从 /api/xhs-feed 展示聚合数据。",
      hasTranslation: true,
      platform: "小红书",
      region: "中文社媒",
      industryStage: "下游",
      contentTags: ["小红书", "博主聚合"],
      date: "2026-02-27",
      action: "先按博主名单聚合，再追加关键词监控。",
      sourceUrl: "https://www.xiaohongshu.com",
      sourceName: "小红书",
      publishedAt: "2026-02-27T00:00:00+00:00"
    }
  ]
};

const SEARCH_MAX_LENGTH = 80;
const UNSAFE_INPUT_PATTERN = /[<>"'`]/g;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/g;
const NEWS_REFRESH_BUCKET_MS = 5 * 60 * 1000;

const SOURCE_CONFIG = {
  ai: {
    label: "AI资讯",
    hint: "当前数据源：AI资讯（站内）",
    placeholder: "例如：OpenAI、Claude、Agent、自动化...",
    remoteSearch: false
  },
  live: {
    label: "实时新闻",
    hint: "当前数据源：普通新闻实时聚合（电商/政策/经济/科技/互联网）",
    placeholder: "例如：跨境电商、平台治理、消费复苏、AI基础设施...",
    remoteSearch: true
  },
  x: {
    label: "X监控",
    hint: "当前数据源：X 账号与关键词监控（实时）",
    placeholder: "例如：@elonmusk、openai、#ai、likes:500 或多个账号",
    remoteSearch: true
  },
  xhs: {
    label: "小红书聚合",
    hint: "当前数据源：小红书聚合接口",
    placeholder: "例如：买手、直播带货、私域、母婴、美妆...",
    remoteSearch: true
  }
};

let newsItems = [];

const state = {
  source: "ai",
  query: "",
  remoteQuery: "",
  platform: "全部",
  stage: "全部",
  topic: "全部",
  selectedDate: "",
  langByCard: {},
  loading: false
};

const elements = {
  search: document.getElementById("newsSearch"),
  sourceTags: document.getElementById("newsSourceTags"),
  sourceHint: document.getElementById("newsSourceHint"),
  remoteSearchBtn: document.getElementById("newsRemoteSearchBtn"),
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
  bindEvents();
  syncSourceUi();
  renderSourceChips();
  renderLoadingState();
  await reloadSourceData({ keepFilters: false });
}

function bindEvents() {
  elements.search.addEventListener("input", (event) => {
    const sanitized = sanitizeSearchInput(event.target.value);
    if (event.target.value !== sanitized) {
      event.target.value = sanitized;
    }

    state.query = sanitized;
    renderCards();
  });

  elements.search.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter" || !SOURCE_CONFIG[state.source].remoteSearch) {
      return;
    }

    event.preventDefault();
    await runRemoteSearch();
  });

  if (elements.remoteSearchBtn) {
    elements.remoteSearchBtn.addEventListener("click", async () => {
      await runRemoteSearch();
    });
  }

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

async function runRemoteSearch() {
  if (!SOURCE_CONFIG[state.source].remoteSearch || state.loading) {
    return;
  }

  state.remoteQuery = state.query.trim();
  await reloadSourceData({ keepFilters: true });
}

async function reloadSourceData({ keepFilters }) {
  state.loading = true;
  renderLoadingState();

  const payload = await loadNewsPayloadBySource(state.source, state.remoteQuery);
  const fallback = FALLBACK_NEWS_ITEMS_BY_SOURCE[state.source] || [];
  newsItems = payload.items.length ? payload.items : fallback;

  if (!keepFilters) {
    resetFilters();
  }

  renderUpdatedAt(payload.generatedAt);
  applyDateBounds();
  renderSourceMeta(payload);
  renderAllFilters();
  renderCards();

  state.loading = false;
  syncSourceUi();
}

async function loadNewsPayloadBySource(source, remoteQuery) {
  if (source === "live") {
    const url = buildLiveRequestUrl(remoteQuery);
    const payload = await tryLoadNewsPayload(url);
    if (payload) {
      return payload;
    }
    return { items: [], generatedAt: "" };
  }

  if (source === "x") {
    const url = buildXRequestUrl(remoteQuery);
    const payload = await tryLoadNewsPayload(url);
    if (payload) {
      return payload;
    }
    return { items: [], generatedAt: "" };
  }

  if (source === "xhs") {
    const url = buildXhsRequestUrl(remoteQuery);
    const payload = await tryLoadNewsPayload(url);
    if (payload) {
      return payload;
    }
    return { items: [], generatedAt: "" };
  }

  return loadAiNewsPayload();
}

async function loadAiNewsPayload() {
  const urls = ["/api/news", "./data/news.json"];
  const emptyPayload = { items: [], generatedAt: "" };

  for (const url of urls) {
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

function buildLiveRequestUrl(rawQuery) {
  const params = new URLSearchParams();
  params.set("limit", "100");

  const query = String(rawQuery || "").trim();
  if (query) {
    params.set("q", query.slice(0, 100));
  }

  return `/api/live-news?${params.toString()}`;
}

function buildXRequestUrl(rawQuery) {
  const params = new URLSearchParams();
  params.set("limit", "80");

  const query = String(rawQuery || "").trim();
  const likesMatch = query.match(/(?:^|\s)likes:(\d{1,7})(?:\s|$)/i);
  const hashtagMatch = query.match(/#([A-Za-z0-9_]{2,32})/);

  if (likesMatch) {
    params.set("minLikes", likesMatch[1]);
  }

  if (hashtagMatch) {
    params.set("hashtag", hashtagMatch[1]);
  }

  const userMatch = query.match(/^@?([A-Za-z0-9_]{1,15})$/);
  if (userMatch) {
    params.set("mode", "user");
    params.set("username", userMatch[1]);
    return `/api/x-monitor?${params.toString()}`;
  }

  const watchlistMatches = query
    .split(/[\s,]+/)
    .map((part) => part.trim().replace(/^@+/, ""))
    .filter((part) => /^[A-Za-z0-9_]{1,15}$/.test(part));
  if (watchlistMatches.length >= 2) {
    params.set("mode", "watchlist");
    params.set("usernames", Array.from(new Set(watchlistMatches)).slice(0, 20).join(","));
    return `/api/x-monitor?${params.toString()}`;
  }

  const cleaned = query
    .replace(/(?:^|\s)likes:\d{1,7}(?:\s|$)/gi, " ")
    .replace(/#[A-Za-z0-9_]{2,32}/g, " ")
    .trim();

  if (cleaned) {
    params.set("q", cleaned.slice(0, 120));
  }

  return `/api/x-monitor?${params.toString()}`;
}

function buildXhsRequestUrl(rawQuery) {
  const params = new URLSearchParams();
  params.set("limit", "100");
  const query = String(rawQuery || "").trim();
  if (query) {
    params.set("q", query.slice(0, 80));
  }
  return `/api/xhs-feed?${params.toString()}`;
}

function syncSourceUi() {
  const config = SOURCE_CONFIG[state.source] || SOURCE_CONFIG.ai;
  elements.search.placeholder = config.placeholder;

  if (elements.remoteSearchBtn) {
    if (config.remoteSearch) {
      elements.remoteSearchBtn.hidden = false;
      elements.remoteSearchBtn.textContent = state.loading ? "查询中..." : "云端查询";
      elements.remoteSearchBtn.disabled = state.loading;
    } else {
      elements.remoteSearchBtn.hidden = true;
      elements.remoteSearchBtn.disabled = false;
    }
  }
}

function renderSourceMeta(payload) {
  const config = SOURCE_CONFIG[state.source] || SOURCE_CONFIG.ai;
  const suffix = payload.items.length ? ` · 本次 ${payload.items.length} 条` : "";
  const queryText = state.remoteQuery ? ` · 关键词：${state.remoteQuery}` : "";
  elements.sourceHint.textContent = `${config.hint}${suffix}${queryText}`;
}

function renderSourceChips() {
  if (!elements.sourceTags) {
    return;
  }

  const sourceValues = Object.keys(SOURCE_CONFIG);
  renderChips(
    elements.sourceTags,
    sourceValues,
    state.source,
    async (sourceKey) => {
      if (state.loading || sourceKey === state.source) {
        return;
      }

      state.source = sourceKey;
      state.remoteQuery = "";
      state.query = "";
      state.langByCard = {};
      elements.search.value = "";

      syncSourceUi();
      renderSourceChips();
      await reloadSourceData({ keepFilters: false });
    },
    (value) => SOURCE_CONFIG[value]?.label || value
  );
}

function resetFilters() {
  state.platform = "全部";
  state.stage = "全部";
  state.topic = "全部";
  state.selectedDate = "";

  if (elements.date) {
    elements.date.value = "";
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

function renderAllFilters() {
  renderSourceChips();

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

function renderChips(container, values, active, onSelect, labelMapper) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${value === active ? " active" : ""}`;
    button.textContent = labelMapper ? labelMapper(value) : value;
    button.addEventListener("click", () => onSelect(value));
    container.appendChild(button);
  });
}

function getFilteredNews() {
  const queryLower = state.query.toLowerCase();

  return newsItems.filter((item) => {
    const pool = `${item.titleOriginal || item.title || ""} ${item.titleZh || ""} ${item.summaryOriginal || item.summary || ""} ${item.summaryZh || ""} ${item.action || ""} ${item.platform || ""} ${item.region || ""} ${(item.contentTags || []).join(" ")}`.toLowerCase();

    const matchesQuery = !queryLower || pool.includes(queryLower);
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

  const aiScore = Number.isFinite(Number(item.aiScore)) ? Number(item.aiScore) : null;
  const signal = normalizeSignal(item.signal);
  const metrics = normalizeMetrics(item.metrics);

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
        ${
          aiScore !== null
            ? `<span class="badge score">AI分 ${escapeHtml(String(aiScore))}</span>`
            : ""
        }
        ${signal ? `<span class="badge signal">${escapeHtml(signal)}</span>` : ""}
      </div>

      ${
        contentTags.length
          ? `<div class="meta-line">${contentTags
              .map((tag) => `<span class="badge topic">${escapeHtml(tag)}</span>`)
              .join("")}</div>`
          : ""
      }

      ${
        metrics
          ? `<div class="meta-line"><span class="badge metric">点赞 ${metrics.likes}</span><span class="badge metric">转推 ${metrics.retweets}</span><span class="badge metric">回复 ${metrics.replies}</span></div>`
          : ""
      }

      <div class="takeaway-box">可执行动作：${escapeHtml(item.action || "")}</div>

      <div class="meta-line">
        ${sourceLinkHtml}
      </div>
    </article>
  `;
}

function normalizeSignal(value) {
  const text = String(value || "").toLowerCase();
  if (text === "long") {
    return "信号：看涨";
  }
  if (text === "short") {
    return "信号：看跌";
  }
  if (text === "neutral") {
    return "信号：中性";
  }
  return "";
}

function normalizeMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") {
    return null;
  }

  const likes = toNonNegativeInt(metrics.likes);
  const retweets = toNonNegativeInt(metrics.retweets);
  const replies = toNonNegativeInt(metrics.replies);

  if (likes === 0 && retweets === 0 && replies === 0) {
    return null;
  }

  return { likes, retweets, replies };
}

function toNonNegativeInt(value) {
  const parsed = Number.parseInt(String(value || "0"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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
