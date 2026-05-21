# cyrus-ai-learning-notes 项目进度

> **用途**：跟踪功能开发 + 内容建设 + 基础设施
> **最后更新**：2026-05-21

---

## 🎯 当前焦点（WIP 上限 = 3）

| # | 任务 | 状态 | 下一步 |
|---|---|---|---|
| 1 | Mission Control 仪表盘 | 🟡 in-progress | D1 migration 005/006 未提交，mc-sync/mc-tasks API 未提交 |
| 2 | 语义搜索 (Vectorize + Workers AI) | 🔵 planned | 用 Cloudflare Vectorize 做教程语义搜索 |

---

## ✅ 已完成

| 任务 | 完成日 | Plan 文件 |
|---|---|---|
| 安全加固 + 性能优化 + CSS 清理 + 共享 Harness | 05-21 | `plans/wise-crunching-emerson.md` |
| AI-Native 升级：Cmd+K 面板 + Explain This + 上下文聊天 | 05-20 | — |
| 教程 UX：Copy-Code + TOC 侧边栏 + 分享按钮 + 知识测验 | 05-14 | — |
| 社交分享优化：PNG OG 图 + 完整 meta tags | 05-14 | — |
| GEO 优化：llms.txt + robots.txt AI 爬虫 + sitemap | 05-14 | — |
| Visit Streak 学习打卡系统 | 05-14 | — |
| 功能升级：AI Playground + 评论 + 阅读体验 | 05-14 | — (调研+实施) |
| Design System 2.0 全站视觉升级 | 05-14 | — (直接实施) |
| AI Cyrus 聊天机器人 | 05-08 | `docs/plans/2026-05-09-ai-native-v3.md` Phase 2 |
| p5.js 神经网络生成艺术 Hero | 05-08 | 同上 Phase 1 |
| View Transitions 页面过渡 | 05-08 | 同上 Phase 1 |
| AEO 信息架构重设计 | 05-08 | `plans/2026-05-08-aeo-blog-architecture.md` |
| aihot 功能移植（评分排序/徽章） | 05-08 | `plans/2026-05-08-aihot-feature-adoption.md` |
| 域名 403 修复 | 05-07 | `plans/2026-05-07-fix-domain-403.md` |
| Pagefind 站内搜索 | 05-07 | — |
| RSS 订阅 | 05-07 | — |
| TIL 短笔记系统 | 05-07 | — |
| 周报自动生成 | 05-07 | — |

## ❌ 已放弃

| 任务 | 放弃日 | 原因 |
|---|---|---|
| Magazine UI 重设计 | 05-14 | 用户决定不做，worktree + 分支已清理 |

---

## 📋 未提交的改动（git status）

以下文件已开发但未提交到 main：
- `d1/migration_005_mc.sql`、`d1/migration_006_pinned.sql`（Mission Control）
- `functions/api/mc-*.js`、`functions/api/_lib/mc-auth.js`（Mission Control API，mc-auth 已修复 fail-closed）
- `functions/api/_lib/cors.js`（新增：统一 CORS 白名单模块）
- `mission-control/index.html`（Mission Control 前端）
- `scripts/smoke-test.sh`（新增：部署后端点检查）
- `docs/plans/` 下 3 个历史 plan 文件
- `wrangler.toml`（新增 AI binding）
- `claude-cert/`（Claude 认证相关）

---

## 🏗️ 基础设施

| 组件 | 状态 | 说明 |
|---|---|---|
| Cloudflare Pages | ✅ 运行中 | 自动从 main 部署，部署后 smoke test |
| GitHub Actions | ✅ 运行中 | 每日 09:00/21:00 UTC 更新新闻 |
| 共享 Harness | ✅ 已建立 | `Rules_Skills/rules/shared-code-checklist.md`，通过 $include 全局继承 |
| D1 数据库 | ✅ 运行中 | 6 个 migration 已应用（005/006 待提交） |
| Workers AI | ✅ 运行中 | chat.js 数字分身 |
| 本地 cron | ⚠️ 需确认 | `scripts/install_news_cron.sh` |
