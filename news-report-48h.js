const REPORT_URLS = ["./data/news_48h_report.json", "/data/news_48h_report.json"];

const elements = {
  metaSummary: document.getElementById("reportMetaSummary"),
  windowLabel: document.getElementById("reportWindowLabel"),
  generatedAt: document.getElementById("reportGeneratedAt"),
  timezone: document.getElementById("reportTimezone"),
  kpis: document.getElementById("reportKpis"),
  timeline: document.getElementById("reportTimeline"),
  platformBreakdown: document.getElementById("reportPlatformBreakdown"),
  stageBreakdown: document.getElementById("reportStageBreakdown"),
  tagBreakdown: document.getElementById("reportTagBreakdown"),
  sourceTable: document.getElementById("reportSourceTable"),
  topItems: document.getElementById("reportTopItems"),
  latestItems: document.getElementById("reportLatestItems"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchReport() {
  let lastError = null;
  for (const url of REPORT_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("无法读取报告数据");
}

function renderEmpty(container, message) {
  container.innerHTML = `<div class="report-empty">${escapeHtml(message)}</div>`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
}

function renderMeta(report) {
  elements.windowLabel.textContent = `${report.windowStartLocal} -> ${report.windowEndLocal}`;
  elements.generatedAt.textContent = report.generatedAtLocal || "--";
  elements.timezone.textContent = report.timezone || "--";

  const topPlatform = report.highlights?.topPlatform?.name || "未知平台";
  const topTag = report.highlights?.topTag?.name || "未识别热点";
  const topStage = report.highlights?.topStage?.name || "未识别产业链位置";
  elements.metaSummary.textContent = `窗口内共 ${formatNumber(
    report.stats?.totalItems || 0
  )} 条资讯，最密集的平台是 ${topPlatform}，最热标签是 ${topTag}，产业链重心偏向 ${topStage}。`;
}

function renderKpis(report) {
  const stats = report.stats || {};
  const cards = [
    {
      label: "资讯总数",
      value: formatNumber(stats.totalItems || 0),
      hint: `${report.windowHours || 48} 小时窗口内抓取到的条目`,
    },
    {
      label: "高分资讯",
      value: formatNumber(stats.highScoreCount || 0),
      hint: "AI 分大于等于 80 的条目数量",
    },
    {
      label: "来源数量",
      value: formatNumber(stats.sourceCount || 0),
      hint: "去重后的信息源个数",
    },
    {
      label: "平均 AI 分",
      value: stats.avgScore || 0,
      hint: "反映窗口内资讯的整体优先级",
    },
    {
      label: "平台数量",
      value: formatNumber(stats.platformCount || 0),
      hint: "窗口内实际有内容的平台数",
    },
    {
      label: "平均每小时",
      value: stats.avgItemsPerHour || 0,
      hint: "用来判断最近 48 小时的信息流密度",
    },
  ];

  elements.kpis.innerHTML = cards
    .map(
      (card) => `
        <article class="report-kpi-card">
          <p class="report-kpi-label">${escapeHtml(card.label)}</p>
          <strong class="report-kpi-value">${escapeHtml(card.value)}</strong>
          <p class="report-kpi-hint">${escapeHtml(card.hint)}</p>
        </article>
      `
    )
    .join("");
}

function renderTimeline(report) {
  const timeline = Array.isArray(report.timeline) ? report.timeline : [];
  if (!timeline.length) {
    renderEmpty(elements.timeline, "近 48 小时内没有可展示的发布时间分布。");
    return;
  }

  const maxCount = Math.max(...timeline.map((item) => item.count), 1);
  elements.timeline.innerHTML = `
    <div class="timeline-grid">
      ${timeline
        .map((item) => {
          const height = Math.max((item.count / maxCount) * 100, item.count ? 12 : 4);
          return `
            <div class="timeline-card" title="${escapeHtml(
              `${item.bucketStartLocal} -> ${item.bucketEndLocal}`
            )}">
              <div class="timeline-card-track">
                <span class="timeline-card-fill" style="height:${height}%"></span>
              </div>
              <strong class="timeline-card-count">${escapeHtml(item.count)}</strong>
              <span class="timeline-card-label">${escapeHtml(item.label)}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderBreakdown(container, rows, emptyMessage) {
  if (!Array.isArray(rows) || !rows.length) {
    renderEmpty(container, emptyMessage);
    return;
  }

  const maxCount = Math.max(...rows.map((item) => item.count), 1);
  container.innerHTML = rows
    .map((item) => {
      const width = Math.max((item.count / maxCount) * 100, item.count ? 8 : 0);
      return `
        <div class="report-breakdown-row">
          <div class="report-breakdown-head">
            <span>${escapeHtml(item.name)}</span>
            <span>${escapeHtml(item.count)} 条 · ${escapeHtml(item.percentage)}%</span>
          </div>
          <div class="report-breakdown-track">
            <span class="report-breakdown-fill" style="width:${width}%"></span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSourceTable(report) {
  const rows = Array.isArray(report.sourceBreakdown) ? report.sourceBreakdown : [];
  if (!rows.length) {
    renderEmpty(elements.sourceTable, "近 48 小时内没有来源统计。");
    return;
  }

  elements.sourceTable.innerHTML = `
    <div class="report-source-table-head">
      <span>来源</span>
      <span>数量</span>
      <span>平均 AI 分</span>
      <span>最近发布时间</span>
    </div>
    ${rows
      .map(
        (item) => `
          <div class="report-source-table-row">
            <span>${escapeHtml(item.name)}</span>
            <span>${escapeHtml(item.count)}</span>
            <span>${escapeHtml(item.avgScore)}</span>
            <span>${escapeHtml(item.latestPublishedAtLocal)}</span>
          </div>
        `
      )
      .join("")}
  `;
}

function renderTopItems(report) {
  const items = Array.isArray(report.topItems) ? report.topItems : [];
  if (!items.length) {
    renderEmpty(elements.topItems, "近 48 小时内没有高优先级资讯。");
    return;
  }

  elements.topItems.innerHTML = items
    .map((item) => {
      const summary = item.summaryZh || item.summary || "暂无摘要";
      const title = item.titleZh || item.title || "未命名资讯";
      const tags = Array.isArray(item.contentTags) ? item.contentTags.slice(0, 4) : [];
      const link = item.sourceUrl
        ? `<a class="report-card-link" href="${escapeHtml(
            item.sourceUrl
          )}" target="_blank" rel="noopener noreferrer nofollow">打开原文</a>`
        : `<span class="report-card-link disabled">原文缺失</span>`;

      return `
        <article class="report-item-card">
          <div class="report-item-topline">
            <span class="badge score">AI分 ${escapeHtml(item.aiScore)}</span>
            <span class="badge date">${escapeHtml(item.publishedAtLocal)}</span>
          </div>
          <h3>${escapeHtml(title)}</h3>
          <p class="report-item-meta">${escapeHtml(item.platform)} · ${escapeHtml(
            item.sourceName
          )} · ${escapeHtml(item.industryStage)}</p>
          <p class="report-item-summary">${escapeHtml(summary)}</p>
          <div class="report-item-tags">
            ${tags.map((tag) => `<span class="badge tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="report-item-footer">
            ${link}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLatestItems(report) {
  const items = Array.isArray(report.latestItems) ? report.latestItems : [];
  if (!items.length) {
    renderEmpty(elements.latestItems, "近 48 小时内没有最新资讯列表。");
    return;
  }

  elements.latestItems.innerHTML = items
    .map((item) => {
      const title = item.titleZh || item.title || "未命名资讯";
      return `
        <article class="report-latest-item">
          <div class="report-latest-meta">
            <span>${escapeHtml(item.publishedAtLocal)}</span>
            <span>${escapeHtml(item.platform)}</span>
            <span>${escapeHtml(item.sourceName)}</span>
          </div>
          <div class="report-latest-main">
            <strong>${escapeHtml(title)}</strong>
            <span class="badge score">AI分 ${escapeHtml(item.aiScore)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function init() {
  try {
    const report = await fetchReport();
    renderMeta(report);
    renderKpis(report);
    renderTimeline(report);
    renderBreakdown(
      elements.platformBreakdown,
      report.platformBreakdown,
      "近 48 小时内没有平台分布数据。"
    );
    renderBreakdown(
      elements.stageBreakdown,
      report.stageBreakdown,
      "近 48 小时内没有产业链分布数据。"
    );
    renderBreakdown(
      elements.tagBreakdown,
      report.tagBreakdown,
      "近 48 小时内没有标签分布数据。"
    );
    renderSourceTable(report);
    renderTopItems(report);
    renderLatestItems(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    elements.metaSummary.textContent = `报告加载失败：${message}`;
    renderEmpty(elements.kpis, "无法读取本地报告数据，请先执行抓取与报表生成脚本。");
    renderEmpty(elements.timeline, "无法渲染时间线。");
    renderEmpty(elements.platformBreakdown, "无法渲染平台分布。");
    renderEmpty(elements.stageBreakdown, "无法渲染产业链分布。");
    renderEmpty(elements.tagBreakdown, "无法渲染标签分布。");
    renderEmpty(elements.sourceTable, "无法渲染来源表。");
    renderEmpty(elements.topItems, "无法渲染 Top 资讯。");
    renderEmpty(elements.latestItems, "无法渲染最新资讯。");
  }
}

window.addEventListener("DOMContentLoaded", init);
