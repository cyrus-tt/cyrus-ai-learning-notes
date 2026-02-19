# Cyrus的AI学习笔记 - MVP

一个可直接部署到 Cloudflare Pages 的静态网站（无登录版）。

当前结构：
- 首页只保留两个入口：`AI资讯`、`AI干货`
- `AI资讯`：聚合国内外社媒平台信息，附可执行动作
- `AI干货`：生产力模板与可复用工作流
- `AI资讯`已接入自动抓取（GitHub Actions 每日两次）
- `AI资讯`支持：平台/上下游/标签/时间筛选，外网卡片中英切换

## 目录结构

- `index.html`：双入口首页
- `news.html`：AI资讯页面
- `news.js`：资讯渲染逻辑（从 `data/news.json` 读取）
- `data/news.json`：自动抓取后生成的资讯数据
- `data/news_sources.json`：抓取源配置
- `data/translation_cache.json`：翻译缓存（自动生成）
- `scripts/update_news.py`：抓取脚本
- `.github/workflows/update-news.yml`：定时任务（每日两次）
- `resources.html`：AI干货页面
- `resources.js`：干货数据与筛选逻辑
- `ui.js`：全站滚动显隐、卡片动效、头部状态交互
- `privacy.html`：隐私政策
- `disclaimer.html`：免责声明
- `404.html`：404 页面
- `_headers`：基础安全响应头
- `styles.css`：全站样式
- `robots.txt`、`sitemap.xml`、`site.webmanifest`：SEO/索引文件
- `favicon.svg`、`og-cover.svg`：站点图标与分享图
- `consulting.html`、`work.html`：旧链接跳转页
- `edge-proxy.js`：域名兜底 Worker（代理到 pages.dev）
- `WORKER_FALLBACK.md`：域名兜底 Worker 操作说明
- `d1/schema.sql`：D1 初始化表结构（可选）
- `D1_MIN_PLAN.md`：D1 最小改造说明（可选）
- `CLASSIFICATION_RULES.md`：AI产业链分类定义

## 本地预览

```bash
cd /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp
python3 -m http.server 8080
```

打开：`http://localhost:8080`

## 部署到 Cloudflare Pages

详细步骤见：`DEPLOY_CLOUDFLARE.md`

## 后续维护

### 改 AI资讯抓取源

编辑 `data/news_sources.json`（新增/删除平台）。

### 本地手动更新一次 AI资讯

```bash
cd /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp
python3 -m pip install -r scripts/news_requirements.txt
python3 scripts/update_news.py
```

### D1 数据库存储（已接入）

- 已创建数据库：`cyrus-ai-news`
- 抓取脚本会在每次运行后同步写入：
  - `fetch_runs`（每次抓取）
  - `news_snapshots`（每次抓取的完整快照）
  - `latest_news`（每条资讯最新版本）
- 相关环境变量（可选）：
  - `D1_DATABASE_NAME`：默认 `cyrus-ai-news`
  - `ENABLE_D1_SYNC`：默认开启（设置为 `0/false` 可关闭）
  - `D1_REMOTE`：默认远端写入（设置为 `0/false` 写本地）

### AI资讯卡片字段说明

- `industryStage`：AI产业链位置（上游 / 中游 / 下游）
- `contentTags`：内容标签（如 Agent、模型进展、芯片算力、应用落地）
- `titleOriginal` / `summaryOriginal`：原文语种
- `titleZh` / `summaryZh`：中文翻译
- `sourceUrl`：原内容链接

### GitHub 自动更新时间

- 每天北京时间 `09:00` 和 `21:00` 自动运行（UTC `01:00` / `13:00`）
- 你也可以在 GitHub Actions 页面手动点 `Run workflow`

### 本机定时任务（已配置）

- 当前机器已写入 crontab：每天 `09:00`、`21:00` 自动执行抓取并部署到 Cloudflare Pages
- 查看任务：`crontab -l`
- 查看日志：`tail -n 100 /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp/logs/news-cron.log`

### 改 AI干货内容

编辑 `resources.js` 里的 `resourcesItems` 数组。

### 发布更新

```bash
cd /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp
git add .
git commit -m "update: 网站内容更新"
git push
```

## 域名生效说明

- 当前已部署 Worker 域名兜底代理 `cyrus-ai-domain-proxy`，`cyrustyj.xyz` 与 `www.cyrustyj.xyz` 都可访问。
- 若 Cloudflare Pages 自定义域仍是 `pending`，不影响当前访问（由 Worker 代理到 `cyrus-ai-notes.pages.dev`）。
- 后续可在 Cloudflare 后台修正 DNS 后，切回 Pages 原生自定义域。
