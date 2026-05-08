# PLAN · 首页/资讯/干货 UI 迁移到 Magazine（方案 C）设计

**创建于**：2026-05-08
**状态**：🔵 in-progress

---

## 1. 一句话任务

把 `docs/Cyrus-redesign-draft.html` 中 Variant C（Magazine）的 UI 移植到现有的 index/news/resources 三页，保留全部数据功能。

## 2. 为什么做（Why）

现有 UI 是最简风格，缺乏视觉辨识度。Magazine 方案（暖色纸质感 + 杂志排版 + 终端动画 + ticker）视觉冲击力强，匹配"AI 炼金术士"个人品牌。

## 3. 边界（不做什么）

- 不改 news.js / resources.js 的数据逻辑（API 调用、筛选、渲染函数）
- 不改 Cloudflare Pages Functions（`functions/api/*`）
- 不改数据文件（`data/*.json`）
- 不改 auth.js 登录逻辑
- 不改 cron 脚本
- 不做 SPA 改造（保持多 HTML 文件架构）
- 不动 privacy.html / disclaimer.html（低优先）

## 4. 方案步骤

### Step 1 — 提取 Magazine CSS（→ styles.css）
- 从设计稿 `<style>` 中提取 Variant C 相关的 CSS（`:root` tokens、Magazine 类名 `.mg-*`）
- 合并通用样式（filter-bar、chips、news cards、digest 等现有功能组件的样式）
- 保留暗色模式（`html[data-theme="dark"]`）
- 输出：替换 `styles.css`

### Step 2 — 重写 index.html（首页）
- 采用 Magazine masthead + cover hero + 大入口 + marquee + 终端动画
- 保留 `visitStats` ID（visit-stats.js 绑定）
- 保留 `header-inner` class（auth.js 注入 widget）
- 最近笔记区域接入真实数据（从 news.json 动态渲染，或保留静态示例后续迭代）

### Step 3 — 重写 news.html
- 采用 Magazine 风格的 header/subnav/filter-bar
- **关键约束：保留 news.js 的全部 38 个 element ID**：
  - newsSearch, newsSourceTags, newsSourceHint, newsPlatformTags, newsStageTags, newsTopicTags
  - newsDate, newsDateReset, newsCards, newsCount, newsUpdatedAt
  - xWatchlistPanel/Tags, ytWatchlistPanel/Tags, xUserWatchlistPanel/Tags, ytUserWatchlistPanel/Tags
  - creatorSearchBtn/Panel/Close/Input/Results/Submit, loginHintForWatchlist/Btn
  - newsRemoteSearchBtn, newsDigest, digestViewSwitch, digestDayLabel, digestTop10Meta/Body
  - digestWeekLabel/Range/Meta/Briefing/TopEvents
- 样式类名可变，ID 不能变

### Step 4 — 重写 resources.html
- Magazine 风格 header + filter-bar
- 保留 4 个 element ID：resourcesSearch, resourcesTags, resourcesCards, resourcesCount

### Step 5 — 更新 ui.js
- 替换旧的 aurora/cursor-glow/scroll-progress 效果
- 接入 Magazine 的终端打字动画（从设计稿提取）
- 接入暗色模式 toggle（`themeToggle` button）
- 更新 IntersectionObserver 的 fade-up 选择器

### Step 6 — 验证
- 本地 HTTP server 查看三页
- 确认筛选/搜索/日报/周报/博主关注全部功能正常
- 确认暗色模式切换
- 确认移动端响应式

## 5. 涉及文件/资源

- 重写：`index.html`, `news.html`, `resources.html`, `styles.css`, `ui.js`
- 只读参考：`docs/Cyrus-redesign-draft.html`（设计稿）
- 不动：`news.js`, `resources.js`, `auth.js`, `visit-stats.js`, `functions/*`, `data/*`

## 6. 验收标准（全打 ✅ 才算完成）

- [ ] 首页显示 Magazine 风格（masthead + cover + ticker + 终端动画）
- [ ] news.html 筛选/搜索/情报源切换/日报/周报功能全部正常
- [ ] resources.html 搜索/标签筛选正常
- [ ] 暗色模式切换可用
- [ ] 移动端响应式正常（无水平溢出）
- [ ] `cyrus-ai-notes.pages.dev` 部署后正常（push 验证）

## 7. 风险 / 阻塞

- 风险：news.js 的 renderCard() 生成的 HTML class 名可能与新 CSS 冲突 → 需要检查 card 渲染函数
- 风险：设计稿 CSS 2000+ 行，提取过程可能遗漏依赖
- 风险：Magazine 方案的字体（Noto Serif SC + Inter + JetBrains Mono）比现有多，加载可能变慢

## 8. 回滚方案

所有改动在当前分支进行，原文件在 git 历史中可恢复：
```bash
git checkout HEAD -- index.html news.html resources.html styles.css ui.js
```

---

## 执行日志（动手后追加）
