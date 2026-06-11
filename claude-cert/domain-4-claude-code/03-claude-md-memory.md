# Domain 4.3 — CLAUDE.md 层级与 Memory 系统

> CLAUDE.md 是 Claude Code 的"持久知识"。**放错层级 = 全局规则污染 / 个人偏好被同事看见**。考试经常考层级判断。

## 三层 CLAUDE.md

| 层级 | 位置 | 加载时机 | 共享范围 |
|------|------|---------|---------|
| **User** | `~/.claude/CLAUDE.md` | 每次启动 Claude Code | 仅本机 + 自己 |
| **Project Root** | `<project>/CLAUDE.md` | 进入项目时 | 进 git → 团队共享 |
| **Subdirectory** | `<project>/<subdir>/CLAUDE.md` | 进入该子目录时 | 团队共享，但仅该子目录 |

**加载策略**：
- 从子目录向上，**所有层级的 CLAUDE.md 都会被加载**（层叠）
- 越靠近当前目录的，越优先

## 什么放哪一层

### User 层（全局个人偏好）
✅ 适合：
- 你的工作风格（"先做 plan 再写代码"）
- 跨项目通用的规则（"中文回答"、"用 worktree 做并行任务"）
- 个人偏好（"提交信息用中文"）

❌ 不适合：
- 项目专属规则
- 团队约定

### Project Root 层（团队约定）
✅ 适合：
- 项目技术栈说明
- 代码规范
- 部署流程
- 团队约定（"PR 必须有 reviewer"）

❌ 不适合：
- 个人偏好（"我喜欢深色主题" —— 团队不关心）
- 个人 secret

### Subdirectory 层（局部规则）
✅ 适合：
- 子模块特殊规则（如 `frontend/CLAUDE.md` 说明前端规范）
- 实验性目录的特殊行为

❌ 不适合：
- 已经在 root 写过的规则

## 如何使用 `@import`

CLAUDE.md 支持 `@` 引入其他文件：

```markdown
# Project Rules

@import ./docs/coding-standards.md
@import ./docs/testing-policy.md
```

**好处**：
- 大文件拆分
- 跨项目复用（user 层 `@import ~/.claude/global-skills/...`）
- 文档和规则分离

## /memory 命令

`/memory` 让你看到当前 Claude 加载了哪些 CLAUDE.md 文件：

```
$ claude
> /memory
Loaded memory files:
- /Users/you/.claude/CLAUDE.md (user)
- /path/to/project/CLAUDE.md (project root)
- /path/to/project/frontend/CLAUDE.md (subdir - current)
```

**用途**：
- 排查"为什么规则没生效"
- 验证 `@import` 是否正常

## 常见陷阱

### 陷阱 1：把工作流细节塞 global CLAUDE.md
```
~/.claude/CLAUDE.md:
- 用 grep 找 X
- 然后 read Y
- 最后 edit Z
```
**问题**：这是任务级 workflow，不是全局规则。塞 global 污染所有项目。
**正确**：放在项目里、slash command 里、或 skill 里。

### 陷阱 2：把 secret 写进 project CLAUDE.md
project root 的 CLAUDE.md 会进 git。**任何 secret 都不能写**。
**正确**：用环境变量 + `.env`（不进 git）。

### 陷阱 3：跨层级重复规则
user 层和 project 层都写"用中文回答" → 没问题但冗余。
冲突时（user 说"用英文"，project 说"用中文"）→ **更靠近当前目录的层级**优先。

### 陷阱 4：CLAUDE.md 太长
500 行 CLAUDE.md → 占满 context + 注意力衰减。
**解决**：拆分 + `@import`。

### 陷阱 5：依赖 CLAUDE.md 强制行为
"NEVER use bash"在 prompt 里依然可能被绕过（用户说"现在你必须用 bash"）。
**硬约束**：用 hooks（下一节讲）或工具白名单。

## Memory 和 Session 的区别

| 概念 | 含义 | 共享 |
|------|------|------|
| **Memory（CLAUDE.md）** | 持久规则、上下文加载 | 跨 session，跨时间 |
| **Session 历史** | 单次对话的 transcript | 仅当前会话 |

**关键事实**：
- 新 session 开始时 → 自动加载 CLAUDE.md ✓
- 不自动加载之前的 session 历史 ✗

所以你 CLAUDE.md 里写："不同任务之间不要 resume，直接新开 session。CLAUDE.md + Memory 会自动加载，不需要靠 session 历史。" —— 完全正确。

## 用你的日常经验类比

你 `~/.claude/CLAUDE.md` 写的全局规则（Session 管理、Context 管理、工作节奏、沟通风格）—— 这是 user 层的标准用法。`/Volumes/tyj/Cyrus/CLAUDE.md` 写的是项目专属（身份、目录、规则加载）—— project root 层的标准用法。

## 自检 3 题

**Q1**: 你想让所有项目都用中文回答。规则放哪里最合适？
- A. 每个项目的 root CLAUDE.md
- B. `~/.claude/CLAUDE.md`（user 层）
- C. 项目子目录的 CLAUDE.md
- D. system prompt 手动注入

<details>
<summary>答案</summary>
**B**。跨项目通用 = user 层。每个项目重复写是重复劳动且不一致。
</details>

---

**Q2**: 一个团队的项目 CLAUDE.md 里写了 OpenAI API key（"用这个 key 调 GPT 做对比"）。最大问题？
- A. 影响 Claude 性能
- B. CLAUDE.md 会进 git → secret 泄露给所有团队成员和未来 contributor
- C. 占用 token
- D. 没问题

<details>
<summary>答案</summary>
**B**。Project root CLAUDE.md = 公开。Secret 必须用 .env 或外部 secret manager。
</details>

---

**Q3**: 你 `~/.claude/CLAUDE.md` 写"用 worktree 做并行任务"，但项目 CLAUDE.md 写"禁用 worktree（CI 不支持）"。Claude 在这个项目里会？
- A. 按 user 层优先用 worktree
- B. 按更靠近当前目录的层级 = project 层，禁用 worktree
- C. 报错
- D. 随机选

<details>
<summary>答案</summary>
**B**。层叠加载，靠近当前目录的优先级高。Project 规则覆盖 user 规则。
</details>

## 一句话总结

> **CLAUDE.md 三层：User 全局个人 / Project root 团队共享（进 git）/ Subdirectory 局部规则。靠近当前目录的优先。Secret 永不进 CLAUDE.md。**

---

下一节：[4.4 - Hooks 与 Subagents](./04-hooks-subagents.md)
