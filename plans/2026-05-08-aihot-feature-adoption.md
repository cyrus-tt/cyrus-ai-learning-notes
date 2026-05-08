# PLAN · 借鉴 aihot 精华功能：推荐理由 + 精选排序 + 日报入口

**创建于**：2026-05-08
**状态**：✅ done

---

## 1. 一句话任务

从 aihot.virxact.com 借鉴 3 个做得好的功能移植到自建网站，提升资讯消费体验。

## 2. 为什么做（Why）

aihot 在"AI 新闻聚合"这个维度做得比我们好的地方有 3 个：推荐理由醒目、精选排序、日报独立入口。但我们有 5 个 aihot 完全没有的差异化能力（X/YouTube/GitHub/小红书监控、AI 干货模板、个人 IP 导流、自定义 watchlist、ClawBot 知识管道），所以策略是"借鉴精华 + 发挥差异"，不是重做。

## 3. 边界（不做什么）

- 不改后端 API / 数据源 / 抓取脚本
- 不改数据结构（`news.json` 里已有 `action`、`aiScore` 字段）
- 不新增页面（日报入口复用现有 digest 功能）
- 不改 resources.html / index.html（本次只改资讯页体验）

## 4. 方案步骤

### Step 1 — 推荐理由提到标题下方（news.js renderCard）

**现状**：`action` 字段渲染在卡片最底部 `.takeaway-box`，不醒目
**目标**：移到标题 `<h3>` 正下方，用 accent 色 + 引号样式，成为卡片第二视觉焦点

改动：
- `news.js` 的 `renderCard()` 函数：把 `takeaway-box` 的 HTML 从卡片底部移到 `<h3>` 后面、`<p>summary</p>` 前面
- `styles.css`：`.takeaway-box` 样式改为左边框 accent 色 + 背景浅 accent，字体稍大

### Step 2 — 精选分排序 + 分数标签醒目化（news.js getFilteredNews）

**现状**：`aiScore` 在 badge 里显示但不排序，列表按时间倒序
**目标**：AI资讯源默认按 aiScore 降序（其他源保持时间序），分数标签用 accent 色高亮

改动：
- `news.js` 的 `getFilteredNews()`：当 `state.source === "ai"` 时，先按 `aiScore` 降序排序，相同分数再按时间
- `news.js` 的 `renderCard()`：aiScore badge 改用 `.badge.score-hot` 样式（大字号 + accent 背景）
- `styles.css`：新增 `.badge.score-hot` 样式

### Step 3 — AI 日报独立入口（news.html + news.js）

**现状**：digest 面板（Top10 日报 + 周报）默认 `hidden`，只在 AI资讯源时显示
**目标**：导航栏加"AI 日报"直链；digest 面板在 AI资讯源时默认展示（不再 hidden）

改动：
- `news.html`：导航 `<nav class="mg-nav">` 增加 `<a href="/news.html#digest">AI 日报</a>`
- `index.html`：导航也加上
- `news.js`：`bootstrap()` 里移除 digest 的 `hidden`（当 source=ai 时）；处理 URL hash `#digest` 自动滚动到 digest 区域
- `resources.html`：导航也加上保持一致

## 5. 涉及文件/资源

- 改动：`news.js`（renderCard + getFilteredNews + bootstrap）、`styles.css`（takeaway-box + badge.score-hot）、`news.html`（导航）、`index.html`（导航）、`resources.html`（导航）
- 只读参考：`data/news.json`（确认 action / aiScore 字段存在）

## 6. 验收标准（全打 ✅ 才算完成）

- [x] 资讯卡片：推荐理由（action）显示在标题下方，accent 左边框 ✅
- [x] AI资讯源：默认按 aiScore 降序排列，高分在前 ✅
- [x] aiScore 用 score-pill 显示在标题左侧，accent 背景 ✅
- [x] digest（日报+周报）在 AI资讯源时默认展开（已有逻辑） ✅
- [x] 导航栏三页统一有"AI 日报"入口 ✅
- [x] 点击"AI 日报"滚动到 digest 区域（hash #digest） ✅
- [x] 其他情报源行为不变（排序仅在 source=ai 时触发） ✅
- [ ] 移动端无水平溢出（需部署后验证）

## 7. 风险 / 阻塞

- 风险：aiScore 字段可能部分新闻为空 → 空值排最后，不能排最前
- 风险：action 字段为空时不应显示空的推荐理由框 → 需判空

## 8. 回滚方案

所有改动在 news.js / styles.css / HTML 中，git 可回退：
```bash
git checkout HEAD -- news.js styles.css news.html index.html resources.html
```

---

## 执行日志

- 2026-05-08 03:50 — Step 1: renderCard() 重构，action 移到标题下方，aiScore 变为 score-pill
- 2026-05-08 03:50 — Step 1: CSS takeaway-box 改为 accent 左边框 + 浅底色，新增 score-pill 样式
- 2026-05-08 03:52 — Step 2: getFilteredNews() 增加 aiScore 降序排序（仅 source=ai）
- 2026-05-08 03:53 — Step 3: 三页导航统一加"AI 日报"入口，bootstrap() 处理 #digest hash 滚动
