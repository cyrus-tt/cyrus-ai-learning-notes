# Domain 4.4 — Hooks 与 Subagents

> Hooks 是 Claude Code 的"硬规则执行层"，Subagents 是"独立任务委派"。这俩是 Domain 4 的进阶重点。

## Part 1：Hooks

### 核心概念

**Hooks = 在特定时机自动执行的脚本**。

Claude 不是自己决定"现在该跑啥"—— hook 是 harness（CLI 框架）执行的，**模型绕不过**。

### 四种 Hook 时机

| Hook | 触发时机 | 用途 |
|------|---------|------|
| `PreToolUse` | 工具调用**前** | **阻止/审批**特定工具调用 |
| `PostToolUse` | 工具调用**后** | 副作用（日志、通知、清理） |
| `UserPromptSubmit` | 用户每次输入后 | 注入上下文、做检查 |
| `SessionStart` | Session 启动时 | 加载额外资源、初始化环境 |

### PreToolUse 的真正威力

这是**唯一能阻止 Claude 执行某些操作**的机制。

例子：阻止 `rm -rf`
```json
{
  "PreToolUse": [
    {
      "match": {"tool": "Bash"},
      "command": "if echo \"$CLAUDE_TOOL_INPUT\" | grep -q 'rm -rf /'; then echo 'BLOCKED: dangerous command'; exit 1; fi"
    }
  ]
}
```

Hook 返回非零 → 工具调用被阻止 → 模型收到 hook 的错误信息 → 模型知道要换方式。

### Hooks 在哪配置

`~/.claude/settings.json`（user 层）或 `<project>/.claude/settings.json`（project 层）。

```json
{
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...],
    "UserPromptSubmit": [...],
    "SessionStart": [...]
  }
}
```

### 为什么 Hooks 比 Prompt 更可靠

| Prompt 规则 | Hook |
|-----------|------|
| "NEVER use rm -rf" 在 CLAUDE.md | hook 在 PreToolUse 拦截 |
| 模型可能被绕过、注入、忘记 | 模型无法绕过，由 harness 强制 |

**这就是 Domain 1-3 反复强调的**：硬约束放代码，不放 prompt。**Hooks 就是 Claude Code 里的"代码层硬约束"**。

### Hooks 的常见用途

1. **阻止危险操作**：rm、sudo、prod 环境写入
2. **自动验证**：每次 edit 后跑 lint
3. **强制流程**：commit 前必须跑 test
4. **注入上下文**：session start 时加载特定文件
5. **审计日志**：所有 tool call 记录到日志

## Part 2：Subagents

### 核心概念

**Subagent = 派一个独立 Claude 实例去做子任务**，结果汇总回主 session。

**关键特性**：
- 独立 context（不继承父 session 的对话历史）
- 独立工具集（可限制）
- 完成后返回结果给父 session

### 什么时候用 Subagent

✅ 适合：
- **大量探索**：扫 30 个文件找特定模式（不污染主 session 的 context）
- **独立子任务**：可以并行的多个子任务
- **专家任务**：用专门 agent 类型（code-reviewer、debugger）
- **保护主对话**：探索结果太多，只把结论带回来

❌ 不适合：
- 简单任务（直接做更快）
- 需要主 session 上下文的任务（subagent 不继承上下文）
- 单文件小修复

### Subagent 不继承父对话

**这是考试经典考点**。

你在父 session 里讨论了"用 React，不用 Vue" → 派一个 subagent 让它"写个组件"。

**Subagent 完全不知道你刚才的讨论**。它看不到父对话历史。

**怎么办**：
- 把关键决策**显式写进 subagent 的 prompt**
- 不要假设 subagent 能"看见"主对话

### 父 session 必须有委派权限

派 subagent 需要工具：`Task` 或 `Agent`。
父 session 的 `allowedTools` 必须包含 Task tool。否则委派失败。

### Subagent 工具限制

可以给 subagent 配置工具白名单：

```
派一个 explorer subagent：
  允许：Grep, Glob, Read
  禁用：Edit, Write, Bash
→ 探索 agent 只读，不会改文件
```

这是 **principle of least privilege**（最小权限原则）的实践。

### Subagent 类型

Claude Code 提供 built-in agent types：
- `Explore`：read-only 搜索代码
- `Plan`：设计实施方案
- `code-reviewer`：代码评审
- `general-purpose`：catch-all

你也可以自定义 agent types。

### 并行 Subagent

**重要**：多个独立 subagent 可以并行运行。

```python
# 串行
result_a = explore_module_a()  # 5min
result_b = explore_module_b()  # 5min
# 总共 10min

# 并行
results = parallel([
    explore_module_a,
    explore_module_b,
])  # 5min（同时跑）
```

**适用场景**：
- 扫多个独立模块
- 评审多个文件
- 跨多个仓库搜索

## Hooks vs Subagents

| 概念 | 用途 |
|------|------|
| **Hooks** | 强制行为门禁（每次 tool call 都过） |
| **Subagents** | 任务委派（特定时机派出去） |

它们正交：你可以同时用。

## 考试常见陷阱

### 陷阱 1：用 prompt 代替 hook 做硬约束
"不要执行 rm -rf"在 prompt → 不可靠。
用 PreToolUse hook → 可靠。

### 陷阱 2：以为 subagent 能看到父 session
**不能**。必须显式传 context。

### 陷阱 3：subagent 任务太小
派 subagent 有开销（新 context、新 prompt）。**小任务直接做**。

### 陷阱 4：subagent 返回 10 万字
父 session 还是会爆 context。**让 subagent 返回摘要 + 关键 ID**。

### 陷阱 5：所有 subagent 串行跑
独立任务并行 → 时间砍半。

## 你的日常经验印证

你 CLAUDE.md 里："探索代码用 subagent，不要在主 session 里大量读文件" —— 主 session 只收结论。这就是 subagent 的正确使用。

`/btw` 是另一种"轻量隔离"，不用启动新 subagent。

## 自检 3 题

**Q1**: 一个团队想强制"所有 rm 命令需要人工确认"。最可靠的实现？
- A. 在 CLAUDE.md 写 "NEVER use rm without confirmation"
- B. 配 PreToolUse hook 拦截 Bash 中的 rm，强制确认
- C. 修改 system prompt
- D. 让团队成员自觉

<details>
<summary>答案</summary>
**B**。Hook 是硬约束，prompt 是软引导。这是核心心法。
</details>

---

**Q2**: 你派一个 subagent 写 React 组件，主 session 里之前讨论了"用 TypeScript、用 styled-components"。Subagent 写出来用了 JS + CSS modules。最可能原因？
- A. Subagent 出 bug
- B. Subagent 不继承父对话上下文，你没把决策写进它的 prompt
- C. Subagent 不会写 TypeScript
- D. CLAUDE.md 没说要 TypeScript

<details>
<summary>答案</summary>
**B**。Subagent 上下文隔离是必考点。委派 prompt 必须自包含。
</details>

---

**Q3**: 你要扫描 4 个独立模块查找特定 pattern。最优执行方式？
- A. 主 session 自己逐个扫
- B. 派 4 个 subagent 并行扫，各自返回摘要
- C. 派 1 个 subagent 串行扫 4 个模块
- D. 求用户手动扫

<details>
<summary>答案</summary>
**B**。独立任务并行是 Domain 5 的核心模式之一。这里也考。
</details>

## 一句话总结

> **Hooks = harness 强制门禁，唯一可靠的硬约束。Subagents = 独立 context 任务委派，不继承父对话，需显式传 context，独立任务并行最优。**

---

[← Domain 4 目录](./README.md) · 下一 Domain：[Domain 5 - Agentic 架构](../domain-5-agentic/01-agent-loop-patterns.md)
