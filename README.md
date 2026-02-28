# Cyrus的AI学习笔记 - MVP

一个可直接部署到 Cloudflare Pages 的静态网站（无登录版）。

当前结构：
- 首页只保留两个入口：`AI资讯`、`AI干货`
- `AI资讯`：聚合国内外社媒平台信息，附可执行动作
- `AI资讯`页支持四种情报源切换：站内AI资讯 / 普通实时新闻 / X监控 / 小红书聚合
- `AI干货`：生产力模板与可复用工作流
- `AI资讯`已接入自动抓取（GitHub Actions 每日两次）
- `AI资讯`支持：平台/上下游/标签/时间筛选，外网卡片中英切换，X推文互动指标展示

## 目录结构

- `index.html`：双入口首页
- `news.html`：AI资讯页面
- `news.js`：资讯渲染逻辑（支持情报源切换与云端查询）
- `functions/api/news.js`：AI资讯 API（拉取 GitHub `data/news.json`）
- `functions/api/live-news.js`：普通实时新闻 API（Google News RSS 聚合）
- `functions/api/x-monitor.js`：6551 X 监控 API
- `functions/api/xhs-feed.js`：小红书聚合 API（支持远端 feed 或本地 `data/xhs_feed.json`）
- `functions/api/_lib/intel.js`：6551 数据拉取与归一化工具
- `data/news.json`：自动抓取后生成的资讯数据
- `data/xhs_feed.json`：小红书聚合数据（可由外部脚本更新）
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
- 若希望 GitHub Actions 也写入 D1，需要在仓库 `Secrets` 中配置：
  - `CLOUDFLARE_API_TOKEN`（需包含 D1 / Pages 权限）

### 实时新闻 / X监控 / 小红书聚合

- 在 Cloudflare Pages 项目环境变量中配置：
  - `TWITTER_TOKEN`：6551 X token（`/api/x-monitor` 使用，必填）
  - `OPENNEWS_TOKEN`：可作为 `TWITTER_TOKEN` 兜底（若两者相同可只配一个）
  - `X_MONITOR_USERS`：逗号分隔的 X 监控账号（可选，例如 `elonmusk,VitalikButerin`）
  - `TWITTER_API_BASE`：默认 `https://ai.6551.io`
  - `XHS_FEED_URL`：小红书聚合数据 JSON 地址（可选，不配则读本地 `data/xhs_feed.json`）
- 本地开发可复制 `.dev.vars.example` 为 `.dev.vars` 并填写 token。
- 新增接口：
  - `GET /api/live-news?limit=100&q=跨境电商`
  - `GET /api/x-monitor?limit=80&q=bitcoin`
  - `GET /api/x-monitor?mode=user&username=elonmusk`
  - `GET /api/x-monitor?mode=watchlist&usernames=elonmusk,VitalikButerin`
- `GET /api/xhs-feed?limit=100&q=美妆`
- `news.html` 中切到“实时新闻 / X监控 / 小红书聚合”后，输入关键词并点“云端查询”即可实时拉取。
- `news.html` 在“X监控”里输入多个账号（空格或逗号分隔）会自动走 watchlist 聚合模式。

### AI资讯卡片字段说明

- `industryStage`：AI产业链位置（上游 / 中游 / 下游）
- `contentTags`：内容标签（如 Agent、模型进展、芯片算力、应用落地）
- `titleOriginal` / `summaryOriginal`：原文语种
- `titleZh` / `summaryZh`：中文翻译
- `sourceUrl`：原内容链接

### GitHub 自动更新时间

- 每天北京时间 `09:00` 和 `21:00` 自动运行（UTC `01:00` / `13:00`）
- 你也可以在 GitHub Actions 页面手动点 `Run workflow`
- 页面优先通过 `GET /api/news` 读取最新资讯，`/api/news` 会从 GitHub 主分支实时拉取 `data/news.json` 并缓存 5 分钟
- 因此即使 Cloudflare Pages 没有重新部署，资讯也会跟随 GitHub 自动更新
- 工作流仍保留“数据变更后自动部署”步骤（用于同步站点静态文件），这一步依赖仓库 Secret：`CLOUDFLARE_API_TOKEN`

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
