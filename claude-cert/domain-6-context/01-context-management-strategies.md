# Domain 6.1 — Context 管理的六大策略

> Context 是 agent 的"工作记忆"。怎么管 = 应用质量的天花板。这一节是 Domain 6 的核心。

## 核心概念

**Context = 模型每次请求"能看到"的全部内容**：
- System prompt
- 对话历史
- 工具描述
- 工具结果
- 引用资源（resources）

**Context 管理的本质**：**决定模型每次看到什么，以及怎么压缩历史**。

## 六大策略

| 策略 | 中文 | 适用 |
|------|------|------|
| Sliding Window | 滑动窗口 | 短对话、最近最重要 |
| Progressive Summarization | 渐进式摘要 | 中长对话、保留决策 |
| Structured State | 结构化状态 | 偏好/约束需要精确 |
| Persistent Reference | 持久引用 | 不变信息（手册、字典） |
| Retrieval | 检索 | 大量信息按需取 |
| Tool Result Compression | 工具结果压缩 | 工具返回数据过大 |

**实际生产中通常组合使用**，不是二选一。

## 1. Sliding Window（滑动窗口）

**做法**：只保留最近 N 轮对话，老的丢掉。

```
对话 50 轮 → 只保留最近 10 轮发给模型
```

**适合**：
- 短对话场景
- 最新信息最重要的应用（如聊天机器人）

**不适合**：
- 用户在第 5 轮说了"我对花生过敏"，第 40 轮问"今天午饭吃什么"
- 滑窗丢掉了第 5 轮 → 模型不知道过敏

## 2. Progressive Summarization（渐进式摘要）

**做法**：老的对话压缩成**结构化摘要**，最近几轮保留原文。

```
[Summary of turns 1-40]:
- 用户偏好：简洁回答、技术深度
- 决策：选择 Postgres 而非 MySQL
- 已确认：项目截止 5 月底
- 未决：是否引入 Redis

[Original turns 41-50]
```

**关键点**：
- 摘要不是"flowery prose"，是**结构化数据**（decisions / preferences / facts / open questions）
- 越早期的事压缩比越高

## 3. Structured State（结构化状态）

**做法**：把"用户当前状态"作为一个 JSON 对象放 context。

```json
{
  "user_state": {
    "name": "Cyrus",
    "preferences": {"language": "zh", "tone": "concise"},
    "allergies": ["peanuts"],
    "active_project": "claude-cert-prep"
  }
}
```

**特点**：
- 模型每次都能精准看到当前状态
- 用户改了偏好 → 改 JSON 即可，不需要在对话里翻找

**适合**：偏好、约束、当前任务状态。

## 4. Persistent Reference（持久引用）

**做法**：不变的、必须精确的信息**永远完整保留**。

例子：
- 故事的设定 bible（角色设定不能错）
- 用户的医疗禁忌
- API 规范文档

这些信息**绝对不进 summary**，原文保留。

## 5. Retrieval（按需检索）

**做法**：不预先把全部信息塞 context，模型需要时**主动检索**。

```
用户问："我去年 7 月买的耳机是哪款？"
Agent → search_purchases(user_id, date="2025-07") → 检索具体信息
```

**适合**：
- 大量数据（百万条订单）
- 信息有结构，可按 key 查询

**对比 RAG**：
- 传统 RAG：每次问题都检索，结果塞 context
- 现代实践：让 agent 决定要不要检索、怎么检索

## 6. Tool Result Compression（工具结果压缩）

**做法**：工具返回大数据时，**应用层压缩**再放 context。

```
search_products() 返回 500 条 → 应用层只保留：
{
  "count": 500,
  "top_3": [...],  // 前 3 条详情
  "cursor": "abc"  // 后续翻页
}
```

模型看到精简版，需要更多时再翻页。

## 组合策略：实际生产长啥样

一个生产级 chatbot 的 context 通常是这样：

```
[System Prompt - 静态]

[Persistent Reference]
- 用户医疗禁忌（不变）
- 公司政策手册

[Structured State - 实时]
- 用户当前偏好
- 当前任务进度

[Summary - 渐进式]
- 早期对话的结构化摘要

[Recent Messages - 滑窗]
- 最近 5-10 轮原文

[Tool Results - 压缩后]
- 最近工具调用结果（压缩版）
```

## 关键设计判断

### 何时用 sliding window only
- 短对话场景（< 20 轮）
- 信息时效性高，老的不重要

### 何时引入 summarization
- 对话超过 30-50 轮
- 早期对话有重要决策需要保留

### 何时用 structured state
- 用户偏好/约束需要精确（不能被摘要稀释）
- 偏好可能多次更新（state 比对话历史更方便）

### 何时引入 retrieval
- 信息量大到根本塞不下
- 信息有索引可查

## 不要做的事

### 1. 把工具返回原样保留
500 条搜索结果不压缩 → context 爆炸。
**正解**：压缩后保留。

### 2. 摘要写成自由叙述
"用户聊了一些关于退款的事情，又讨论了价格" → 模型啥也学不到。
**正解**：结构化（decisions, facts, open questions）。

### 3. 滑窗丢掉关键信息
用户在第 3 轮说的过敏信息，第 50 轮丢了。
**正解**：用 structured state 提取关键信息，不被滑窗影响。

### 4. 所有 RAG 结果都保留
检索 50 次，结果全留 → context 爆。
**正解**：用完即压缩，只保留摘要。

### 5. 用 summary 替代 persistent reference
故事设定 bible 进了 summary → 关键细节丢失。
**正解**：persistent reference 不压缩。

## 用你的日常经验类比

你 CLAUDE.md 写"compaction 保护指令"：当 context 压缩时，必须保留：当前任务描述、已修改文件列表、测试命令、未完成的 TODO、关键架构决定。丢弃：已完成的探索过程、已解决的 debug 细节、重复的文件读取内容。

**这就是组合策略的最佳实践**：结构化状态 + 摘要 + 滑窗。

## 自检 3 题

**Q1**: 一个聊天 agent 用户在第 5 轮说"我对花生过敏"，第 60 轮问"今天午饭吃什么"。当前用纯 sliding window 保留最近 10 轮。最优改进？
- A. 扩大滑窗到 60 轮
- B. 用 progressive summarization 把早期对话压缩，提取"过敏=花生"放摘要
- C. 用 structured state，把过敏信息存进 user_state 对象，不依赖滑窗
- D. B 和 C 都对，C 更精准

<details>
<summary>答案</summary>
**D**。Structured state 最适合"关键偏好/约束"，summary 适合"决策和讨论"。两者结合最稳。
</details>

---

**Q2**: 一个搜索工具单次返回 800 条结果，全部塞进 context。下次对话明显变慢且回答跑题。最优重构？
- A. 切换更大 context 模型
- B. 工具返回时只保留前 N 条 + cursor，模型按需翻页（tool result compression）
- C. 用 progressive summarization 压缩对话
- D. 缩短 system prompt

<details>
<summary>答案</summary>
**B**。Tool result compression 是这个场景的精准答案。其他策略治标不治本。
</details>

---

**Q3**: 一个写小说的助手，故事有 30 个角色和详细设定。最合适的 context 策略？
- A. 每次让 agent 复述全部设定（浪费 token）
- B. 把角色设定作为 persistent reference，原文保留，不进 summary
- C. 用 sliding window 只保留最近设定
- D. 让模型自己记忆

<details>
<summary>答案</summary>
**B**。Persistent reference 适合"必须精确、不能压缩"的信息，故事设定是经典场景。
</details>

## 一句话总结

> **六策略：Sliding（最近）/ Summary（结构化压缩）/ Structured State（精确状态）/ Persistent Ref（不变信息）/ Retrieval（按需取）/ Tool Compression（结果精简）。组合用，不是二选一。**

---

下一节：[6.2 - Batch API 与成本/延迟优化](./02-batch-cost-latency.md)
