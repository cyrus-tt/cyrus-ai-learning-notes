# Domain 5.3 — 并行编排与结果汇总

> 并行 subagent 是 agentic 架构里**最常考的优化模式**。但用错地方反而拖累性能。

## 核心概念

**并行编排** = 多个独立 subagent 同时跑，结果汇总。

**收益场景**：
- 任务 I/O bound（等网络、等磁盘）→ 并行能砍掉等待
- 任务独立（无相互依赖）
- 任务足够大（开销 < 收益）

**反场景**：
- 任务有强依赖（B 要等 A 输出）
- 任务太小（启动开销 > 任务本身）
- CPU bound（机器只有一颗核心也跑不快）

## 何时并行收益最大

### 收益分析

| 串行时间 | 并行时间 | 收益 |
|---------|---------|------|
| 任务 10s，10 个串行 = 100s | 10 个并行 = 12s（含开销） | 8x |
| 任务 0.5s，10 个串行 = 5s | 10 个并行 = 4s（开销大） | 1.25x |
| 任务 60s，10 个串行 = 600s | 10 个并行 = 65s | 9x |

**规则**：单个任务越大、独立性越强、I/O 越多 → 并行收益越大。

## 并行模式的几种形态

### 1. Map-Reduce

经典并行模式：
```
Map：派 N 个 subagent 分别处理 N 个独立单位
Reduce：父 agent 汇总所有结果
```

例子：
- "分析 50 个客户反馈" → 50 个 subagent 分别情感分析 → 父 agent 汇总分布

### 2. Fan-out + Synthesis（扇出+综合）

类似 map-reduce 但 reduce 阶段是**理解+综合**而不是简单汇总。

```
Fan-out：派多个 subagent 从不同角度调研
Synthesis：父 agent 读所有报告，写综合分析
```

例子：
- "调研 5 个竞品的策略" → 5 个 subagent 各调一个 → 父 agent 写对比报告

### 3. Parallel Workers under Orchestrator

Orchestrator 决定派多少 worker、派给谁，可能动态调整。

```
Orchestrator："这个项目要分析架构 + 安全 + 性能"
  → 同时派 architect_agent, security_agent, perf_agent
  → 等三个都回来
  → 综合给用户
```

### 4. Speculative Parallel

不确定哪种方案对 → 同时尝试 → 选最好的。

```
"实现这个功能"
  → 同时派 3 个 agent 用 3 种不同方法实现
  → 比较结果，选最简洁的
```

**适用**：方案有不确定性、可比较结果的场景。

## 关键技术细节

### 1. 一次性派出（同一消息多个 tool call）

Claude API 支持一次响应里有多个 tool calls。同一消息派多个 Task 工具 → 真正并行。

❌ 串行：
```
turn 1: 派 subagent A
turn 2（等 A 完）: 派 subagent B
```

✅ 并行：
```
turn 1: 同时派 A、B、C（一条响应里多个 tool call）
```

### 2. Subagent 返回要结构化

并行汇总的关键：**每个 subagent 返回的结构要一致**，方便父 agent 处理。

```json
{
  "task_id": "analysis-1",
  "status": "success",
  "findings": [...],
  "summary": "...",
  "errors": []
}
```

### 3. 处理部分失败

并行的难点：**有些成功有些失败怎么办**？

策略：
- 父 agent 检查每个结果，记录失败的
- 成功的部分先用
- 失败的部分决定是否重试
- 不要让一个失败拖垮整个任务

```json
父 agent 决策逻辑：
- A: 成功 ✓
- B: 失败（超时）→ 重试
- C: 成功 ✓
- D: 失败（业务规则）→ 不重试，报告用户
```

### 4. 注意 token 成本

10 个并行 subagent = 10 套 prompt + 10 套结果。
**总 token 成本**和串行差不多，但**壁钟时间**砍掉了。

## 不要并行的场景

### 1. 任务有依赖
```
任务 A: 抓取数据
任务 B: 分析 A 抓的数据
任务 C: 基于 B 的结论做决策
```
A → B → C，强依赖，并行无意义。

### 2. 任务太小
每个任务 < 1 秒，开销大于收益。直接顺序做。

### 3. 共享状态
多个 subagent 改同一份文件 → 冲突。

### 4. 输出体积巨大
10 个 subagent 各返回 50KB → 父 agent context 500KB → 炸。
**正解**：subagent 返回摘要，详情写文件，父 agent 按需读。

## 一个真实场景示范

**任务**："对 30 个内部仓库做依赖审计，找出哪些用了已知漏洞的库"。

### 错误做法（串行）
```
for repo in repos:
    audit(repo)  # 每个 10 秒
# 总共 300 秒
```

### 正确做法（并行 + 汇总）
```python
# 父 agent 一次性派 30 个
results = parallel([
    Task(prompt=f"审计仓库 {repo}，返回 JSON {schema}", agent="security-reviewer")
    for repo in repos
])

# 汇总
vulnerabilities = []
for r in results:
    if r["status"] == "success":
        vulnerabilities.extend(r["findings"])
    else:
        log_failure(r)

# 父 agent 处理
report = synthesize(vulnerabilities)
```

时间：~10 秒 + 汇总。

## 用你的日常经验类比

你 `oransim` 项目里多 agent 并发处理订单 —— 就是 fan-out 模式。你用 dispatch-agent + worker agent 也是 orchestrator-workers 的实践。

## 自检 3 题

**Q1**: 一个任务："分析 100 个用户反馈的情感"。最优执行模式？
- A. 父 agent 自己串行分析
- B. 派 1 个 subagent 串行分析 100 个
- C. 派多个 subagent 并行（如分批 10 个 × 10 个 subagent），结果汇总
- D. 用 prompt chaining

<details>
<summary>答案</summary>
**C**。独立任务 + 大批量 = 并行最优。可能需要分批（一次太多 subagent 也有调度开销），但核心是并行。
</details>

---

**Q2**: 一个工作流：抓数据 → 清洗 → 分析 → 出报告。每步依赖前一步。能并行优化吗？
- A. 全部并行
- B. 抓数据和清洗并行
- C. 不能并行，严格串行依赖
- D. 出报告时并行

<details>
<summary>答案</summary>
**C**。强依赖链无法并行。题目假设每步都依赖上一步，那只能串行。
</details>

---

**Q3**: 10 个 subagent 并行后，有 3 个超时失败。父 agent 的最佳策略？
- A. 全部重新跑
- B. 检查每个结果，对失败的（区分类型）决定是否重试，成功的部分先用
- C. 报错放弃
- D. 直接报告用户全部失败

<details>
<summary>答案</summary>
**B**。部分失败是并行的常态。结构化错误 + 分类重试（Domain 3.3 错误处理）是标配。
</details>

## 一句话总结

> **并行收益 = 任务大 × 独立 × I/O bound。同一消息派多个 Task 实现真并行。返回要结构化以便汇总。部分失败按错误类型分类处理。**

---

下一节：[5.4 - Research / Synthesis 模式与 Provenance](./04-research-synthesis.md)
