# Domain 4.2 — Session 管理（continue / resume / fork）

> Claude Code 的 session 有四种操作方式。**选错可能让你丢失上下文或意外修改老对话**。考试很爱考。

## 四种 session 操作

| 操作 | 命令 / Flag | 行为 | 适用场景 |
|------|-----------|------|---------|
| **新 session** | `claude` | 创建全新对话 | 新任务，不需要旧上下文 |
| **Continue** | `claude --continue` | 接最近一次 session | 中断后继续 |
| **Resume** | `claude --resume` | 选一个具体 session 恢复 | 重启项目、找特定历史 |
| **Fork** | `claude --fork-session` | 复制一个 session 后再操作 | 平行实验、不污染原对话 |

外加 `--session-id <uuid>` 指定具体 session ID 直接加载。

## 详细对比

### 1. `claude --continue`

- 自动找**最近一次** session（按时间）
- 直接进入，不询问
- **风险**：可能不是你想要的那个

### 2. `claude --resume`

- 弹出**选择器**列出所有历史 session
- 你手动选一个
- 适合"我要找上周那个 session"

### 3. `claude --fork-session`

- 选一个 session 作为起点
- **复制一份**，新 session 有独立 ID
- 后续操作在副本上做，**原 session 不变**

### 4. `--session-id <UUID>`

- 直接加载指定 ID 的 session
- 适合自动化脚本

## Fork vs Continue 的关键区别

```
原 session A → 加几条消息 → 仍然是 A（continue）

原 session A → fork → 创建 session A'
              A 不变，A' 是副本，后续操作在 A' 上
```

**Fork 的核心价值**：**实验不污染原对话**。

例子：
- 原 session 已经讨论好了架构方案
- 你想试一个变体方案，但不想丢失原方案讨论
- → Fork，在新分支讨论变体
- 喜欢哪个用哪个

## 危险操作识别

### 危险 1：以为 resume 是干净的
你 resume 一个老 session，但忘了它里面已经做过的修改。继续操作可能基于过期假设。

**做法**：resume 后先 `git status` + 让 Claude 总结当前状态。

### 危险 2：以为 continue 是上次那个 session
**最近**未必是**你想的那个**。如果中间打开过其他项目，可能 continue 到错的会话。

**做法**：不确定时用 resume 手选。

### 危险 3：在长 session 里做新任务
一个 session 跑了 200 轮，再加新任务 → context 已经被旧内容污染，性能下降。

**做法**：新任务起新 session，不要无脑 continue。

### 危险 4：忘了 fork，多人在同一 session 上写代码
Fork 是隔离实验。但如果你忘了 fork，所有人改的是同一个 session 历史，难以追溯。

## 你的 CLAUDE.md 规则印证

你 `~/.claude/CLAUDE.md` 里写：
> 不同任务之间不要 resume，直接新开 session。CLAUDE.md + Memory 会自动加载，不需要靠 session 历史。

这就是 session 管理的最佳实践。Memory 系统让"上下文加载"和"session 历史"解耦。

## 其他 session 相关知识点

### Session 存储位置
`~/.claude/projects/<project-name>/sessions/<uuid>/` —— 每个 session 是一个目录，含 transcript。

### Session 清理
长时间不用的 session 可以删（不影响当前工作）。但删除前确认没有 fork 依赖它。

### Session 和 git
Session 历史**不进 git**。它是本地的对话记录，不是项目代码的一部分。

## 考试常见陷阱

### 陷阱 1：以为 `--continue` 总是接到正确的 session
"最近"按时间排，可能不是你期望的。

### 陷阱 2：把 fork 当 continue 用
Fork 复制后再操作。如果你想直接接着做，用 continue 或 resume。

### 陷阱 3：把所有任务都塞一个 session
Context 污染。新任务该开新 session。

### 陷阱 4：依赖 session 持久化关键决策
Session 是对话记录，**不是知识库**。关键决策应该写入 CLAUDE.md 或文档。

## 用你的日常经验类比

你 `/btw` 用于无关临时问题，就是为了不污染主对话 —— 这是"在同一个 session 里隔离话题"的轻量方案。Fork 是更彻底的隔离。

## 自检 3 题

**Q1**: 你想试一个新方案，但不想丢失原 session 的讨论历史。最合适的操作？
- A. `claude --continue`，继续在原 session 加新讨论
- B. `claude --fork-session`，复制一份在副本上实验
- C. `claude`，新起一个空 session
- D. 手动复制粘贴对话历史到新文件

<details>
<summary>答案</summary>
**B**。Fork 是平行实验的标准做法，原 session 不被污染。
</details>

---

**Q2**: 一个开发者用 `--continue` 进入了"最近 session"，但发现里面的话题完全不对。最可能原因？
- A. Claude Code 出 bug
- B. "最近"按时间排序，可能是用户在中间打开过其他项目的 session。应该用 `--resume` 手动选
- C. Session 损坏了
- D. 用户没权限

<details>
<summary>答案</summary>
**B**。`--continue` 找最近时间的 session，不分项目/话题。这是经典坑。
</details>

---

**Q3**: 关于"在长 session 里持续做新任务"的影响，最准确的判断？
- A. 没问题，session 越长 Claude 越懂你
- B. Context 累积污染，新任务受旧内容干扰，注意力衰减。新任务建议新开 session
- C. 只影响速度，不影响质量
- D. 完全没影响

<details>
<summary>答案</summary>
**B**。Context 管理原则：一个 session 一个任务。这也是你 CLAUDE.md 里的规则。
</details>

## 一句话总结

> **Session 四操作：新建 / continue 最近 / resume 选历史 / fork 平行实验。一个 session 一个任务，新任务开新 session。**

---

下一节：[4.3 - CLAUDE.md 层级与 Memory](./03-claude-md-memory.md)
