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
      title: "X watchlist 监控已启用：默认自动拉取优质博主推文",
      titleOriginal: "X watchlist monitoring is enabled with curated creators by default.",
      titleZh: "X watchlist 监控已启用：默认自动拉取优质博主推文",
      summary: "留空直接点“云端查询”会按 watchlist 拉取；你也可输入关键词、#话题或 @用户名切换查询模式。",
      summaryOriginal: "Run cloud query with empty input for watchlist mode, or input keyword/#tag/@username for custom mode.",
      summaryZh: "留空直接点“云端查询”会按 watchlist 拉取；你也可输入关键词、#话题或 @用户名切换查询模式。",
      hasTranslation: true,
      platform: "X/Twitter",
      region: "全球社媒",
      industryStage: "中游",
      contentTags: ["X监控", "情绪信号"],
      date: "2026-02-27",
      action: "先观察 watchlist，再把高价值账号加入固定监控名单。",
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
  ],
  github: [
    {
      title: "GitHub开源聚合已启用：等待数据生成",
      titleOriginal: "GitHub trending aggregation is enabled and waiting for data.",
      titleZh: "GitHub开源聚合已启用：等待数据生成",
      summary: "GitHub 热门 AI 项目聚合已就绪，等待 build_github_trending.py 生成数据。支持双语描述和星数筛选。",
      summaryOriginal: "GitHub trending AI project aggregation is ready with bilingual support.",
      summaryZh: "GitHub 热门 AI 项目聚合已就绪，等待 build_github_trending.py 生成数据。支持双语描述和星数筛选。",
      hasTranslation: true,
      platform: "GitHub",
      region: "全球开源",
      industryStage: "中游",
      contentTags: ["GitHub开源"],
      date: "2026-03-05",
      action: "运行 build_github_trending.py 即可刷新项目列表。",
      sourceUrl: "https://github.com/trending",
      sourceName: "GitHub",
      publishedAt: "2026-03-05T00:00:00+00:00"
    }
  ],
  yt: [
    {
      title: "YouTube监控已启用：等待频道数据",
      titleOriginal: "YouTube monitoring is enabled and waiting for channel feed data.",
      titleZh: "YouTube监控已启用：等待频道数据",
      summary: "YouTube RSS 聚合已就绪，等待 build_yt_watchlist.py 抓取最新视频。支持中英文标题翻译。",
      summaryOriginal: "YouTube RSS aggregation is ready with bilingual title translation.",
      summaryZh: "YouTube RSS 聚合已就绪，等待 build_yt_watchlist.py 抓取最新视频。支持中英文标题翻译。",
      hasTranslation: true,
      platform: "YouTube",
      region: "海外",
      industryStage: "中游",
      contentTags: ["YouTube监控"],
      date: "2026-03-05",
      action: "运行 build_yt_watchlist.py 即可刷新视频列表。",
      sourceUrl: "https://www.youtube.com",
      sourceName: "YouTube",
      publishedAt: "2026-03-05T00:00:00+00:00"
    }
  ]
};

const SEARCH_MAX_LENGTH = 80;
const UNSAFE_INPUT_PATTERN = /[<>"'`]/g;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/g;
const NEWS_REFRESH_BUCKET_MS = 5 * 60 * 1000;
const DIGEST_REFRESH_BUCKET_MS = 5 * 60 * 1000;

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
  },
  github: {
    label: "GitHub开源",
    hint: "当前数据源：GitHub 热门 AI 开源项目（≥1000 Star）",
    placeholder: "例如：agent、rag、llm、python、rust...",
    remoteSearch: true
  },
  yt: {
    label: "YouTube监控",
    hint: "当前数据源：YouTube AI 博主视频聚合（RSS）",
    placeholder: "例如：transformer、tutorial、AI paper...",
    remoteSearch: true
  }
};

let newsItems = [];

const state = {
  source: "ai",
  query: "",
  remoteQuery: "",
  xWatchlist: [],
  ytWatchlist: [],
  customWatchlist: {},
  watchlistToken: localStorage.getItem("watchlist_token") || "",
  creatorSearchOpen: false,
  platform: "全部",
  stage: "全部",
  topic: "全部",
  selectedDate: "",
  langByCard: {},
  digestPayload: null,
  digestView: "list",
  loading: false
};

const elements = {
  search: document.getElementById("newsSearch"),
  sourceTags: document.getElementById("newsSourceTags"),
  sourceHint: document.getElementById("newsSourceHint"),
  xWatchlistPanel: document.getElementById("xWatchlistPanel"),
  xWatchlistTags: document.getElementById("xWatchlistTags"),
  ytWatchlistPanel: document.getElementById("ytWatchlistPanel"),
  ytWatchlistTags: document.getElementById("ytWatchlistTags"),
  creatorSearchBtn: document.getElementById("creatorSearchBtn"),
  creatorSearchPanel: document.getElementById("creatorSearchPanel"),
  creatorSearchClose: document.getElementById("creatorSearchClose"),
  creatorSearchInput: document.getElementById("creatorSearchInput"),
  creatorSearchResults: document.getElementById("creatorSearchResults"),
  creatorSearchSubmit: document.getElementById("creatorSearchSubmit"),
  remoteSearchBtn: document.getElementById("newsRemoteSearchBtn"),
  platformTags: document.getElementById("newsPlatformTags"),
  stageTags: document.getElementById("newsStageTags"),
  topicTags: document.getElementById("newsTopicTags"),
  date: document.getElementById("newsDate"),
  dateReset: document.getElementById("newsDateReset"),
  cards: document.getElementById("newsCards"),
  count: document.getElementById("newsCount"),
  updatedAt: document.getElementById("newsUpdatedAt"),
  digestPanel: document.getElementById("newsDigest"),
  digestViewSwitch: document.getElementById("digestViewSwitch"),
  digestDayLabel: document.getElementById("digestDayLabel"),
  digestTop10Meta: document.getElementById("digestTop10Meta"),
  digestTop10Body: document.getElementById("digestTop10Body"),
  digestWeekLabel: document.getElementById("digestWeekLabel"),
  digestWeekRange: document.getElementById("digestWeekRange"),
  digestWeekMeta: document.getElementById("digestWeekMeta"),
  digestWeekBriefing: document.getElementById("digestWeekBriefing"),
  digestWeekTopEvents: document.getElementById("digestWeekTopEvents")
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

  if (elements.digestViewSwitch) {
    elements.digestViewSwitch.addEventListener("click", (event) => {
      const button = event.target.closest("[data-digest-view]");
      if (!button) {
        return;
      }

      const view = String(button.dataset.digestView || "");
      if (!["list", "cards", "brief"].includes(view)) {
        return;
      }

      state.digestView = view;
      renderDigestViewSwitch();
      renderDigestTop10Body();
    });
  }
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
  state.xWatchlist = Array.isArray(payload.watchlist) ? payload.watchlist : [];

  if (!keepFilters) {
    resetFilters();
  }

  state.ytWatchlist = Array.isArray(payload.watchlist) && state.source === "yt" ? payload.watchlist : state.ytWatchlist;

  renderUpdatedAt(payload.generatedAt);
  applyDateBounds();
  renderSourceMeta(payload);
  renderXWatchlist(payload);
  renderYtWatchlist(payload);
  renderCreatorSearchVisibility();
  renderAllFilters();
  renderCards();

  if (state.source === "ai") {
    await reloadDigestData();
  } else {
    hideDigestPanel();
  }

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
    return emptySourcePayload();
  }

  if (source === "x") {
    const url = buildXRequestUrl(remoteQuery);
    const payload = await tryLoadNewsPayload(url);
    if (payload) {
      return payload;
    }
    return emptySourcePayload();
  }

  if (source === "xhs") {
    const url = buildXhsRequestUrl(remoteQuery);
    const payload = await tryLoadNewsPayload(url);
    if (payload) {
      return payload;
    }
    return emptySourcePayload();
  }

  if (source === "github") {
    const url = buildGithubRequestUrl(remoteQuery);
    const payload = await tryLoadNewsPayload(url);
    if (payload) {
      return payload;
    }
    return emptySourcePayload();
  }

  if (source === "yt") {
    const url = buildYtRequestUrl(remoteQuery);
    const payload = await tryLoadNewsPayload(url);
    if (payload) {
      return payload;
    }
    return emptySourcePayload();
  }

  return loadAiNewsPayload();
}

async function loadAiNewsPayload() {
  const urls = ["/api/news", "./data/news.json"];
  const emptyPayload = emptySourcePayload();

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
      generatedAt: payload.generatedAt || "",
      mode: payload.mode || "",
      source: payload.source || "",
      watchlist: Array.isArray(payload.watchlist) ? payload.watchlist : []
    };
  } catch {
    return null;
  }
}

async function reloadDigestData() {
  if (!elements.digestPanel || state.source !== "ai") {
    return;
  }

  const payload = await loadDigestPayload();
  state.digestPayload = payload || emptyDigestPayload();
  renderDigestPanel();
}

async function loadDigestPayload() {
  const urls = ["/api/digest", "./data/news_digest.json"];
  for (const url of urls) {
    const payload = await tryLoadDigestPayload(url);
    if (payload) {
      return payload;
    }
  }
  return emptyDigestPayload();
}

async function tryLoadDigestPayload(baseUrl) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  const bucket = Math.floor(Date.now() / DIGEST_REFRESH_BUCKET_MS);
  const requestUrl = `${baseUrl}${separator}v=${bucket}`;

  try {
    const response = await fetch(requestUrl, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object") {
      return null;
    }

    return {
      generatedAt: String(payload.generatedAt || ""),
      timezone: String(payload.timezone || "Asia/Shanghai"),
      currentDay: payload.currentDay && typeof payload.currentDay === "object" ? payload.currentDay : {},
      dailyHistory: Array.isArray(payload.dailyHistory) ? payload.dailyHistory : [],
      currentWeek: payload.currentWeek && typeof payload.currentWeek === "object" ? payload.currentWeek : {},
      weeklyHistory: Array.isArray(payload.weeklyHistory) ? payload.weeklyHistory : []
    };
  } catch {
    return null;
  }
}

function emptyDigestPayload() {
  return {
    generatedAt: "",
    timezone: "Asia/Shanghai",
    currentDay: {
      date: "",
      label: "",
      top10: [],
      metrics: {},
      briefing: []
    },
    dailyHistory: [],
    currentWeek: {
      weekKey: "",
      weekLabel: "",
      range: { start: "", end: "" },
      metrics: {},
      topEvents: [],
      briefing: []
    },
    weeklyHistory: []
  };
}

function hideDigestPanel() {
  if (!elements.digestPanel) {
    return;
  }
  elements.digestPanel.hidden = true;
}

function renderDigestLoadingState() {
  if (!elements.digestPanel) {
    return;
  }

  elements.digestPanel.hidden = false;

  if (elements.digestDayLabel) {
    elements.digestDayLabel.textContent = "加载中...";
  }
  if (elements.digestWeekLabel) {
    elements.digestWeekLabel.textContent = "加载中...";
  }
  if (elements.digestWeekRange) {
    elements.digestWeekRange.textContent = "--";
  }
  if (elements.digestTop10Meta) {
    elements.digestTop10Meta.innerHTML = "";
  }
  if (elements.digestWeekMeta) {
    elements.digestWeekMeta.innerHTML = "";
  }
  if (elements.digestTop10Body) {
    elements.digestTop10Body.innerHTML = `
      <div class="digest-skeleton">
        <div class="sk-line w-90"></div>
        <div class="sk-line w-76"></div>
        <div class="sk-line w-55"></div>
      </div>
    `;
  }
  if (elements.digestWeekBriefing) {
    elements.digestWeekBriefing.innerHTML = '<li class="digest-note">周报加载中...</li>';
  }
  if (elements.digestWeekTopEvents) {
    elements.digestWeekTopEvents.innerHTML = "";
  }
}

function renderDigestPanel() {
  if (!elements.digestPanel) {
    return;
  }

  if (state.source !== "ai") {
    hideDigestPanel();
    return;
  }

  elements.digestPanel.hidden = false;
  renderDigestViewSwitch();
  renderDigestDailyMeta();
  renderDigestTop10Body();
  renderDigestWeeklyMeta();
}

function renderDigestViewSwitch() {
  if (!elements.digestViewSwitch) {
    return;
  }

  const buttons = elements.digestViewSwitch.querySelectorAll("[data-digest-view]");
  buttons.forEach((button) => {
    const isActive = button.dataset.digestView === state.digestView;
    button.classList.toggle("active", isActive);
  });
}

function renderDigestDailyMeta() {
  const payload = state.digestPayload || emptyDigestPayload();
  const currentDay = payload.currentDay && typeof payload.currentDay === "object" ? payload.currentDay : {};
  const metrics = currentDay.metrics && typeof currentDay.metrics === "object" ? currentDay.metrics : {};

  if (elements.digestDayLabel) {
    const label = String(currentDay.label || currentDay.date || "--");
    elements.digestDayLabel.textContent = label;
  }

  if (elements.digestTop10Meta) {
    const totalItems = Number.parseInt(String(metrics.totalItems || "0"), 10) || 0;
    const avgScore = Number.parseFloat(String(metrics.avgScore || "0")) || 0;
    const topScore = Number.parseInt(String(metrics.topScore || "0"), 10) || 0;

    elements.digestTop10Meta.innerHTML = [
      `<span class="badge metric">收录 ${totalItems}</span>`,
      `<span class="badge score">均分 ${avgScore}</span>`,
      `<span class="badge score">最高 ${topScore}</span>`
    ].join("");
  }
}

function renderDigestTop10Body() {
  if (!elements.digestTop10Body) {
    return;
  }

  const payload = state.digestPayload || emptyDigestPayload();
  const currentDay = payload.currentDay && typeof payload.currentDay === "object" ? payload.currentDay : {};
  const top10 = Array.isArray(currentDay.top10) ? currentDay.top10 : [];

  if (!top10.length) {
    elements.digestTop10Body.innerHTML = '<p class="digest-note">今日暂无可通报的 Top10 数据。</p>';
    return;
  }

  if (state.digestView === "cards") {
    elements.digestTop10Body.innerHTML = renderDigestCards(top10);
    return;
  }

  if (state.digestView === "brief") {
    elements.digestTop10Body.innerHTML = renderDigestBrief(currentDay, top10);
    return;
  }

  elements.digestTop10Body.innerHTML = renderDigestList(top10);
}

function renderDigestList(top10) {
  const rows = top10
    .map((item) => {
      const sourceUrl = sanitizeExternalUrl(item?.sourceUrl || "");
      const title = escapeHtml(item?.title || "");
      const titleHtml = sourceUrl
        ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${title}</a>`
        : title;

      const rank = escapeHtml(String(item?.rank || "-"));
      const platform = escapeHtml(String(item?.platform || "-"));
      const score = escapeHtml(String(item?.aiScore ?? "-"));
      const publishedAt = escapeHtml(formatDateTimeShort(item?.publishedAt || ""));

      return `<tr>
        <td>${rank}</td>
        <td>${titleHtml}</td>
        <td>${platform}</td>
        <td>${score}</td>
        <td>${publishedAt}</td>
      </tr>`;
    })
    .join("");

  return `
    <div class="digest-table-wrap">
      <table class="digest-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>标题</th>
            <th>平台</th>
            <th>分数</th>
            <th>发布时间</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderDigestCards(top10) {
  const cards = top10
    .map((item) => {
      const sourceUrl = sanitizeExternalUrl(item?.sourceUrl || "");
      const safeTitle = escapeHtml(item?.title || "");
      const titleHtml = sourceUrl
        ? `<a class="digest-card-title" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${safeTitle}</a>`
        : `<span class="digest-card-title">${safeTitle}</span>`;

      const tags = Array.isArray(item?.contentTags) ? item.contentTags : [];
      const tagsHtml = tags
        .slice(0, 3)
        .map((tag) => `<span class="badge topic">${escapeHtml(tag)}</span>`)
        .join("");

      return `
        <article class="digest-mini-card">
          <div class="digest-mini-head">
            <span class="badge metric">#${escapeHtml(String(item?.rank || "-"))}</span>
            <span class="badge score">AI分 ${escapeHtml(String(item?.aiScore ?? "-"))}</span>
          </div>
          ${titleHtml}
          <p class="digest-mini-meta">${escapeHtml(String(item?.platform || "-"))} · ${escapeHtml(
            formatDateTimeShort(item?.publishedAt || "")
          )}</p>
          ${tagsHtml ? `<div class="meta-line">${tagsHtml}</div>` : ""}
          <p class="digest-mini-action">${escapeHtml(String(item?.action || ""))}</p>
        </article>
      `;
    })
    .join("");

  return `<div class="digest-mini-grid">${cards}</div>`;
}

function renderDigestBrief(currentDay, top10) {
  const briefing = Array.isArray(currentDay?.briefing) ? currentDay.briefing : [];
  const briefingHtml = briefing
    .slice(0, 5)
    .map((line) => `<li>${escapeHtml(String(line || ""))}</li>`)
    .join("");

  const topHtml = top10
    .slice(0, 3)
    .map((item) => {
      const sourceUrl = sanitizeExternalUrl(item?.sourceUrl || "");
      const title = escapeHtml(String(item?.title || ""));
      const score = escapeHtml(String(item?.aiScore ?? "-"));
      const text = `${title}（${score}分）`;
      if (!sourceUrl) {
        return `<li>${text}</li>`;
      }
      return `<li><a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${text}</a></li>`;
    })
    .join("");

  return `
    <div class="digest-brief-wrap">
      <ul class="digest-brief-list">${briefingHtml || "<li>暂无简报内容。</li>"}</ul>
      <p class="digest-subtitle">今日优先关注</p>
      <ol class="digest-mini-top">${topHtml || "<li>暂无 Top 事件。</li>"}</ol>
    </div>
  `;
}

function renderDigestWeeklyMeta() {
  const payload = state.digestPayload || emptyDigestPayload();
  const currentWeek = payload.currentWeek && typeof payload.currentWeek === "object" ? payload.currentWeek : {};
  const metrics = currentWeek.metrics && typeof currentWeek.metrics === "object" ? currentWeek.metrics : {};
  const topEvents = Array.isArray(currentWeek.topEvents) ? currentWeek.topEvents : [];
  const briefing = Array.isArray(currentWeek.briefing) ? currentWeek.briefing : [];

  if (elements.digestWeekLabel) {
    elements.digestWeekLabel.textContent = String(currentWeek.weekLabel || "x月第x周");
  }

  if (elements.digestWeekRange) {
    const start = currentWeek?.range?.start || "";
    const end = currentWeek?.range?.end || "";
    elements.digestWeekRange.textContent = formatDateRange(start, end);
  }

  if (elements.digestWeekMeta) {
    const daysCovered = Number.parseInt(String(metrics.daysCovered || "0"), 10) || 0;
    const totalItems = Number.parseInt(String(metrics.totalItems || "0"), 10) || 0;
    const topScore = Number.parseInt(String(metrics.topScore || "0"), 10) || 0;
    elements.digestWeekMeta.innerHTML = [
      `<span class="badge metric">覆盖 ${daysCovered} 天</span>`,
      `<span class="badge metric">收录 ${totalItems}</span>`,
      `<span class="badge score">周最高 ${topScore}</span>`
    ].join("");
  }

  if (elements.digestWeekBriefing) {
    elements.digestWeekBriefing.innerHTML = briefing.length
      ? briefing.map((line) => `<li>${escapeHtml(String(line || ""))}</li>`).join("")
      : '<li class="digest-note">本周简报暂未生成。</li>';
  }

  if (elements.digestWeekTopEvents) {
    elements.digestWeekTopEvents.innerHTML = topEvents.length
      ? topEvents
          .slice(0, 10)
          .map((item) => {
            const sourceUrl = sanitizeExternalUrl(item?.sourceUrl || "");
            const score = escapeHtml(String(item?.aiScore ?? "-"));
            const title = escapeHtml(String(item?.title || ""));
            const titleHtml = sourceUrl
              ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${title}</a>`
              : title;
            return `<li>${titleHtml}<span class="digest-event-meta">${escapeHtml(
              String(item?.platform || "-")
            )} · ${score}分</span></li>`;
          })
          .join("")
      : '<li class="digest-note">本周暂无 Top 事件。</li>';
  }
}

function formatDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "--";
  }

  const format = (date) =>
    date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit"
    });

  return `${format(startDate)} - ${format(endDate)}`;
}

function formatDateTimeShort(raw) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw || "--";
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
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

function buildGithubRequestUrl(rawQuery) {
  const params = new URLSearchParams();
  params.set("limit", "50");
  params.set("minStars", "1000");
  const query = String(rawQuery || "").trim();
  if (query) {
    params.set("q", query.slice(0, 80));
  }
  return `/api/github-trending?${params.toString()}`;
}

function buildYtRequestUrl(rawQuery) {
  const params = new URLSearchParams();
  params.set("limit", "80");
  const query = String(rawQuery || "").trim();
  if (query) {
    params.set("q", query.slice(0, 80));
  }
  return `/api/yt-feed?${params.toString()}`;
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
  const modeText = state.source === "x" && payload.mode ? ` · 模式：${formatXMode(payload.mode)}` : "";
  const watchlistText =
    state.source === "x" && state.xWatchlist.length ? ` · 博主池 ${state.xWatchlist.length} 人` : "";
  elements.sourceHint.textContent = `${config.hint}${suffix}${queryText}${modeText}${watchlistText}`;
}

function renderXWatchlist(payload) {
  if (!elements.xWatchlistPanel || !elements.xWatchlistTags) {
    return;
  }

  if (state.source !== "x") {
    elements.xWatchlistPanel.hidden = true;
    elements.xWatchlistTags.innerHTML = "";
    return;
  }

  const rows = Array.isArray(payload.watchlist) ? payload.watchlist : [];
  elements.xWatchlistPanel.hidden = false;
  elements.xWatchlistTags.innerHTML = "";

  if (!rows.length) {
    elements.xWatchlistTags.innerHTML =
      '<p class="watchlist-note">暂未加载到博主池，可先输入关键词查询。</p>';
    return;
  }

  rows.slice(0, 20).forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip watchlist-chip";
    chip.textContent = formatWatchlistChip(item);
    const tags = Array.isArray(item?.tags) ? item.tags.filter(Boolean).join(" / ") : "";
    if (tags) {
      chip.title = tags;
    }
    elements.xWatchlistTags.appendChild(chip);
  });
}

function renderYtWatchlist(payload) {
  if (!elements.ytWatchlistPanel || !elements.ytWatchlistTags) {
    return;
  }

  if (state.source !== "yt") {
    elements.ytWatchlistPanel.hidden = true;
    elements.ytWatchlistTags.innerHTML = "";
    return;
  }

  const rows = Array.isArray(payload.watchlist) ? payload.watchlist : [];
  elements.ytWatchlistPanel.hidden = false;
  elements.ytWatchlistTags.innerHTML = "";

  if (!rows.length) {
    elements.ytWatchlistTags.innerHTML =
      '<p class="watchlist-note">暂未加载到频道池，可先输入关键词查询。</p>';
    return;
  }

  rows.slice(0, 20).forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip watchlist-chip";
    const name = String(item?.name || "").trim();
    const count = Number(item?.videoCount) || 0;
    chip.textContent = count ? `${name} · ${count}` : name;
    const tags = Array.isArray(item?.tags) ? item.tags.filter(Boolean).join(" / ") : "";
    if (tags) {
      chip.title = tags;
    }
    elements.ytWatchlistTags.appendChild(chip);
  });
}

function renderCreatorSearchVisibility() {
  const showBtn = ["x", "xhs", "yt"].includes(state.source);
  if (elements.creatorSearchBtn) {
    elements.creatorSearchBtn.hidden = !showBtn;
  }
  if (!showBtn && elements.creatorSearchPanel) {
    elements.creatorSearchPanel.hidden = true;
    state.creatorSearchOpen = false;
  }
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

  if (elements.xWatchlistPanel && state.source !== "x") {
    elements.xWatchlistPanel.hidden = true;
  }
  if (elements.ytWatchlistPanel && state.source !== "yt") {
    elements.ytWatchlistPanel.hidden = true;
  }

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

  if (state.source === "ai") {
    renderDigestLoadingState();
  } else {
    hideDigestPanel();
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

function emptySourcePayload() {
  return {
    items: [],
    generatedAt: "",
    mode: "",
    source: "",
    watchlist: []
  };
}

function formatXMode(mode) {
  if (mode === "watchlist") {
    return "博主池";
  }
  if (mode === "user") {
    return "单账号";
  }
  if (mode === "search") {
    return "关键词";
  }
  return mode || "未知";
}

function formatWatchlistChip(item) {
  const username = String(item?.username || "").replace(/^@+/, "");
  const score = Number(item?.score);
  if (!username) {
    return "@" + "unknown";
  }
  if (Number.isFinite(score)) {
    return `@${username} · ${Math.round(score)}`;
  }
  return `@${username}`;
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

      ${renderItemMetrics(item, metrics)}

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

function renderItemMetrics(item, metrics) {
  if (item.platform === "GitHub" && item.metrics) {
    const stars = toNonNegativeInt(item.metrics.stars);
    const forks = toNonNegativeInt(item.metrics.forks);
    const lang = item.repoMeta?.language || "";
    const parts = [];
    if (stars) parts.push(`<span class="badge metric">Stars ${stars.toLocaleString()}</span>`);
    if (forks) parts.push(`<span class="badge metric">Forks ${forks.toLocaleString()}</span>`);
    if (lang) parts.push(`<span class="badge topic">${escapeHtml(lang)}</span>`);
    return parts.length ? `<div class="meta-line">${parts.join("")}</div>` : "";
  }

  if (!metrics) {
    return "";
  }
  return `<div class="meta-line"><span class="badge metric">点赞 ${metrics.likes}</span><span class="badge metric">转推 ${metrics.retweets}</span><span class="badge metric">回复 ${metrics.replies}</span></div>`;
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

function bindCreatorSearchEvents() {
  if (elements.creatorSearchBtn) {
    elements.creatorSearchBtn.addEventListener("click", () => {
      state.creatorSearchOpen = !state.creatorSearchOpen;
      if (elements.creatorSearchPanel) {
        elements.creatorSearchPanel.hidden = !state.creatorSearchOpen;
      }
      if (state.creatorSearchOpen && elements.creatorSearchInput) {
        elements.creatorSearchInput.focus();
      }
    });
  }

  if (elements.creatorSearchClose) {
    elements.creatorSearchClose.addEventListener("click", () => {
      state.creatorSearchOpen = false;
      if (elements.creatorSearchPanel) {
        elements.creatorSearchPanel.hidden = true;
      }
    });
  }

  if (elements.creatorSearchSubmit) {
    elements.creatorSearchSubmit.addEventListener("click", () => {
      performCreatorSearch();
    });
  }

  if (elements.creatorSearchInput) {
    elements.creatorSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        performCreatorSearch();
      }
    });
  }

  if (elements.creatorSearchResults) {
    elements.creatorSearchResults.addEventListener("click", async (event) => {
      const btn = event.target.closest("[data-follow-action]");
      if (!btn) return;
      const action = btn.dataset.followAction;
      const platform = btn.dataset.followPlatform;
      const username = btn.dataset.followUsername;
      const displayName = btn.dataset.followDisplay || username;

      if (!platform || !username) return;

      if (action === "follow") {
        await addToWatchlist(platform, username, displayName);
      } else if (action === "unfollow") {
        await removeFromWatchlist(platform, username);
      }
      await performCreatorSearch();
    });
  }
}

async function performCreatorSearch() {
  if (!elements.creatorSearchInput || !elements.creatorSearchResults) return;
  const query = sanitizeSearchInput(elements.creatorSearchInput.value);
  if (!query) {
    elements.creatorSearchResults.innerHTML = '<p class="watchlist-note">请输入博主名称搜索</p>';
    return;
  }

  const platformMap = { x: "x", xhs: "xhs", yt: "youtube" };
  const platform = platformMap[state.source] || state.source;

  elements.creatorSearchResults.innerHTML = '<p class="watchlist-note">搜索中...</p>';

  const followed = state.customWatchlist[platform] || [];
  const followedSet = new Set(followed.map((item) => item.username));

  if (state.source === "x") {
    const url = `/api/x-monitor?limit=20&q=${encodeURIComponent(query)}`;
    try {
      const resp = await fetch(url, { cache: "no-store" });
      const data = await resp.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const users = new Map();
      items.forEach((item) => {
        const name = String(item?.sourceName || "").replace(/^@/, "");
        if (name && !users.has(name)) {
          users.set(name, { username: name, displayName: name });
        }
      });
      renderCreatorSearchResultList(Array.from(users.values()), platform, followedSet);
    } catch {
      elements.creatorSearchResults.innerHTML = '<p class="watchlist-note">搜索失败，请稍后重试</p>';
    }
    return;
  }

  if (state.source === "yt") {
    const channels = state.ytWatchlist || [];
    const matched = channels.filter((ch) =>
      (ch.name || "").toLowerCase().includes(query.toLowerCase())
    );
    const results = matched.map((ch) => ({
      username: ch.channelId,
      displayName: ch.name
    }));
    renderCreatorSearchResultList(results, platform, followedSet);
    return;
  }

  if (state.source === "xhs") {
    const url = `/api/xhs-feed?limit=20&q=${encodeURIComponent(query)}`;
    try {
      const resp = await fetch(url, { cache: "no-store" });
      const data = await resp.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const users = new Map();
      items.forEach((item) => {
        const name = String(item?.sourceName || "");
        if (name && !users.has(name)) {
          users.set(name, { username: name, displayName: name });
        }
      });
      renderCreatorSearchResultList(Array.from(users.values()), platform, followedSet);
    } catch {
      elements.creatorSearchResults.innerHTML = '<p class="watchlist-note">搜索失败，请稍后重试</p>';
    }
    return;
  }

  elements.creatorSearchResults.innerHTML = '<p class="watchlist-note">当前数据源不支持博主搜索</p>';
}

function renderCreatorSearchResultList(results, platform, followedSet) {
  if (!elements.creatorSearchResults) return;

  if (!results.length) {
    elements.creatorSearchResults.innerHTML = '<p class="watchlist-note">未找到匹配的博主</p>';
    return;
  }

  elements.creatorSearchResults.innerHTML = results
    .slice(0, 20)
    .map((item) => {
      const isFollowed = followedSet.has(item.username);
      const action = isFollowed ? "unfollow" : "follow";
      const label = isFollowed ? "已关注" : "关注";
      const cls = isFollowed ? "follow-btn followed" : "follow-btn";
      return `<div class="creator-result-item">
        <span class="creator-result-name">${escapeHtml(item.displayName || item.username)}</span>
        <button class="${cls}" data-follow-action="${action}" data-follow-platform="${escapeHtml(platform)}" data-follow-username="${escapeHtml(item.username)}" data-follow-display="${escapeHtml(item.displayName || "")}">${label}</button>
      </div>`;
    })
    .join("");
}

async function loadCustomWatchlist(platform) {
  try {
    const resp = await fetch(`/api/watchlist?platform=${encodeURIComponent(platform)}`, { cache: "no-store" });
    const data = await resp.json();
    if (data?.ok && Array.isArray(data.items)) {
      state.customWatchlist[platform] = data.items;
    }
  } catch {
    // ignore
  }
}

async function addToWatchlist(platform, username, displayName) {
  if (!state.watchlistToken) {
    const token = prompt("首次操作需设置 Watchlist Token（与服务端 WATCHLIST_TOKEN 一致）：");
    if (!token) return;
    state.watchlistToken = token.trim();
    localStorage.setItem("watchlist_token", state.watchlistToken);
  }

  try {
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.watchlistToken}`
      },
      body: JSON.stringify({ platform, username, displayName })
    });

    if (!response.ok) {
      if (response.status === 401) {
        state.watchlistToken = "";
        localStorage.removeItem("watchlist_token");
      }
      throw new Error(await readWatchlistError(response, "关注失败"));
    }

    await loadCustomWatchlist(platform);
  } catch (error) {
    alert(String(error?.message || "关注失败，请稍后重试"));
  }
}

async function removeFromWatchlist(platform, username) {
  if (!state.watchlistToken) return;

  try {
    const response = await fetch(`/api/watchlist?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(username)}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${state.watchlistToken}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        state.watchlistToken = "";
        localStorage.removeItem("watchlist_token");
      }
      throw new Error(await readWatchlistError(response, "取消关注失败"));
    }

    await loadCustomWatchlist(platform);
  } catch (error) {
    alert(String(error?.message || "取消关注失败，请稍后重试"));
  }
}

async function readWatchlistError(response, fallback) {
  try {
    const payload = await response.json();
    if (payload?.message) {
      return `${fallback}：${payload.message}`;
    }
    if (payload?.error) {
      return `${fallback}：${payload.error}`;
    }
  } catch {
    // no-op
  }
  return `${fallback}（HTTP ${response.status}）`;
}

async function bootstrapCustomWatchlist() {
  await Promise.all([
    loadCustomWatchlist("x"),
    loadCustomWatchlist("xhs"),
    loadCustomWatchlist("youtube")
  ]);
}

bootstrap();
bindCreatorSearchEvents();
bootstrapCustomWatchlist();
