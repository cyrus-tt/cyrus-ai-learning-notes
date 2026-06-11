# 网站功能扩展计划 — 邮件订阅 + 内容产出 + 体验优化

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 围绕"个人 AI IP 建设 + 信息差变现"目标，给 cyrustyj.xyz 加上流量沉淀（Newsletter）、内容批量产出管线、站内搜索、RSS 输出、顾问获客入口，把"路过看看"变成"长期关系"。

**Architecture:** 纯静态站 + Cloudflare Pages Functions，不引入后端框架。Newsletter 用 Buttondown 免费层（API 收集邮箱），RSS 用 GitHub Actions 自动生成。新教程沿用 `field-notes/{slug}/index.html` 目录结构。搜索用 Pagefind（构建时索引，零运行时成本）。

**Tech Stack:** HTML/CSS/JS（现有栈）、Buttondown API、Pagefind、GitHub Actions

---

## Phase 1: 流量沉淀 — Newsletter 订阅

> 优先级最高。没有订阅 = 所有流量都是一次性的。

### Task 1.1: 创建邮件订阅组件

**Files:**
- Create: `js/components/subscribe.js`
- Modify: `styles.css` — 追加订阅表单样式（文件末尾）
- Modify: `index.html` — 在 AI 资讯 promo 下方插入订阅区块
- Modify: `news.html` — 页面底部插入订阅区块

**Step 1: 创建 subscribe.js**

纯前端组件，提交邮箱到 Buttondown API（免费层，无需后端）：

```js
(() => {
  const BUTTONDOWN_API = "https://api.buttondown.com/v1/subscribers";

  function createSubscribeForm(container) {
    if (!container) return;
    container.innerHTML = `
      <form class="subscribe-form" aria-label="邮件订阅">
        <input type="email" name="email" placeholder="your@email.com"
               required autocomplete="email" class="subscribe-input" />
        <button type="submit" class="subscribe-btn">订阅</button>
      </form>
      <p class="subscribe-status" aria-live="polite"></p>
    `;

    const form = container.querySelector("form");
    const status = container.querySelector(".subscribe-status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!email) return;

      status.textContent = "提交中…";
      try {
        const res = await fetch(BUTTONDOWN_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email_address: email, type: "regular" }),
        });
        if (res.ok || res.status === 201) {
          status.textContent = "订阅成功！请查收确认邮件。";
          form.reset();
        } else {
          const data = await res.json().catch(() => ({}));
          status.textContent = data.detail || "订阅失败，请稍后重试。";
        }
      } catch {
        status.textContent = "网络错误，请稍后重试。";
      }
    });
  }

  document.querySelectorAll("[data-subscribe]").forEach(createSubscribeForm);
})();
```

**Step 2: 在 styles.css 末尾追加样式**

```css
/* ─── Subscribe ─── */
.subscribe-section { padding: 40px 0; text-align: center; border-top: 1px solid var(--line); margin-top: 48px; }
.subscribe-section h3 { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.subscribe-section p.subscribe-desc { font-size: 14px; color: var(--muted); margin: 0 0 16px; }
.subscribe-form { display: flex; gap: 8px; max-width: 400px; margin: 0 auto; }
.subscribe-input { flex: 1; padding: 10px 14px; border: 1.5px solid var(--line); border-radius: 8px; font-size: 14px; background: var(--bg); color: var(--ink); }
.subscribe-input:focus { outline: none; border-color: var(--accent); }
.subscribe-btn { padding: 10px 20px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.subscribe-btn:hover { opacity: .9; }
.subscribe-status { font-size: 13px; margin: 8px 0 0; min-height: 20px; color: var(--muted); }
```

**Step 3: 在 index.html 插入订阅区块**

在 `<!-- AI News promo -->` section 之后、`</main>` 之前插入：

```html
<section class="content subscribe-section">
  <h3>Cyrus Weekly</h3>
  <p class="subscribe-desc">每周一封 AI 实践精华，不废话，只给可执行的。</p>
  <div data-subscribe></div>
</section>
```

并在 `</body>` 前加载：`<script src="./js/components/subscribe.js"></script>`

**Step 4: 在 news.html 底部同样插入订阅区块**

在 footer 之前加同样的 section 和 script 引用。

**Step 5: 本地验证**

- 打开 index.html，确认订阅框出现，样式正常
- 输入无效邮箱，确认 HTML5 校验拦截
- 提交合法邮箱（实际 API 需配置 Buttondown token 后才通）

**Step 6: Commit**

```bash
git add js/components/subscribe.js styles.css index.html news.html
git commit -m "feat: add email subscribe component (Buttondown)"
```

### Task 1.2: 注册 Buttondown 并配置

**这一步需要用户手动操作：**

1. 访问 buttondown.com 注册免费账号
2. 在 Settings → API 获取 API Key
3. 决定是否需要 Cloudflare Functions 做代理（避免前端暴露 API Key），或直接用 Buttondown 的无 Key 嵌入模式
4. 如果用代理模式 → 创建 `functions/api/subscribe.js` 中转

> **决策点：** 免费层的 Buttondown 支持无 API Key 的 HTML form action 提交（`https://buttondown.com/api/emails/embed-subscribe/YOUR_USERNAME`），这种方式更简单且不暴露 Key。如果用户接受这种方式，subscribe.js 可以简化为 form action 直接提交。

---

## Phase 2: 内容批量产出

> 内容是 IP 的根基。实验室目前只有 1 篇，要快速补到 3-5 篇。

### Task 2.1: 第二篇教程 — n8n + Ollama 本地 AI 管道

**Files:**
- Create: `field-notes/n8n-ollama-local-pipeline/index.html`
- Modify: `index.html` — 更新首页 Latest 列表，把 "Coming soon" 换成真实链接
- Modify: `sitemap.xml` — 追加新 URL

**Step 1: 创建教程目录和 HTML**

沿用 `claude-code-skills-guide/index.html` 的模板结构：
- 同样的 head meta（OG、Twitter Card、Schema）
- 同样的 nav + breadcrumb + article 结构
- 内容来自 ClawBot 项目的实际经验（`clawbot/` 目录）

**内容大纲：**
1. 为什么要本地 AI 管道（隐私 + 零成本 + 可控）
2. 架构图：微信/Telegram → n8n webhook → HTTP fetch → Ollama → Markdown → Obsidian
3. Docker 部署 n8n（端口 5680）
4. Ollama 安装 + qwen3:8b 模型拉取
5. n8n workflow 配置（附截图位置或 JSON 导出链接）
6. 实际效果演示
7. 踩坑记录

**Step 2: 更新首页链接**

把 `index.html` 中 "n8n + Ollama 本地 AI 管道" 的 `<a href="/field-notes/">` 改为 `<a href="/field-notes/n8n-ollama-local-pipeline/">`，`Coming soon` 改为日期。

**Step 3: 更新 sitemap.xml**

追加：
```xml
<url>
  <loc>https://cyrustyj.xyz/field-notes/n8n-ollama-local-pipeline/</loc>
  <lastmod>2026-05-08</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
```

**Step 4: Commit**

```bash
git add field-notes/n8n-ollama-local-pipeline/ index.html sitemap.xml
git commit -m "feat: add field note — n8n + Ollama local AI pipeline"
```

### Task 2.2: 第三篇教程 — Cloudflare Pages 零成本建站

**Files:**
- Create: `field-notes/cloudflare-pages-guide/index.html`
- Modify: `index.html` — 更新首页 Latest 列表
- Modify: `sitemap.xml`

**内容大纲：**
1. 为什么选 Cloudflare Pages（免费、快、自带 CDN、Functions）
2. 从 GitHub 仓库一键部署
3. 自定义域名绑定（含你踩过的 403 坑）
4. D1 数据库 + Functions API（以访问统计为例）
5. GitHub Actions 自动更新数据
6. 成本：$0

**Step 1-4: 同 Task 2.1 模式**

**Step 5: Commit**

```bash
git add field-notes/cloudflare-pages-guide/ index.html sitemap.xml
git commit -m "feat: add field note — Cloudflare Pages zero-cost site guide"
```

---

## Phase 3: 站内搜索

> 资讯已有几千条，教程在增长，用户需要搜索。

### Task 3.1: 集成 Pagefind 搜索

**Files:**
- Modify: `index.html` — 在 hero 下方加搜索入口
- Modify: `news.html` — 利用已有的筛选栏加全文搜索
- Create: `.github/workflows/build-search-index.yml`（或合入现有 deploy.yml）

**Step 1: 安装 Pagefind 到构建流程**

Pagefind 在构建时扫描 HTML 生成静态索引文件，前端加载索引做客户端搜索。

在 `.github/workflows/deploy.yml`（或新建 workflow）中加：
```yaml
- name: Build search index
  run: npx pagefind --site . --glob "**/*.html"
```

**Step 2: 在首页加搜索入口**

在 hero section 的 `hero-links` 下加搜索框：
```html
<div id="search" data-pagefind-ui></div>
<link href="/_pagefind/pagefind-ui.css" rel="stylesheet" />
<script src="/_pagefind/pagefind-ui.js"></script>
<script>new PagefindUI({ element: "#search", showSubResults: true });</script>
```

**Step 3: 自定义搜索框样式**

覆盖 Pagefind 默认样式，匹配极简设计（Inter 字体、白底、accent 色高亮）。

**Step 4: 验证**

- 本地跑 `npx pagefind --site . --glob "**/*.html"` 生成索引
- 用 `npx serve .` 起本地服务器验证搜索功能
- 搜索 "Claude Code" 应命中教程页
- 搜索 "n8n" 应命中相关教程

**Step 5: Commit**

```bash
git add .github/workflows/ index.html styles.css
git commit -m "feat: add Pagefind site search"
```

---

## Phase 4: RSS 输出

> 在 AI 从业者圈子里 RSS 是身份符号。消费别人的 RSS 也该提供自己的。

### Task 4.1: 生成 RSS feed

**Files:**
- Create: `scripts/build_rss.py`
- Modify: `.github/workflows/update-news.yml` — 在 news 更新后自动重建 RSS
- Modify: `index.html` — `<head>` 加 `<link rel="alternate" type="application/rss+xml">`

**Step 1: 写 RSS 生成脚本**

扫描 `field-notes/*/index.html` 提取 title、description、date，生成 `feed.xml`：

```python
import os, re, datetime

SITE = "https://cyrustyj.xyz"
NOTES_DIR = "field-notes"

def extract_meta(html_path):
    """从 HTML <meta> 标签提取 title, description, date"""
    with open(html_path) as f:
        content = f.read()
    title = re.search(r'<title>(.+?)</title>', content)
    desc = re.search(r'<meta\s+name="description"\s+content="(.+?)"', content)
    date = re.search(r'article:published_time"\s+content="(.+?)"', content)
    return {
        "title": title.group(1).split("|")[0].strip() if title else "",
        "description": desc.group(1) if desc else "",
        "date": date.group(1) if date else datetime.datetime.now().isoformat(),
    }

def build_rss():
    items = []
    for slug in sorted(os.listdir(NOTES_DIR)):
        idx = os.path.join(NOTES_DIR, slug, "index.html")
        if slug.startswith("_") or not os.path.isfile(idx):
            continue
        meta = extract_meta(idx)
        url = f"{SITE}/field-notes/{slug}/"
        items.append(f"""  <item>
    <title>{meta['title']}</title>
    <link>{url}</link>
    <description>{meta['description']}</description>
    <pubDate>{meta['date']}</pubDate>
    <guid>{url}</guid>
  </item>""")

    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Cyrus Field Notes</title>
  <link>{SITE}</link>
  <description>AI 全栈实践者 Cyrus 的田野笔记</description>
  <language>zh-CN</language>
  <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml"/>
{chr(10).join(items)}
</channel>
</rss>"""

    with open("feed.xml", "w") as f:
        f.write(rss)
    print(f"RSS built: {len(items)} items")

if __name__ == "__main__":
    build_rss()
```

**Step 2: 加入 GitHub Actions**

在 `update-news.yml` 末尾追加 step：
```yaml
- name: Build RSS feed
  run: python scripts/build_rss.py
```

**Step 3: index.html head 加 RSS 发现标签**

```html
<link rel="alternate" type="application/rss+xml" title="Cyrus Field Notes" href="/feed.xml" />
```

**Step 4: Commit**

```bash
git add scripts/build_rss.py feed.xml .github/workflows/update-news.yml index.html
git commit -m "feat: add RSS feed for field notes"
```

---

## Phase 5: 顾问获客入口

> About 页展示了你做顾问，但没有行动入口。

### Task 5.1: 更新 consulting 页 + About 页 CTA

**Files:**
- Modify: `consulting.html` — 从重定向改为真实服务页
- Modify: `about.html` — 在项目卡片区域加"预约咨询"按钮

**Step 1: consulting.html 改为服务页**

当前是重定向到 news.html。改为一个简洁的服务描述页：
- 你解决什么问题（B 端 AI 自动化）
- 服务方式（诊断 → 方案 → 部署）
- 行动按钮：链接到 Cal.com 免费预约或微信二维码
- 导航加入"服务"入口（或保持 4 项导航不变，从 About 页引流）

**Step 2: About 页加 CTA**

在 `§ CONNECT` 区域的社交链接旁边加一个"预约 AI 自动化咨询 →"按钮。

**Step 3: Commit**

```bash
git add consulting.html about.html
git commit -m "feat: add consulting service page with booking CTA"
```

---

## Phase 6: 周报自动生成（Cyrus Weekly）

> 48h report 已有，拓展为固定周报栏目，同时是 Newsletter 内容源。

### Task 6.1: 周报生成脚本

**Files:**
- Create: `scripts/build_weekly.py`
- Create: `weekly/index.html` — 周报列表页
- Modify: `.github/workflows/update-news.yml` — 每周一自动生成

**Step 1: 写周报生成脚本**

从 `data/news.json` 读取最近 7 天数据，按 digest scoring rules 排序，取 Top 10，生成 markdown + HTML。

**Step 2: 创建周报列表页**

展示历史周报列表，每期可点击查看。

**Step 3: 加入 GitHub Actions**

新增 cron schedule，每周一 UTC 02:00 执行。

**Step 4: Commit**

```bash
git add scripts/build_weekly.py weekly/ .github/workflows/
git commit -m "feat: add weekly digest auto-generation"
```

---

## 执行顺序总结

| 优先级 | Phase | 预估工时 | 依赖 |
|--------|-------|----------|------|
| P0 | Phase 1: Newsletter 订阅 | 1h | 用户注册 Buttondown |
| P0 | Phase 2: 内容产出（2 篇教程）| 3-4h | 无 |
| P1 | Phase 4: RSS 输出 | 30min | Phase 2（有内容才有意义）|
| P1 | Phase 3: 站内搜索 | 1h | 无 |
| P2 | Phase 5: 顾问获客入口 | 1h | 用户确认预约方式 |
| P2 | Phase 6: 周报自动生成 | 2h | Phase 1（作为 Newsletter 内容源）|

---

## 需要用户确认的决策点

1. **Buttondown vs 其他邮件服务？** Buttondown 免费层够用（每月 100 订阅者），但如果你有偏好的可以换。
2. **教程内容深度：** n8n + Ollama 那篇，要写到多细？给完全小白看还是有一定技术基础的？
3. **顾问预约方式：** Cal.com 链接？微信二维码？还是简单的邮件联系？
4. **周报分发：** 只在网站上看？还是同步推 Newsletter + 小红书？
