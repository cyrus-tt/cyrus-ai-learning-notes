# 网站体验升级 v2 — 从聚合工具到策展产品

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把 cyrustyj.xyz 从「原始数据聚合」升级为「有观点的策展产品」，核心变化：排序可切换、TIL 短笔记、首页重做为内容入口、整体 UI 一致性打磨。

**Architecture:** 纯前端改动为主。TIL 用 JSON 数据文件 + 静态列表页（同 field-notes 模式）。排序在 news.js 中增加 UI 开关。首页重构为真正的内容 hub。不引入新依赖。

**Tech Stack:** HTML/CSS/JS（现有栈），Python scripts（TIL/RSS 生成）

---

## Task 1: 资讯页排序切换 — 热度 vs 时间

**目标：** 让用户在「按热度排（aiScore 降序）」和「按时间排（publishedAt 降序）」之间一键切换。

**Files:**
- Modify: `news.js` — 在 state 中加 `sortMode`，修改 `getFilteredNews()`，加排序切换 UI
- Modify: `news.html` — 在 filter-toolbar 的 meta-row 中加排序切换按钮
- Modify: `styles.css` — 排序切换按钮样式

**实现要点：**

news.html 的 meta-row 区域加排序开关：
```html
<div class="sort-toggle" role="group" aria-label="排序方式">
  <button class="chip active" data-sort="score">按热度</button>
  <button class="chip" data-sort="time">按时间</button>
</div>
```

news.js 修改：
- `state` 加 `sortMode: "score"`
- `bindEvents()` 中绑定排序按钮点击
- `getFilteredNews()` 中根据 sortMode 切换排序逻辑：
  - score: 现有的 aiScore 降序（已有）
  - time: publishedAt 降序
- 非 "ai" 源默认按时间排，隐藏排序开关

**Commit:** `feat: add sort toggle (score vs time) on news page`

---

## Task 2: 资讯卡片显示 AI 评分徽章

**目标：** 每张卡片的 score-pill 更醒目，加颜色分级（高分绿色、中分橙色、低分灰色）。

**Files:**
- Modify: `styles.css` — score-pill 颜色分级
- Modify: `news.js:renderCard()` — 根据分数添加不同 class

**实现要点：**

score-pill 分级（在 renderCard 中判断）：
- aiScore >= 80: `score-pill score-high`（绿色）
- aiScore >= 60: `score-pill score-mid`（橙色 = accent）
- aiScore < 60: `score-pill score-low`（灰色）

CSS：
```css
.score-pill.score-high { background: var(--ok); color: #fff; }
.score-pill.score-mid { background: var(--accent); color: #fff; }
.score-pill.score-low { background: var(--line); color: var(--muted); }
```

**Commit:** `feat: color-coded AI score badges on news cards`

---

## Task 3: TIL（Today I Learned）短笔记系统

**目标：** 创建一个低门槛内容格式 — 每条 100-300 字的学习笔记，有标签和日期，积累后形成知识库。

**Files:**
- Create: `til/index.html` — TIL 列表页
- Create: `til/entries.json` — TIL 数据文件（JSON 数组）
- Create: `til/til.js` — 前端渲染脚本
- Modify: `index.html` — 首页加 TIL 区块
- Modify: `sitemap.xml` — 加 /til/
- Modify: `styles.css` — TIL 样式

**数据结构 (entries.json):**
```json
[
  {
    "id": "2026-05-08-ollama-think",
    "date": "2026-05-08",
    "title": "Ollama 的 think 参数可以关掉推理过程",
    "body": "在调用 Ollama API 时传 `think: false` 可以跳过模型的内部推理输出，直接拿结果。对于需要结构化 JSON 输出的场景（比如知识管道的标签生成），关掉 think 能减少 50% 以上的输出 token，响应速度快一倍。",
    "tags": ["ollama", "性能优化", "知识管道"],
    "source": "实践发现"
  }
]
```

**TIL 列表页设计：**
- 同 site-nav / site-footer / mg-inner 模式
- 标题：TIL · Today I Learned
- 副标题：每天一条，AI 实践中的碎片知识。
- 列表：按日期降序，每条显示日期 + 标题 + 正文 + 标签
- 用 fetch 加载 entries.json，前端渲染

**首页 TIL 区块（在 Latest 和 AI 资讯之间）：**
```html
<section class="content">
  <div class="section-label">TIL · Today I Learned</div>
  <div id="til-latest"></div>
  <a href="/til/" style="font-size:14px;color:var(--accent);text-decoration:none;">查看全部 →</a>
</section>
```
首页只显示最新 3 条的标题和日期。

**初始内容：写 5 条真实 TIL，从现有代码经验中提取：**
1. Ollama think 参数（从 clawbot workflow）
2. Cloudflare D1 是 SQLite 方言（从 functions/api）
3. Pagefind 只索引有 data-pagefind-body 的元素（刚踩过的坑）
4. Jina Reader 作为免费网页抓取 fallback（从 fetch-content.js）
5. GitHub Actions cron UTC 时区陷阱（从 update-news.yml）

**Commit:** `feat: add TIL (Today I Learned) short notes system`

---

## Task 4: 首页重构 — 从静态列表到内容 Hub

**目标：** 首页变成真正的内容入口，动态展示最新 TIL + 最新教程 + 资讯摘要 + 周报，而不是硬编码的 3 条链接。

**Files:**
- Modify: `index.html` — 重构内容区域
- Create: `js/components/home-feed.js` — 首页动态内容加载
- Modify: `styles.css` — 首页新区块样式

**新首页结构：**
```
[Nav]
[Hero: Field Notes. + bio + links]
[Search (Pagefind)]
[TIL · 最新 3 条 —— 动态加载自 til/entries.json]
[Field Notes · 最新教程 —— 硬编码，手动更新]
[Cyrus Weekly · 最新一期 —— 动态加载自 weekly/index.json]
[AI 资讯入口]
[Subscribe]
[Footer]
```

**home-feed.js 功能：**
- fetch `/til/entries.json` → 渲染最新 3 条到 `#til-latest`
- fetch `/weekly/index.json` → 渲染最新一期到 `#weekly-latest`
- 轻量级，不需要完整框架

**Commit:** `feat: rebuild homepage as content hub`

---

## Task 5: 导航加 TIL 和 Weekly 入口

**目标：** 导航从 4 项扩展到适当数量，让新内容可达。但主导航保持克制，用首页做分发。

**决策：** 主导航保持 4 项（首页 / 关于 / 实验室 / 资讯），TIL 和 Weekly 从首页内容区域入口进入。在 footer 增加 TIL 和 Weekly 链接。

**Files:**
- Modify: 所有页面的 `<footer>` — 加 TIL 和 Weekly 链接
  - `index.html`, `about.html`, `news.html`, `consulting.html`
  - `field-notes/index.html`, `field-notes/*/index.html`
  - `weekly/index.html`
  - `til/index.html`

**Footer 新结构：**
```html
<footer class="site-footer">
  <span>© 2026 Cyrus</span>
  <span>
    <a href="/about.html">关于</a> ·
    <a href="/til/">TIL</a> ·
    <a href="/weekly/">周报</a> ·
    <a href="https://github.com/cyrus-tt" target="_blank" rel="noopener">GitHub</a> ·
    <a href="https://xhslink.com/m/AQ5LCxoWJeF" target="_blank" rel="noopener">小红书</a>
  </span>
</footer>
```

**Commit:** `feat: add TIL and Weekly links to site footer`

---

## Task 6: 视觉一致性打磨

**目标：** 修复已知的视觉不一致：news.html 面包屑还写着旧的 "CYRUS QUARTERLY"，about.html 的 project card 和 timeline 样式要跟极简设计对齐。

**Files:**
- Modify: `news.html` — 面包屑改为 `← 首页`
- Modify: `about.html` — 面包屑同上
- Modify: `field-notes/index.html` — 面包屑同上
- Modify: `field-notes/*/index.html` — 面包屑同上
- Modify: `consulting.html` — 面包屑同上
- Modify: `weekly/index.html` — 面包屑同上

**统一面包屑格式：**
```html
<nav class="mg-crumb">
  <a href="/">← 首页</a>
  <span>/ [当前页面名]</span>
</nav>
```

**Commit:** `fix: unify breadcrumb text across all pages`

---

## Task 7: RSS feed 加入 TIL 内容

**目标：** TIL 条目也应该出现在 RSS feed 中，让订阅者看到短笔记更新。

**Files:**
- Modify: `scripts/build_rss.py` — 同时读取 `til/entries.json`，把每条 TIL 也生成为 RSS item

**TIL RSS item 格式：**
- title: `TIL: {til.title}`
- link: `https://cyrustyj.xyz/til/#til.id`
- description: til.body
- pubDate: til.date

**Commit:** `feat: include TIL entries in RSS feed`

---

## 执行顺序

| # | Task | 预估 | 依赖 |
|---|------|------|------|
| 1 | 资讯排序切换 | 20min | 无 |
| 2 | AI 评分徽章分级 | 10min | 无 |
| 3 | TIL 短笔记系统 | 45min | 无 |
| 4 | 首页重构 | 30min | Task 3 |
| 5 | Footer 导航更新 | 15min | Task 3 |
| 6 | 面包屑统一 | 10min | 无 |
| 7 | RSS 加 TIL | 10min | Task 3 |
