const newsItems = [
  {
    title: "多模型工作流正在成为主流：同一个任务拆给不同模型",
    summary:
      "把'找资料/写初稿/润色/审校'拆开，比只用单模型更稳。你可以先定义固定分工，减少返工。",
    tag: "工作流",
    date: "2026-02-12",
    sourceName: "实战观察",
    sourceUrl: "https://www.xiaohongshu.com"
  },
  {
    title: "AI 搜索正在替代部分传统检索，关键是先写好问题模板",
    summary:
      "先限定场景、产出格式和时间范围，答案可用率会明显提高。不要只问'给我建议'这种泛问题。",
    tag: "方法论",
    date: "2026-02-10",
    sourceName: "学习笔记",
    sourceUrl: "https://www.xiaohongshu.com"
  },
  {
    title: "提示词不再追求长度，开始追求可复用结构",
    summary:
      "用角色、目标、约束、输出格式四段式，能让后续迭代更快，也适合做团队模板。",
    tag: "提示词",
    date: "2026-02-09",
    sourceName: "社区总结",
    sourceUrl: "https://www.xiaohongshu.com"
  },
  {
    title: "AI 自动化的门槛降低：从'写代码'转向'拼流程'",
    summary:
      "从一个固定重复任务入手，例如每周资讯整理。先跑通，再加通知、归档和看板。",
    tag: "自动化",
    date: "2026-02-08",
    sourceName: "实操整理",
    sourceUrl: "https://www.xiaohongshu.com"
  },
  {
    title: "内容创作进入'人机共编'阶段，人工判断更值钱",
    summary:
      "AI 负责收集与初稿，人类负责方向和审美。重点是建立你的内容边界和选题标准。",
    tag: "内容",
    date: "2026-02-05",
    sourceName: "运营观察",
    sourceUrl: "https://www.xiaohongshu.com"
  },
  {
    title: "个人知识库要先定义'可检索字段'，再谈工具",
    summary:
      "最小字段建议：主题、结论、可执行动作、来源。结构先稳定，后续迁移工具更轻松。",
    tag: "知识库",
    date: "2026-02-03",
    sourceName: "知识管理",
    sourceUrl: "https://www.xiaohongshu.com"
  }
];

const playbookItems = [
  {
    title: "爆款选题 30 分钟冲刺",
    tag: "内容生产",
    difficulty: "中",
    description:
      "目标：在 30 分钟内产出 5 个可发小红书的 AI 选题，并带开头钩子。",
    steps: [
      "先列最近 7 天你粉丝问得最多的 3 个问题。",
      "让 AI 给每个问题生成 3 种角度：教程型、避坑型、对比型。",
      "筛掉不能在 1 分钟讲清的题，只保留可立刻开拍的。"
    ],
    prompt:
      "你是短内容策划，请基于[用户问题]输出5个小红书AI选题，每个选题给出：标题、开头钩子、30秒核心观点。"
  },
  {
    title: "AI 资讯日报整理模板",
    tag: "信息收集",
    difficulty: "低",
    description:
      "目标：每天固定时间整理 5 条 AI 信息，并转成同一格式，便于复盘与发布。",
    steps: [
      "固定来源池（3-5个），避免每天换来源。",
      "按'发生了什么/为什么重要/我可以做什么'三栏整理。",
      "最后补一条你的观点，形成个人标签。"
    ],
    prompt:
      "请把以下资讯改写为日报格式：1) 事件摘要 2) 对普通创作者的影响 3) 今天可执行的动作。输出Markdown表格。"
  },
  {
    title: "从 0 到 1 做一个 AI 小工具落地页",
    tag: "项目落地",
    difficulty: "中",
    description:
      "目标：半天内做出能展示价值的静态页面，先验证需求再决定是否开发后台。",
    steps: [
      "先写一句价值主张：这个工具帮谁省什么时间。",
      "做3个模块：痛点、方案、示例结果。",
      "加一个反馈入口，收集真实需求。"
    ],
    prompt:
      "你是产品经理，请为[工具名称]生成一个MVP落地页文案，包含：标题、痛点、方案、用户收益、CTA。"
  },
  {
    title: "一键复盘本周 AI 学习",
    tag: "复盘",
    difficulty: "低",
    description:
      "目标：周末 20 分钟完成学习复盘，沉淀下周可执行清单。",
    steps: [
      "收集本周做过的3件事和遇到的3个卡点。",
      "让AI按'继续/停止/尝试'分类。",
      "输出下周3个优先级最高动作。"
    ],
    prompt:
      "请根据本周记录，输出复盘报告：做得好、需要改进、下周最重要三件事。每件事要有衡量标准。"
  },
  {
    title: "把直播口播变成图文笔记",
    tag: "内容生产",
    difficulty: "中",
    description:
      "目标：把口播脚本快速改成图文结构，复用同一内容资产。",
    steps: [
      "先转写语音，删口头禅。",
      "按'问题-解决-步骤-结果'重组。",
      "补充一页'常见误区'提高收藏率。"
    ],
    prompt:
      "把以下口播改写成小红书图文，风格要清晰直接，包含标题、3段正文、结尾行动引导。"
  },
  {
    title: "客户需求访谈提纲（AI 咨询版）",
    tag: "咨询",
    difficulty: "高",
    description:
      "目标：30 分钟内判定客户是否适合做 AI 项目，避免无效沟通。",
    steps: [
      "先问业务目标，不先聊工具。",
      "明确现有流程和人力成本。",
      "定义一个两周可验证的最小结果。"
    ],
    prompt:
      "请为AI咨询场景生成访谈提纲，分为：目标、现状、约束、成功指标、两周MVP。每部分3个问题。"
  }
];

const projectItems = [
  {
    name: "Cyrus AI 学习站 MVP",
    status: "进行中",
    owner: "Cyrus",
    nextStep: "接入 Cloudflare Pages 并绑定主域名",
    due: "2026-02-20",
    progress: 65
  },
  {
    name: "AI 资讯日报机制",
    status: "验证中",
    owner: "Cyrus",
    nextStep: "连续执行 7 天，观察阅读和收藏反馈",
    due: "2026-02-26",
    progress: 40
  },
  {
    name: "小红书粉丝提问库",
    status: "已上线",
    owner: "Cyrus",
    nextStep: "每周更新高频问题并追加模板答案",
    due: "2026-03-01",
    progress: 100
  },
  {
    name: "AI 咨询服务页",
    status: "进行中",
    owner: "Cyrus",
    nextStep: "补齐服务清单与预约入口",
    due: "2026-02-24",
    progress: 55
  },
  {
    name: "项目案例库",
    status: "验证中",
    owner: "Cyrus",
    nextStep: "先整理 5 个案例并统一模板",
    due: "2026-02-28",
    progress: 30
  }
];

const state = {
  query: "",
  newsTag: "全部",
  playbookTag: "全部"
};

const elements = {
  metricNews: document.getElementById("metric-news"),
  metricPlaybooks: document.getElementById("metric-playbooks"),
  metricProjects: document.getElementById("metric-projects"),
  search: document.getElementById("globalSearch"),
  newsTags: document.getElementById("newsTags"),
  playbookTags: document.getElementById("playbookTags"),
  newsList: document.getElementById("newsList"),
  playbookList: document.getElementById("playbookList"),
  projectBoard: document.getElementById("projectBoard")
};

function setup() {
  updateMetrics();
  initTagFilters();
  bindSearch();
  renderNews();
  renderPlaybooks();
  renderProjects();
}

function updateMetrics() {
  elements.metricNews.textContent = String(newsItems.length);
  elements.metricPlaybooks.textContent = String(playbookItems.length);
  elements.metricProjects.textContent = String(projectItems.length);
}

function initTagFilters() {
  const newsTags = ["全部", ...new Set(newsItems.map((item) => item.tag))];
  const playbookTags = ["全部", ...new Set(playbookItems.map((item) => item.tag))];

  renderTags(elements.newsTags, newsTags, state.newsTag, (tag) => {
    state.newsTag = tag;
    renderNews();
  });

  renderTags(elements.playbookTags, playbookTags, state.playbookTag, (tag) => {
    state.playbookTag = tag;
    renderPlaybooks();
  });
}

function renderTags(container, tags, activeTag, onClick) {
  container.innerHTML = "";

  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${tag === activeTag ? " active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => {
      const siblings = container.querySelectorAll(".chip");
      siblings.forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      onClick(tag);
    });

    container.appendChild(button);
  });
}

function bindSearch() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderNews();
    renderPlaybooks();
  });
}

function renderNews() {
  const filtered = newsItems.filter((item) => {
    const matchesTag = state.newsTag === "全部" || item.tag === state.newsTag;
    const pool = `${item.title} ${item.summary} ${item.tag}`.toLowerCase();
    const matchesQuery = !state.query || pool.includes(state.query);
    return matchesTag && matchesQuery;
  });

  elements.newsList.innerHTML = filtered.length
    ? filtered
        .map(
          (item) => `
            <article class="card">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.summary)}</p>
              <div class="meta-line">
                <span class="badge tag">${escapeHtml(item.tag)}</span>
                <span class="badge date">${formatDate(item.date)}</span>
              </div>
              <div class="meta-line">
                <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">来源：${escapeHtml(item.sourceName)}</a>
              </div>
            </article>
          `
        )
        .join("")
    : '<p class="empty-note">没有匹配的资讯，换个关键词试试。</p>';
}

function renderPlaybooks() {
  const filtered = playbookItems.filter((item) => {
    const matchesTag = state.playbookTag === "全部" || item.tag === state.playbookTag;
    const pool = `${item.title} ${item.description} ${item.steps.join(" ")} ${item.tag} ${item.prompt}`.toLowerCase();
    const matchesQuery = !state.query || pool.includes(state.query);
    return matchesTag && matchesQuery;
  });

  elements.playbookList.innerHTML = filtered.length
    ? filtered
        .map(
          (item) => `
            <article class="card">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
              <div class="meta-line">
                <span class="badge tag">${escapeHtml(item.tag)}</span>
                <span class="badge date">难度：${escapeHtml(item.difficulty)}</span>
              </div>
              <ol class="step-list">
                ${item.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
              </ol>
              <div class="prompt-box">${escapeHtml(item.prompt)}</div>
            </article>
          `
        )
        .join("")
    : '<p class="empty-note">没有匹配的干活模板，换个关键词试试。</p>';
}

function renderProjects() {
  const columns = [
    { key: "进行中", title: "进行中", hint: "正在执行" },
    { key: "验证中", title: "验证中", hint: "小范围试跑" },
    { key: "已上线", title: "已上线", hint: "已对外发布" }
  ];

  elements.projectBoard.innerHTML = columns
    .map((column) => {
      const items = projectItems.filter((item) => item.status === column.key);

      return `
        <section class="status-column">
          <h3>${column.title}</h3>
          <small>${column.hint} · ${items.length} 项</small>
          ${
            items.length
              ? items
                  .map(
                    (item) => `
                      <article class="task-card">
                        <strong>${escapeHtml(item.name)}</strong>
                        <p>负责人：${escapeHtml(item.owner)}</p>
                        <p>下一步：${escapeHtml(item.nextStep)}</p>
                        <p>目标日期：${formatDate(item.due)}</p>
                        <div class="progress-bar" aria-label="项目进度">
                          <span style="width: ${Math.max(0, Math.min(100, item.progress))}%"></span>
                        </div>
                      </article>
                    `
                  )
                  .join("")
              : '<p class="empty-note">当前没有项目。</p>'
          }
        </section>
      `;
    })
    .join("");
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
