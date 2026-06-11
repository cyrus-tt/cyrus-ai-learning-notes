# Domain 5.2 — Subagent 委派的核心原则

> 委派 subagent 是 agentic 架构的核心动作。**选错时机或写错委派 prompt = 时间浪费 + 上下文混乱**。

## 核心概念

委派 subagent 的本质是：
- **隔离**子任务的 context
- **限制**子任务的工具范围
- **结构化**返回结果到主 agent

**关键原则**：
> **委派要有明确收益。如果主 agent 自己做更快，就别委派。**

## 什么时候委派

### 信号 1：探索量大
任务："找出代码库里所有 deprecated API 调用"
- 主 session 直接做 → 读 30 个文件，context 爆炸
- 派 subagent → subagent 自己读，主 session 只收摘要

### 信号 2：可以并行
任务："分析这 10 个 PR"
- 主 session 串行 → 10x 时间
- 10 个 subagent 并行 → 1x 时间（如果 I/O bound）

### 信号 3：需要专门 agent
任务："做一次安全评审"
- 用 `security-reviewer` agent type
- 它有专门的 prompt 和工具配置

### 信号 4：清晰边界 + 结构化输出
任务："给这个函数写 unit test"
- 输入清晰、输出格式明确
- 主 session 拿到测试代码即可

## 什么时候**不**委派

### 反信号 1：主 session 有关键 context，传不过去
任务在主 session 已经讨论了很多上下文（设计决策、约束、用户偏好）。
- 委派要把所有 context 重传 → 浪费
- 主 session 直接做 → 利用已有上下文

### 反信号 2：任务太小
"读一下这个文件" → 主 session 直接 read 就行。
派 subagent 启动开销 + prompt 构造 > 收益。

### 反信号 3：需要多轮交互
任务："和用户讨论方案"
Subagent 完成后就结束，不适合多轮对话场景。

### 反信号 4：任务依赖关系强
任务 B 必须等任务 A 完成才能开始 → 并行无意义，委派也无意义。

## 委派 Prompt 的关键

### 必须自包含

Subagent **看不到父对话**。父 agent 必须把所有需要的事实写进委派 prompt：

❌ 不好的委派 prompt：
```
基于我们的讨论，给这个组件写测试。
```
Subagent："什么讨论？什么组件？"

✅ 好的委派 prompt：
```
目标：给 src/components/UserCard.tsx 写 unit test。

上下文：
- 项目使用 Jest + React Testing Library
- 测试约定：测文件放 __tests__/，命名 *.test.tsx
- 这个组件接受 user prop，渲染头像和姓名

已有的测试参考：src/components/__tests__/Button.test.tsx

输出：
- 完整的 UserCard.test.tsx 文件
- 至少覆盖：渲染、props 缺失、点击事件三种场景
```

### 限制工具范围

给 subagent **最小必要工具**：

```
explorer subagent → 只给 Grep, Glob, Read
test-writer subagent → 给 Read, Write, Bash(npm test)
deployer subagent → 给 Bash(deploy commands), 不给 Edit
```

**好处**：
- 防止 scope creep（agent 跑偏）
- 减少错误可能
- 提升专注度

### 结构化输出要求

委派 prompt 要明确："**返回什么格式**"。

❌ 不好：
```
分析这些代码并报告。
```

✅ 好：
```
返回 JSON：
{
  "files_analyzed": int,
  "issues": [
    {"file": str, "line": int, "severity": "high|med|low", "issue": str}
  ],
  "summary": str (max 200 字)
}
```

主 agent 拿到结构化结果，能直接处理或汇总。

## 父 Agent 必须有 Task 工具

委派 = 调用 `Task` 或 `Agent` tool。

如果父 agent 的 `allowedTools` 不包含 Task → 无法委派。

## Subagent 不会"接着做"

**Subagent 完成一次就结束**。
- 不能像主 session 那样多轮对话
- 想让它再做事 → 需要再派一次

如果你想"让 subagent 做一系列连续任务"，要么：
- 在一次委派 prompt 里写完所有步骤
- 或换 orchestrator-workers 模式（主 agent 多次调用 worker）

## 委派的开销

每次委派的开销：
- 父 agent 写 prompt 的成本
- Subagent 加载 context、启动
- Subagent 自己跑（工具调用、模型推理）
- 结果传回父 agent

**评估**：如果你估算"主 session 直接做"用时 < "委派+返回" 的开销 → 直接做。

## 常见反模式

### 反模式 1："让 subagent 帮我决定要不要做 X"
父 agent 自己有 context，应该自己决定，不该派 subagent 帮思考。
**正解**：父 agent 决策，subagent 执行。

### 反模式 2：派 subagent 然后立刻派另一个 subagent，串行
如果两个任务独立 → 并行（同一消息派两个）。
串行只有依赖时才合理。

### 反模式 3：subagent 任务过大
"重构整个项目" 派给一个 subagent → 它跑半小时还没回。
**正解**：拆成小块，每个 subagent 负责一块。

### 反模式 4：subagent 返回全文 dump
返回 50KB 代码 → 父 agent context 爆。
**正解**：subagent 返回摘要 + 关键 ID/路径，父 agent 按需读细节。

### 反模式 5：委派 prompt 太短
"帮我看看代码有没有问题" → subagent 不知道看什么、怎么判断、返回啥。
**正解**：自包含详细 prompt（见上文示例）。

## 用你的日常经验类比

你 `CLAUDE.md` 写："调查类指令默认派 subagent" —— 这就是 explore-heavy 任务的委派原则。你常用 `Explore` agent type，给的 prompt 也是带 query + breadth 参数 —— 这是结构化委派的实践。

## 自检 3 题

**Q1**: 一个父 agent 在长对话中讨论了项目架构决定，现在要"写一个新模块"。最合适的做法？
- A. 直接派 subagent，让它自己探索
- B. 委派 prompt 里详细写入相关架构决定（subagent 看不到父对话），再派
- C. 让 subagent 读父对话历史
- D. 自己做不委派

<details>
<summary>答案</summary>
**B**。Subagent 上下文隔离，必须显式传上下文。D 也可能对（如果任务小），但题目说"写新模块"，规模足够委派。
</details>

---

**Q2**: 你要扫描 20 个独立服务的日志，分别检查异常。最优执行方式？
- A. 派 20 个 subagent 并行，每个负责一个服务
- B. 派 1 个 subagent 串行扫 20 个
- C. 父 agent 自己串行扫
- D. 用 prompt chaining

<details>
<summary>答案</summary>
**A**。独立任务 + I/O bound = 并行 subagent 标准场景。
</details>

---

**Q3**: 一个 subagent 完成任务后，父 agent 想让它"再做一个相关任务"。最合理做法？
- A. 给原 subagent 发新指令
- B. Subagent 完成一次就结束，需要再次委派（新一次 Task 调用）
- C. 把任务都塞第一次 prompt
- D. 用 fork-session

<details>
<summary>答案</summary>
**B**。Subagent 是一次性的。这是设计上的事实，考试常考。
</details>

## 一句话总结

> **委派要有收益。Subagent 不继承父对话、不能多轮、用完即止。Prompt 必须自包含，工具用最小集，返回要结构化摘要不是 dump。**

---

下一节：[5.3 - 并行编排与汇总](./03-parallel-orchestration.md)
