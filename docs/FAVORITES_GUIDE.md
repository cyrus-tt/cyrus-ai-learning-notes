# 收藏功能使用指南

本文说明 AI Note 项目的收藏功能如何配置、接入和使用。

## 1. 功能概览

收藏功能包含两层：

- 前端收藏管理器：`js/components/favorites.js`
  - 未登录用户：使用 `localStorage` 存储收藏。
  - 登录用户：自动与 `/api/favorites` 同步，避免丢失收藏。
- 服务端 API：`functions/api/favorites.js`
  - `GET /api/favorites` 获取收藏列表
  - `POST /api/favorites` 添加收藏
  - `DELETE /api/favorites?news_id=xxx` 删除收藏

## 2. 数据库配置

执行以下迁移，创建收藏表：

```bash
# 本地 D1
wrangler d1 execute <YOUR_DB_NAME> --local --file=d1/migration_004_favorites.sql

# 远端 D1
wrangler d1 execute <YOUR_DB_NAME> --remote --file=d1/migration_004_favorites.sql
```

新表结构：

- 表名：`user_favorites`
- 字段：`id, user_id, news_id, news_title, news_summary, news_url, news_platform, news_date, created_at`
- 唯一约束：`(user_id, news_id)`
- 索引：`user_id`, `created_at`

## 3. 前端接入

在页面中引入组件：

```html
<script src="/js/components/error-handler.js"></script>
<script src="/js/components/favorites.js"></script>
```

初始化：

```js
const favoritesManager = new window.FavoritesManager({
  apiBase: "/api/favorites",
  storageKey: "ai-note:favorites:v1"
});

await favoritesManager.init();
```

### 3.1 收藏/取消收藏

```js
// 将资讯项加入收藏
await favoritesManager.addFavorite({
  newsId: item.sourceUrl || item.id,
  newsTitle: item.titleZh || item.title,
  newsSummary: item.summaryZh || item.summary,
  newsUrl: item.sourceUrl,
  newsPlatform: item.platform,
  newsDate: item.date
});

// 删除收藏
await favoritesManager.removeFavorite(item.sourceUrl || item.id);

// 切换收藏状态
await favoritesManager.toggleFavorite(item);
```

### 3.2 订阅收藏更新

```js
const unsubscribe = favoritesManager.subscribe((favorites, reason) => {
  console.log("favorites updated:", reason, favorites.length);
  favoritesManager.updateFavoriteButtons();
});

// 页面销毁时解绑
// unsubscribe();
```

### 3.3 渲染收藏列表

```js
const container = document.getElementById("favoriteList");
favoritesManager.renderFavorites(container, (item) => `
  <li>
    <a href="${item.newsUrl}" target="_blank" rel="noopener noreferrer">${item.newsTitle}</a>
    <small>${item.newsPlatform} · ${item.newsDate}</small>
  </li>
`);
```

## 4. API 示例

### 4.1 获取收藏列表

```bash
curl -s "https://your-domain.com/api/favorites" \
  -H "Cookie: session_id=<SESSION_ID>"
```

### 4.2 添加收藏

```bash
curl -s -X POST "https://your-domain.com/api/favorites" \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=<SESSION_ID>" \
  -d '{
    "news_id": "https://example.com/news/123",
    "news_title": "AI Agent 新进展",
    "news_summary": "核心信息摘要",
    "news_url": "https://example.com/news/123",
    "news_platform": "X/Twitter",
    "news_date": "2026-03-14"
  }'
```

### 4.3 删除收藏

```bash
curl -s -X DELETE "https://your-domain.com/api/favorites?news_id=https%3A%2F%2Fexample.com%2Fnews%2F123" \
  -H "Cookie: session_id=<SESSION_ID>"
```

## 5. 同步机制说明

- 未登录：仅保存在浏览器本地 `localStorage`。
- 登录后：`FavoritesManager` 会自动执行同步：
  - 读取本地收藏
  - 拉取服务器收藏
  - 合并去重
  - 将本地新增项补写到服务器
  - 最终以“合并后的最新结果”更新本地缓存

## 6. 错误处理建议

- 前端：推荐启用 `window.ErrorHandler`，可自动展示 toast。
- 后端：API 已返回结构化错误（`error` + `message`），前端可统一解析。
- 网络失败：保留本地收藏，不阻塞页面使用。

## 7. 常见排查

1. `db_not_configured`
- 检查 Cloudflare Pages Functions 是否正确绑定 D1 到 `env.DB`。

2. `unauthorized`
- 确认用户已通过 Google 登录，且请求携带 `session_id` Cookie。

3. 收藏不显示
- 检查 `newsId` 是否稳定且唯一；推荐使用 `sourceUrl` 或后端稳定 ID。
