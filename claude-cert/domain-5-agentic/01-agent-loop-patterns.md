# Domain 5.1 — Agent Loop 与五种 Agentic 模式

> Agentic 是考试最大权重（27%）。这一节先建立 mental model：**agent 是什么、有哪几种模式、怎么选**。

## 核心概念

**Agent loop**（智能体循环）：

```
observe → reason → act → observe → ...
```

1. **Observe**：看到输入（用户消息、工具结果、环境状态）
2. **Reason**：思考下一步
3. **Act**：执行（调工具、回复、调 subagent）
4. **Observe again**：看动作的结果
5. **循环**直到任务完成

**所有 agent 都是这个循环**。差别在于：
- 谁来 reason（一个模型 / 多个 / 编排器）
- 怎么分解任务（一次性 / 多阶段 / 动态）
- 信息怎么流动（线性 / 分发 / 汇总）

## 五种 Agentic 模式

| 模式 | 中文 | 适用场景 |
|------|------|---------|
| **Prompt Chaining** | 提示链 | 固定步骤的线性工作流 |
| **Routing** | 路由分发 | 分类后转向专门处理器 |
| **Orchestrator-Workers** | 编排器-工作者 | 中心化分发，子任务可变 |
| **Dynamic Decomposition** | 动态分解 | 发现驱动的探索任务 |
| **Parallel Subagents** | 并行子智能体 | 独立任务并行加速 |

### 1. Prompt Chaining（提示链）

**结构**：步骤固定，输出 → 输入 → 输出。

```
代码评审任务：
  step1: 风格检查 → 输出 issues
  step2: 安全扫描（输入 step1） → 输出 issues
  step3: 生成文档（输入 step1+2） → 输出 doc
```

**特点**：
- 步骤 hard-coded
- 简单可控
- 失败处可重试

**适用**：固定流程（数据 pipeline、报告生成）。

### 2. Routing（路由分发）

**结构**：先分类，再转给专门处理器。

```
用户消息
  ↓
classify intent → 'refund' / 'tech_support' / 'sales'
  ↓
分别给 refund_agent / tech_agent / sales_agent
```

**特点**：
- 不同类别走不同 prompt + 不同工具子集
- 解耦专家系统

**适用**：客服 agent、文档分类。

### 3. Orchestrator-Workers（编排器-工作者）

**结构**：一个中心 agent 决定**派谁做什么**，worker 完成后汇报。

```
Orchestrator: "我需要分析这份报告"
  → 派 Worker A 提取数据
  → 派 Worker B 做图表
  → 派 Worker C 写摘要
  → 整合所有结果
```

**特点**：
- 子任务**由 orchestrator 决定**，不是 hard-coded
- worker 可以是固定工具或独立 subagent

**适用**：复杂复合任务（研究报告、跨系统集成）。

### 4. Dynamic Decomposition（动态分解）

**结构**：每步的下一步**由当前发现决定**。

```
"调试这个 bug"
  → 看 error log → 发现是数据库问题
  → 检查 schema → 发现迁移没跑
  → 查迁移历史 → 发现是分支冲突
  → ...
```

**特点**：
- 步骤**不可预先规划**
- 类似人类侦探破案

**适用**：debug、root cause analysis、研究调查。

### 5. Parallel Subagents（并行子智能体）

**结构**：多个独立 agent **同时**跑，结果汇总。

```
"分析 30 个仓库的 README"
  → 派 30 个 subagent，每个分析一个
  → 同时执行
  → 汇总结果
```

**特点**：
- 任务**独立**（无依赖）
- I/O bound 时收益最大
- 节省壁钟时间

**适用**：大规模独立任务（批量分析、多源调研）。

## 关键判断：什么时候**不**用 agentic

### 不要 agentic 的场景

1. **简单事实查询**：直接答就好，不需要多步推理
2. **任务很小**：派 agent 的开销 > 收益
3. **流程完全固定**：传统脚本就够
4. **不需要决策**：硬编码 if-else 更可靠

**核心原则**：
> **Agentic 适合需要"判断 + 行动"的任务。纯计算或纯查询不需要 agent。**

### 不要委派的场景

即使是 agentic，也未必要派 subagent：

1. **当前 session 有完整上下文**，委派要重传上下文，得不偿失
2. **任务非常小**，subagent 启动 + 返回开销大于直接做
3. **频繁交互**，跨 agent 边界会损失信息

## 模式选择决策树

```
任务能预先规划吗？
├─ 能，步骤固定 → Prompt Chaining
├─ 能，先分类再处理 → Routing
└─ 不能完全规划
    ├─ 中心调度子任务 → Orchestrator-Workers
    ├─ 步骤随发现而定 → Dynamic Decomposition
    └─ 大量独立任务并行 → Parallel Subagents
```

## 用你的日常经验类比

- 你 Claude Code 的工作流：用户提需求 → Claude reason → 调 grep/edit → observe → continue。这就是 agent loop。
- 大改动用 Plan mode → orchestrator-workers 的思想（先 plan 再分配执行）
- 派 explore 子任务 → parallel subagents
- 你的 `oransim`、`opc` 项目里多 agent 协作 → mixed pattern

## 自检 3 题

**Q1**: 一个"扫描公司 50 个内部仓库找出有 SQL 注入风险的代码"的任务。最合适的 agentic 模式？
- A. Prompt chaining
- B. Routing
- C. Parallel subagents（每个 subagent 扫一个仓库）
- D. Dynamic decomposition

<details>
<summary>答案</summary>
**C**。50 个仓库 = 独立任务，并行扫节省壁钟时间。每个 subagent 返回风险摘要给主 agent 汇总。
</details>

---

**Q2**: 一个 debug 任务，错误日志只给了"Error: undefined behavior at line 42"。最合适的模式？
- A. Prompt chaining（固定步骤）
- B. Routing（先分类）
- C. Orchestrator-workers
- D. Dynamic decomposition（每步根据发现决定下一步）

<details>
<summary>答案</summary>
**D**。Debug 是典型发现驱动的探索任务，无法预先规划完整步骤。
</details>

---

**Q3**: 一个"用户问技术问题 → 回答技术问题 / 用户问价格 → 转销售"的客服 agent。最合适的模式？
- A. Routing：先分类意图，再转专门 agent
- B. 一个大 agent 啥都答
- C. Parallel subagents
- D. Dynamic decomposition

<details>
<summary>答案</summary>
**A**。意图分类 + 专家分发 = routing 的标准场景。每个 agent 有专门 prompt + 工具子集。
</details>

## 一句话总结

> **五种 agentic 模式：Chaining 固定线性 / Routing 分类分发 / Orchestrator 中心调度 / Dynamic 发现驱动 / Parallel 独立并行。先判断"任务能预先规划吗"再选模式。**

---

下一节：[5.2 - Subagent 委派的核心原则](./02-subagent-delegation.md)
