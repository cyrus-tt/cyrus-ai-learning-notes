const workItems = [
  {
    title: "爆款选题 30 分钟冲刺",
    tag: "内容生产",
    difficulty: "中",
    description:
      "目标：在 30 分钟内产出 5 个可发小红书的 AI 选题，并给出开头钩子。",
    steps: [
      "先列最近 7 天粉丝问得最多的 3 个问题。",
      "让 AI 给每个问题生成教程型、避坑型、对比型三个角度。",
      "筛掉不能 1 分钟讲清的问题，只保留可马上开拍的选题。"
    ],
    prompt:
      "你是短内容策划，请基于[用户问题]输出5个小红书AI选题。每个选题提供：标题、开头钩子、30秒核心观点。"
  },
  {
    title: "AI 资讯日报整理模板",
    tag: "信息收集",
    difficulty: "低",
    description: "目标：每天固定整理 5 条 AI 信息，并统一成可复盘格式。",
    steps: [
      "先固定来源池（3-5 个），不要每天换。",
      "按“发生了什么 / 为什么重要 / 你能立刻做什么”三栏整理。",
      "最后补一条个人观点，形成稳定的内容标签。"
    ],
    prompt:
      "请把以下资讯改写为日报格式：1) 事件摘要 2) 对创作者影响 3) 今天可执行动作。输出 Markdown 表格。"
  },
  {
    title: "从 0 到 1 做一个 AI 小工具落地页",
    tag: "项目落地",
    difficulty: "中",
    description: "目标：半天做出可展示价值的静态页，先验证需求再加后台。",
    steps: [
      "先写一句价值主张：帮谁省什么时间。",
      "只做三个模块：痛点、方案、示例结果。",
      "放一个反馈入口收集真实需求。"
    ],
    prompt:
      "你是产品经理，请为[工具名称]生成MVP落地页文案：标题、痛点、方案、用户收益、CTA。"
  },
  {
    title: "一键复盘本周 AI 学习",
    tag: "复盘",
    difficulty: "低",
    description: "目标：周末 20 分钟完成复盘并输出下周优先动作。",
    steps: [
      "收集本周完成的 3 件事和卡住的 3 个点。",
      "让 AI 按“继续 / 停止 / 尝试”分类。",
      "最终只保留下周最重要的 3 件事。"
    ],
    prompt:
      "请根据本周记录输出复盘报告：做得好、需改进、下周三件事。每件事提供可量化指标。"
  },
  {
    title: "直播口播转图文模板",
    tag: "内容生产",
    difficulty: "中",
    description: "目标：把口播脚本快速转成图文笔记，提高内容复用率。",
    steps: [
      "先转写语音，去掉口头禅。",
      "按“问题-解决-步骤-结果”重组结构。",
      "补一页“常见误区”，提升收藏率。"
    ],
    prompt:
      "把以下口播改写成小红书图文，包含标题、3段正文、结尾行动引导，语言要清晰直接。"
  },
  {
    title: "AI 咨询需求访谈提纲",
    tag: "咨询",
    difficulty: "高",
    description: "目标：30 分钟判断客户是否适合做 AI 项目，避免无效沟通。",
    steps: [
      "先问业务目标，不先聊工具。",
      "确认现有流程、人力投入和耗时成本。",
      "定义两周内可验证的最小结果。"
    ],
    prompt:
      "请生成AI咨询访谈提纲，分为：目标、现状、约束、成功指标、两周MVP。每部分给3个问题。"
  },
  {
    title: "日报自动汇总工作流",
    tag: "自动化",
    difficulty: "中",
    description: "目标：把分散记录自动整理成日报草稿。",
    steps: [
      "把资料统一放进一个输入池（文档或表格）。",
      "按固定时间触发总结。",
      "输出格式固定成“结论+行动项”。"
    ],
    prompt:
      "请把以下零散记录汇总成日报：今日进展、风险、明日动作。语气简洁，最多300字。"
  },
  {
    title: "高频问题标准答复模板",
    tag: "咨询",
    difficulty: "低",
    description: "目标：把重复回答标准化，提升私信和评论区回复效率。",
    steps: [
      "先统计最近 30 条高频问题。",
      "按“结论一句话 + 三步建议 + 风险提示”结构答复。",
      "每周复盘并更新模板。"
    ],
    prompt:
      "请把以下问题改写为标准答复：先给结论，再给三步建议，最后补一个注意事项。"
  }
];

const state = {
  query: "",
  tag: "全部"
};

const elements = {
  search: document.getElementById("workSearch"),
  tags: document.getElementById("workTags"),
  cards: document.getElementById("workCards"),
  count: document.getElementById("workCount")
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

function getFilteredItems() {
  return workItems.filter((item) => {
    const tagMatch = state.tag === "全部" || item.tag === state.tag;
    const pool = `${item.title} ${item.description} ${item.tag} ${item.steps.join(" ")} ${item.prompt}`.toLowerCase();
    const queryMatch = !state.query || pool.includes(state.query);
    return tagMatch && queryMatch;
  });
}

function renderTags() {
  const tags = ["全部", ...new Set(workItems.map((item) => item.tag))];
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

function renderCards() {
  const filtered = getFilteredItems();
  elements.count.textContent = String(filtered.length);

  elements.cards.innerHTML = filtered.length
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
    : '<p class="empty-note">当前没有匹配模板，换个关键词试试。</p>';
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
