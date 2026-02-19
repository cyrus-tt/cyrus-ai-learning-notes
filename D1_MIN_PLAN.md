# D1 最小改造方案（自用版）

目标：在不改首页结构的前提下，把 `data/news.json` 升级为可查询的数据库存储。

## 适用时机

- 想保存长期历史，不只保留最新 80 条。
- 想按日期、平台、标签做复杂筛选与统计。
- 后续要做后台管理、收藏、人工修正标签。

## 最小落地路径

1. 新建 D1 数据库
2. 初始化表结构（见 `d1/schema.sql`）
3. 在抓取脚本里把“写 JSON”改成“写 D1 + 可选导出 JSON”
4. 前端先继续读 `data/news.json`（兼容模式），确认稳定后再切 API 读取

## 建议命令

```bash
wrangler d1 create cyrus-ai-news
wrangler d1 execute cyrus-ai-news --file d1/schema.sql
```

## 备注

- 自用 MVP 阶段可以先不启用 D1，继续用 JSON 文件是可行的。
- D1 启用后建议保留每日 JSON 备份，便于回滚。
