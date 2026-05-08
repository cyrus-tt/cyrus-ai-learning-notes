# 域名兜底 Worker 说明

用于在 Pages 自定义域 pending 时，先让主域名可用。

## 当前逻辑

- Worker 名称：`cyrus-ai-domain-proxy`
- 脚本文件：`edge-proxy.js`
- 上游：`https://cyrus-ai-notes.pages.dev`
- 触发方式：
  - 路由：`cyrustyj.xyz/*`
  - 自定义域：`www.cyrustyj.xyz`

## 重新部署

```bash
cd /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp
wrangler deploy edge-proxy.js \
  --name cyrus-ai-domain-proxy \
  --compatibility-date 2026-02-19 \
  --var UPSTREAM_URL:https://cyrus-ai-notes.pages.dev \
  --routes 'cyrustyj.xyz/*' \
  --domains www.cyrustyj.xyz
```

## 说明

- 这是临时兜底，不影响 Pages 内容更新。
- 等 Pages 自定义域彻底转为 `active` 后，可删除 Worker 路由。
