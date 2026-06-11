# Domain 5.4 — Research / Synthesis 模式与 Provenance

> 多 agent 调研类任务（研究报告、文献综述、竞品分析）是考试重点场景。**核心难点：保留来源、避免幻觉、综合输出**。

## 核心概念

**Research/Synthesis 工作流**：

```
1. Plan：父 agent 拆分调研维度
2. Fan-out：派多个 worker 调研不同维度
3. Collect：每个 worker 返回 claims + sources
4. Synthesize：父 agent 综合，写报告，保留出处
```

**关键挑战**：
- 信息散落 → 综合时遗漏
- 来源丢失 → 报告不可审计
- 模型幻觉 → 编造事实
- 冲突信息 → 不知道信谁

## Provenance（出处）的重要性

**Provenance = 每条信息的来源**。

在 research 任务里，**每条事实必须能追溯到原始来源**：

```json
{
  "claim": "OpenAI 在 2026 年 3 月推出 GPT-5",
  "source": {
    "type": "official_blog",
    "url": "https://openai.com/blog/gpt-5",
    "date": "2026-03-15",
    "quote": "Today we're announcing GPT-5..."
  },
  "confidence": "high",
  "uncertainty_notes": null
}
```

**为什么必须有 provenance**：
1. **审计**：用户能验证报告每条信息
2. **去幻觉**：模型必须给出处 → 难以编造
3. **冲突解决**：多个来源说法不一时，能比较
4. **更新**：新信息出现时知道哪条要改

## Synthesis 的几种结构

### 1. Claim-Source Index（事实-来源索引）

每个 worker 返回结构：
```json
{
  "claims": [
    {"id": "c1", "text": "...", "sources": ["s1"]},
    {"id": "c2", "text": "...", "sources": ["s1", "s3"]}
  ],
  "sources": [
    {"id": "s1", "url": "...", "date": "...", "quote": "..."},
    {"id": "s3", "url": "...", "date": "...", "quote": "..."}
  ]
}
```

父 agent 综合时，每个论点都能引用具体 source ID。

### 2. Status 标注

每个 claim 标注**状态**：

| Status | 含义 |
|--------|------|
| `established` | 多来源确认 |
| `contested` | 来源说法不一 |
| `insufficient` | 信息不足，需要更多调研 |
| `outdated` | 信息可能过期 |

让父 agent 综合时能区分"确凿"和"待证"。

### 3. Uncertainty Language（不确定性表达）

避免模型用绝对句式包装不确定信息：

❌ 不好：`"GPT-5 的参数量是 10 万亿"`（来自一个非官方推测）
✅ 好：`"GPT-5 参数量未公开。根据 [来源 X] 的推测可能在 10 万亿数量级，但 OpenAI 未确认。"`

## 不要做的事

### 反模式 1：让 subagent 直接传 100K 字给父 agent
父 agent context 爆。
**正解**：subagent 返回结构化摘要（claims + sources），原文写到文件，父 agent 按需引用。

### 反模式 2：综合时丢掉 source
父 agent 写报告，把每条 source 丢了 → 不可审计。
**正解**：保持 claim-source 映射到最终输出。

### 反模式 3：让模型"自由发挥"做综合
开放式 prompt → 模型可能编造、夸大、漏掉。
**正解**：综合 prompt 用模板，要求逐条引用 source。

### 反模式 4：忽略冲突信息
多个 subagent 给出矛盾信息 → 父 agent 选一个无脑用。
**正解**：明确标 `contested`，列出双方观点，让用户判断。

### 反模式 5：不区分 source 时间
某条信息来自 2020 年文章 vs 2026 年最新 release → 时效性差异大。
**正解**：source 必须有日期，过时的标 `outdated`。

## 一个典型 workflow

**任务**："调研 5 个 AI 公司 2026 年的最新产品策略"。

### Step 1：父 agent Plan
```
拆 5 个调研维度：OpenAI, Anthropic, Google, Meta, DeepSeek
每个维度找：最新产品、定价、目标用户、与去年策略变化
```

### Step 2：Fan-out 派 5 个 subagent
每个 subagent prompt 模板：
```
调研 {company} 的 2026 年产品策略。

要求：
1. 找 3-5 个一手来源（官方博客、新闻稿、CEO 访谈）
2. 每个事实必须有 source（URL + 日期 + quote）
3. 标记每条 claim 的 status（established/contested/insufficient）
4. 注意：避免基于 2025 年信息推测 2026

返回 JSON {schema}
```

### Step 3：Collect & Synthesize
父 agent 拿到 5 份结构化报告 → 综合：
- 跨公司对比表
- 共同趋势 / 分歧点
- 标注 `contested` 项让用户判断
- 全文引用 source

## 当 worker 返回不够好

### Worker 报告"insufficient"
→ 父 agent 派新 subagent 深挖该维度，或换不同搜索关键词

### 多个 worker 给冲突答案
→ 父 agent 明确标 contested，可能再派一个 worker 找仲裁性来源（如官方）

### Worker 编造 source
→ 父 agent 应该有抽样验证机制：随机挑几条 claim，让另一个 agent 独立验证 source 是否真实

## 用你的日常经验类比

你 `aihot` skill 拉 AI 资讯就是 research 任务。设计上是：拉数据 → 整理 → 中文 markdown 简报。每条信息有 source（原网址、发布时间），不让模型乱编 —— 这就是 provenance 实践。

## 自检 3 题

**Q1**: 一个 research 工作流，5 个 subagent 调研竞品。父 agent 综合时发现两个 subagent 给的"用户数据"完全冲突。最合理处理？
- A. 选数字更大的那个（更显著）
- B. 选最新发布的来源那个
- C. 明确标记为 `contested`，列出两个观点和各自来源，让用户判断
- D. 取平均

<details>
<summary>答案</summary>
**C**。冲突信息不能"自动消解"。明确标注 contested 是研究伦理也是产品诚实性的体现。
</details>

---

**Q2**: 一个调研 agent 返回 50KB 原文摘录 + 100 条 claim。父 agent context 接近上限。最优重构？
- A. 切换更大 context 模型
- B. 让 subagent 改为返回结构化 claims（带 source ID）+ 200 字摘要；原文写文件，父 agent 按需读
- C. 截断 subagent 输出
- D. 不汇总，让用户自己看

<details>
<summary>答案</summary>
**B**。Subagent 的返回是 context 杀手，必须结构化摘要 + 详情外置。
</details>

---

**Q3**: 关于 provenance（出处）的重要性，最准确的判断？
- A. 只在学术论文需要
- B. 让报告可审计、防幻觉、支持冲突解决和更新。所有 research 任务都应有
- C. 增加 token 成本，能省则省
- D. 只在用户要求时才加

<details>
<summary>答案</summary>
**B**。Provenance 是 research agent 的基础，不是可选项。
</details>

## 一句话总结

> **Research = Plan → Fan-out → Collect (claims+sources) → Synthesize (保留出处)。Provenance 是基础，冲突明确标 contested，subagent 返回结构化摘要不是原文 dump。**

---

下一节：[5.5 - 客服 / 工作流 Agent 设计](./05-customer-service-workflow.md)
