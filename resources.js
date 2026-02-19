const resourcesItems = [
  {
    title: "爆款选题 30 分钟冲刺模板",
    tag: "内容生产",
    level: "中",
    description: "30 分钟产出 5 个可发选题，并附开头钩子。",
    steps: [
      "先列 3 个高频问题。",
      "让 AI 输出教程型、避坑型、对比型角度。",
      "筛掉无法 1 分钟讲清的问题。"
    ],
    prompt:
      "你是短内容策划，请基于[用户问题]输出5个小红书AI选题，每个包含：标题、开头钩子、30秒核心观点。"
  },
  {
    title: "AI 资讯日报整理模板",
    tag: "信息整理",
    level: "低",
    description: "每天固定整理 5 条信息并统一格式，便于复盘与发布。",
    steps: [
      "固定 3-5 个来源池。",
      "按“发生了什么 / 为什么重要 / 可执行动作”写。",
      "最后补一条个人观点。"
    ],
    prompt:
      "请把以下资讯整理成日报格式：事件摘要、影响、今日可执行动作。输出Markdown表格。"
  },
  {
    title: "周复盘三段法",
    tag: "复盘",
    level: "低",
    description: "20 分钟复盘一周产出，沉淀下周优先动作。",
    steps: [
      "列出本周完成事项和卡点。",
      "按“继续 / 停止 / 尝试”分类。",
      "只保留下周最重要 3 件事。"
    ],
    prompt:
      "请根据本周记录输出复盘报告：做得好、需改进、下周三件事。每件事附衡量标准。"
  },
  {
    title: "口播转图文生产线",
    tag: "内容生产",
    level: "中",
    description: "把短视频口播快速转成图文，提升一稿多用效率。",
    steps: [
      "转写语音并清理口头禅。",
      "按“问题-解决-步骤-结果”重组。",
      "加“常见误区”段落提升收藏率。"
    ],
    prompt:
      "把以下口播改写成小红书图文，包含标题、3段正文、结尾行动引导。"
  },
  {
    title: "日报自动汇总工作流",
    tag: "自动化",
    level: "中",
    description: "把分散记录自动汇总成日报草稿，减少重复整理。",
    steps: [
      "统一输入池（表格或文档）。",
      "按固定时间触发自动总结。",
      "输出固定格式（进展/风险/明日动作）。"
    ],
    prompt:
      "请把以下零散记录汇总成日报：今日进展、风险、明日动作。最多300字。"
  },
  {
    title: "高频问题标准答复模板",
    tag: "沟通效率",
    level: "低",
    description: "把重复问题沉淀成标准答复，提升私信与评论区效率。",
    steps: [
      "收集最近 30 条高频问题。",
      "按“结论一句话 + 三步建议 + 风险提示”回答。",
      "每周复盘并更新版本。"
    ],
    prompt:
      "请把以下问题改写为标准答复：先给结论，再给三步建议，最后补一个注意事项。"
  },
  {
    title: "AI 任务拆分清单",
    tag: "流程设计",
    level: "高",
    description: "把复杂任务拆分为可交付节点，减少 AI 输出失控。",
    steps: [
      "定义任务终点和验收标准。",
      "拆成“信息收集-草稿-审校-发布”节点。",
      "每个节点只允许一个核心目标。"
    ],
    prompt:
      "请将以下任务拆分为可执行流程，每一步给输入、输出、检查标准。"
  },
  {
    title: "个人知识库最小字段模板",
    tag: "信息整理",
    level: "低",
    description: "先统一字段再选工具，避免后续迁移成本。",
    steps: [
      "每条记录包含主题、结论、动作、来源。",
      "每周清理重复记录。",
      "按场景聚合，不按工具聚合。"
    ],
    prompt:
      "请将以下笔记整理为知识库条目，字段为：主题、结论、动作、来源。"
  }
];

const state = {
  query: "",
  tag: "全部"
};

const elements = {
  search: document.getElementById("resourcesSearch"),
  tags: document.getElementById("resourcesTags"),
  cards: document.getElementById("resourcesCards"),
  count: document.getElementById("resourcesCount")
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
  const tags = ["全部", ...new Set(resourcesItems.map((item) => item.tag))];
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

function getFilteredItems() {
  return resourcesItems.filter((item) => {
    const matchesTag = state.tag === "全部" || item.tag === state.tag;
    const pool = `${item.title} ${item.description} ${item.steps.join(" ")} ${item.tag} ${item.prompt}`.toLowerCase();
    const matchesQuery = !state.query || pool.includes(state.query);
    return matchesTag && matchesQuery;
  });
}

function renderCards() {
  const filtered = getFilteredItems();
  elements.count.textContent = String(filtered.length);

  elements.cards.innerHTML = filtered.length
    ? filtered
        .map(
          (item, index) => `
            <article class="card card-animate" style="--stagger:${index};">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
              <div class="meta-line">
                <span class="badge tag">${escapeHtml(item.tag)}</span>
                <span class="badge date">难度：${escapeHtml(item.level)}</span>
              </div>
              <ol class="step-list">
                ${item.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
              </ol>
              <div class="prompt-box">${escapeHtml(item.prompt)}</div>
            </article>
          `
        )
        .join("")
    : '<p class="empty-note">当前没有匹配干货，换个关键词试试。</p>';

  window.dispatchEvent(new Event("cyrus:cards-rendered"));
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
