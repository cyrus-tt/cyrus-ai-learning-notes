const newsItems = [
  {
    title: "OpenAI 新功能上线后，开发者开始用更小上下文做稳定任务",
    platform: "X / OpenAI",
    region: "海外",
    date: "2026-02-17",
    summary: "讨论焦点从“模型有多强”转向“流程是否可复用”，提示词结构化再次被强调。",
    action: "先把你的常用任务拆成“输入-约束-输出格式”三个块，再测试稳定性。",
    sourceUrl: "https://openai.com"
  },
  {
    title: "小红书创作者开始批量复用“短视频转图文”流水线",
    platform: "小红书",
    region: "国内",
    date: "2026-02-16",
    summary: "热门做法是先口播后转图文，核心在统一模板而不是每篇重写。",
    action: "建立固定图文骨架：问题、结论、步骤、误区，再让 AI 填充。",
    sourceUrl: "https://www.xiaohongshu.com"
  },
  {
    title: "YouTube 上 Agent 实测内容增多，关注点转向“失败案例”",
    platform: "YouTube",
    region: "海外",
    date: "2026-02-15",
    summary: "越来越多人开始公开失败流程，帮助团队识别自动化边界。",
    action: "你的流程也要记录失败原因，建立“不适合自动化任务清单”。",
    sourceUrl: "https://www.youtube.com"
  },
  {
    title: "即刻与微博上“AI工具合集”热度高，但同质化明显",
    platform: "微博 / 即刻",
    region: "国内",
    date: "2026-02-14",
    summary: "工具名单容易重复，真正差异在具体场景和执行标准。",
    action: "收藏工具前先写一句：它帮我在哪个环节省了几分钟。",
    sourceUrl: "https://weibo.com"
  },
  {
    title: "Reddit 讨论集中在“多模型协作”而非单模型对比",
    platform: "Reddit",
    region: "海外",
    date: "2026-02-13",
    summary: "实战趋势是按任务分工：检索、草稿、审校分别交给不同模型。",
    action: "先用两模型分工试跑：一个出草稿，一个做结构审校。",
    sourceUrl: "https://www.reddit.com"
  },
  {
    title: "B站 AI 教程开始强调“业务目标优先”，弱化炫技",
    platform: "B站",
    region: "国内",
    date: "2026-02-12",
    summary: "教程更关注“投入产出比”，例如脚本效率、客服响应速度、复盘效率。",
    action: "每个 AI 尝试先设定量化指标：节省时间或提升转化。",
    sourceUrl: "https://www.bilibili.com"
  },
  {
    title: "Hacker News 对 AI 编程助手讨论更偏向“工程纪律”",
    platform: "Hacker News",
    region: "海外",
    date: "2026-02-11",
    summary: "重点不在“生成速度”，而在“评审、测试、回滚”是否完备。",
    action: "在 AI 辅助编码流程里固定加入：代码审查 + 最小回归测试。",
    sourceUrl: "https://news.ycombinator.com"
  },
  {
    title: "知乎与公众号内容里“AI知识库”回归轻量结构",
    platform: "知乎 / 公众号",
    region: "国内",
    date: "2026-02-10",
    summary: "先把字段结构统一，再选工具，迁移成本最低。",
    action: "给每条笔记至少保留 4 列：主题、结论、动作、来源。",
    sourceUrl: "https://www.zhihu.com"
  }
];

const state = {
  query: "",
  tag: "全部"
};

const elements = {
  search: document.getElementById("newsSearch"),
  tags: document.getElementById("newsTags"),
  cards: document.getElementById("newsCards"),
  count: document.getElementById("newsCount")
};

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
                <a class="source-link" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看来源</a>
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

setup();
