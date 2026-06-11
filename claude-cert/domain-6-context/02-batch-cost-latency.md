# Domain 6.2 — Batch API 与成本/延迟优化

> 不是所有任务都需要实时响应。**Batch API 提供 ~50% 折扣**，但你要会判断什么时候用、什么时候别用。考试经常考。

## 核心概念

**Anthropic Message Batches API**：
- 异步处理大批量请求
- **价格约 50% 实时 API**
- 完成窗口最长 **24 小时**
- 结果到达后通过 polling 或 webhook 获取

## 什么时候用 Batch

✅ **适合的场景**：
1. **高并发独立请求**：批量分类、提取、评分
2. **结果不需要立即返回**：夜间批处理、报告生成
3. **SLA 容忍 24 小时**
4. **成本敏感**：折扣价值显著

### 经典 batch 场景
- 每天 100 万条评论情感分析（夜间跑）
- 大批文档提取结构化数据
- 大量代码评审（next-day delivery）
- A/B 测试不同 prompt 在 10 万样本上的表现

## 什么时候**不用** Batch

❌ **不适合的场景**：
1. **用户在等**：交互式应用
2. **SLA 短**（小时级）
3. **请求有依赖**：B 要等 A 的输出
4. **需要快速迭代调试**

### 错误判断
"我有 1 万条要处理，用 batch 省钱" → 但用户在等结果 → 用户体验崩。

## Batch 的 SLA 计算

考试爱出这种题：

> 业务 SLA：处理完所有数据 **30 小时**内交付。Batch 窗口最长 24 小时。处理缓冲 6 小时。
> 问：batch 提交间隔最多多久一次？

**算式**：
```
deadline (30h) - batch worst case (24h) - processing buffer (6h) = 0h
```

**结论**：每条数据进来必须立刻进 batch，间隔 = 0。

再看：
> SLA 36 小时，batch 24h，缓冲 6h
> → 36 - 24 - 6 = 6h → 可以累积 6 小时一次提交

## Batch 不能解决什么

### 1. 不能加速单次请求
Batch 的低价**不等于**低延迟。单次响应可能比实时 API **更慢**。

### 2. 不能解决 context 超限
单条请求超 context limit → batch 一样失败。
**解决**：分块处理（chunking），不是改用 batch。

### 3. 不能处理交互式工具调用
Batch 适合 **one-shot** 请求。如果任务需要"调工具 → 看结果 → 再调工具"的循环，batch 不适合。

## 部分失败的处理

batch 1000 条请求，95% 成功，50 条失败怎么办？

### 错误做法
"全部重跑一次"
**问题**：浪费 95% 已成功的成本。

### 正确做法
**按错误类型分类重试**：

| 错误类型 | 处理 |
|---------|------|
| Context length exceeded | 拆 chunk 后重新提交 |
| Validation error | 修正参数后重新提交 |
| Expired | 重新提交未完成的 |
| 其他 transient | 重试该条 |

**关键**：每条请求带 `custom_id`，结果按 ID 匹配，失败的精准重跑。

## Custom ID 的重要性

```python
batch_requests = [
    {"custom_id": f"doc_{doc_id}", "params": {...}}
    for doc_id in document_ids
]
```

为什么必须有 `custom_id`：
- **batch 返回是无序的**
- 通过 `custom_id` 匹配请求和响应
- 部分失败时知道哪条要重跑

❌ 不要假设结果顺序 = 请求顺序。

## 成本对比示例

任务：1 万条文档分类
- 实时 API：$X
- Batch API：$X × 0.5 = $0.5X

但只有满足 SLA 时这个折扣才有意义。

## 不要做的事

### 1. 只为省钱用 batch 不顾 SLA
"反正便宜" → 用户等不及。

### 2. Batch 提交后立刻轮询
Batch 是异步的，立即轮询拿不到结果。**用 webhook 或合理间隔的 polling**。

### 3. 假设结果有序
**永远用 custom_id 匹配**。

### 4. 部分失败重跑整批
按错误类型选择性重跑。

### 5. 把交互式应用强行套 batch
Batch 是 one-shot，不适合多轮交互。

## 一个完整示例：日常文档归档

**任务**：每天晚上把当天 5 万份新文档分类归档。
**SLA**：第二天早上 8 点前完成。

### 设计：
- 23:00 收集当天数据
- 23:30 提交一个 batch（5 万条，每条带 doc_id 作为 custom_id）
- 凌晨 batch 自动跑
- 早上 6:00 polling 获取结果
- 6:00-7:00 处理结果 + 重试失败的（按 error_type 分类）
- 7:00 入库
- 8:00 SLA 满足 ✓

**成本**：实时 API 的一半。

## 用你的日常经验类比

你 `oransim` 处理订单审批的"夜间总结"场景就适合 batch。但用户实时查询订单状态不能用 batch（要立刻返回）。

## 自检 3 题

**Q1**: 一个客服系统要"实时回答用户问题"。开发者听说 Batch API 便宜，想用 batch。判断？
- A. 好主意，省 50% 成本
- B. 不合适。Batch 是异步、最长 24h 完成，不适合交互式实时场景
- C. 用 batch 但加快 polling
- D. 只对 VIP 用户用实时 API

<details>
<summary>答案</summary>
**B**。Batch 不解决延迟问题。交互式应用必须用实时 API。
</details>

---

**Q2**: 一个 batch 处理 1000 条请求，结果返回后顺序和请求顺序不一致。如何匹配？
- A. 按结果在返回数组中的位置匹配
- B. 用每个请求的 `custom_id` 匹配结果
- C. 按完成时间排序
- D. Batch API 一定有序

<details>
<summary>答案</summary>
**B**。`custom_id` 是匹配的唯一可靠方式，结果**无序**。
</details>

---

**Q3**: 一个 batch 50 条因 context_length_exceeded 失败。最佳重试策略？
- A. 重跑整个 batch
- B. 把这 50 条原样再提交一次
- C. 把这 50 条的输入做 chunking（拆分）后再提交
- D. 放弃

<details>
<summary>答案</summary>
**C**。Context 超限重发还是会失败。必须分块。其他 error_type 有对应处理（D6.3 详讲）。
</details>

## 一句话总结

> **Batch = 异步、半价、24h 窗口。SLA 容忍才用。结果无序用 custom_id 匹配。部分失败按 error_type 分类重试，不要重跑全批。**

---

下一节：[6.3 - 数据提取的语义验证与重试](./03-data-extraction-validation.md)
