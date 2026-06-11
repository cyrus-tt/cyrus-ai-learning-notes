# cyrus-ai-learning-notes — 强制工作流 (Auto-loaded)

> AI 资讯聚合 + 个人 IP 平台。Cloudflare Pages/Workers/D1 全栈项目。
> 本文件在 Claude 打开本项目时自动加载，所有规则**强制执行**。

---

## 🚀 开工第一件事（强制）

进入项目后，做任何事之前先跑：

```bash
git status && git log --oneline -5
```

然后读 `PROGRESS.md` 报告当前进度，确认优先级，**再动手**。

### 必须跑的时机

| 时机 | 原因 |
|---|---|
| 新会话刚进入 | 没有上下文，必须初始化 |
| `/clear` 后 | 等同新会话 |
| 用户说「回到 web 做 X」 | 需要重新对齐 |

---

## 技术栈速查

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | HTML + CSS + Vanilla JS | 无框架，p5.js 做生成艺术 |
| 后端 | Cloudflare Workers Functions | `functions/api/*.js` |
| 数据库 | Cloudflare D1 (SQLite) | `d1/` 下的 migration |
| AI | Cloudflare Workers AI | 数字分身聊天 `functions/api/chat.js` |
| 搜索 | Pagefind | 构建时生成索引 |
| 数据采集 | Python 脚本 | `scripts/*.py`，GitHub Actions 定时跑 |
| 部署 | Cloudflare Pages | `wrangler.toml` 配置 |

## 关键目录

```
functions/api/     → 后端 API（news, chat, watchlist, mc-*）
data/              → JSON 数据源（新闻、watchlist、feed）
scripts/           → Python 采集脚本
d1/                → 数据库 migration
field-notes/       → 教程/模板/案例内容
plans/             → 任务计划
docs/              → 技术文档
js/                → 前端 JS 模块
```

## 分支规范

- `main` — 生产分支，Cloudflare Pages 自动部署
- `claude/*` — Claude Code 工作分支（worktree）
- `codex/*` — Codex 工作分支
- **合并前必须**：本地验证 → VERIFY.md 打勾 → 合 main → 自动部署

## 开发规范

1. **改前端/API 后必须本地验证**：`npx wrangler pages dev .` 跑本地预览
2. **改 D1 schema**：新建 `d1/migration_NNN_描述.sql`，不改已有 migration
3. **改 Python 脚本**：本地跑一次确认输出正确，再提交
4. **改 data/*.json**：不要手动改自动生成的文件（news.json, x_feed.json 等）
5. **隐私红线**：公开页面不暴露真名/学校/公司/职位（见 `lessons-learned.md` L003）

## 教训（必读）

项目已有 `lessons-learned.md`，记录了 3 条生产教训：
- L001: 不要用 Worker 反代 Pages 域名（触发 Bot Fight Mode 403）
- L002: Wrangler OAuth 没有 DNS 写权限，DNS 自动化用 API Token
- L003: 公开站点不暴露隐私信息

**新教训追加到 `lessons-learned.md`，格式参考已有条目。**

## 验收

改动涉及用户可感知的变化时，追加到 `VERIFY.md`。格式：
```markdown
## YYYY-MM-DD · 一句话改了什么 (commit SHA)
**背景**：为什么改 + 用户怎么感知。
- [ ] 具体操作步骤 → 期望结果
```
