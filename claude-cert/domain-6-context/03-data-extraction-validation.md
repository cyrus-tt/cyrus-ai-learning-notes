# Domain 6.3 — 数据提取的语义验证与重试

> Domain 2.3 讲了 schema 设计。这一节讲：**schema 通过之后，怎么验证内容正确**，以及验证失败后怎么有效重试。

## 核心概念

**两层验证**：

| 层 | 检查 | 例子 |
|----|------|------|
| Schema 验证 | 结构、类型、必填 | `amount` 是 number ✓ |
| **语义验证** | 内容逻辑合理性 | `line_items` 求和 = `total_amount` ✓ |

Schema 通过 ≠ 数据正确。**语义验证是生产级数据提取的关键**。

## 常见语义验证规则

### 1. 求和验证
发票 line_items 总和 = total。如果不等，要么 OCR 错、要么模型抄错。

### 2. 范围验证
日期不能是未来（除非是 due date）。金额不能是负的（除非是退款）。

### 3. ID 格式
订单号 `ORD-XXXXXX`，邮箱要含 `@`。Regex 校验。

### 4. 引用一致性
extracted 的 `customer_id` 必须在公司数据库存在。

### 5. 跨字段一致性
"产品类别"和"产品名"要匹配（手机不能是"食品"类）。

### 6. 时序一致性
`shipped_at > ordered_at`，发货时间不能早于下单。

### 7. 单位一致性
所有金额是同种货币（除非显式说明）。

## 语义验证的执行

```python
def validate_invoice(extracted):
    errors = []
    
    # 求和
    items_sum = sum(item["amount"] for item in extracted["line_items"])
    if abs(items_sum - extracted["total_amount"]) > 0.01:
        errors.append({
            "rule": "line_items_sum_equals_total",
            "expected": extracted["total_amount"],
            "actual": items_sum
        })
    
    # 时序
    if extracted["shipped_at"] < extracted["ordered_at"]:
        errors.append({"rule": "shipped_after_ordered", "actual": "violated"})
    
    return errors
```

## 重试策略：把错误反馈给模型

**关键原则**：盲重试基本无效。**反馈具体错误信息**才能让模型修正。

### 错误做法
```python
result = call_claude(prompt)
if invalid(result):
    result = call_claude(prompt)  # 同样的请求，结果相似
```

### 正确做法
```python
result = call_claude(prompt)
errors = semantic_validate(result)
if errors:
    feedback_prompt = f"""
原始提取结果：
{json.dumps(result, indent=2)}

发现以下语义错误：
{json.dumps(errors, indent=2)}

请修正这些具体问题后重新输出。
"""
    result = call_claude(feedback_prompt)
```

**结构化错误反馈**让模型知道改什么。

## 错误是结构性还是个例

**重要判断**：错误是**这一条偶发**还是**系统性问题**？

### 个例
某发票特别脏 → 这次提取错 → 重试可能就好。

### 系统性
**100 张发票里 40 张都有同一错误** → 不是个例，是 schema/prompt 有问题。

**信号**：
- 同一字段反复出错
- 同一类型文档反复出错
- 同一规则反复触发

**正解**：不要继续重试，**改 schema 或 prompt**。

## 评估要分段，不看整体

**陷阱**：报告"准确率 92%" → 看起来不错。

**真相**：可能 95% 的情况是简单的，5% 的关键场景准确率只有 20%。

### 正确评估方式
按维度细分：

| 维度 | 切分 |
|------|------|
| 文档类型 | 发票 / 合同 / 简历 |
| 字段 | name / date / amount |
| 来源质量 | 高质量 PDF / 扫描件 / 手写 |
| 复杂度 | 简单 / 中等 / 复杂 |

```
准确率分布：
- 发票.amount 字段：99%
- 发票.date 字段：97%
- 简历.skills 字段：85%  ← 这里有问题
- 合同.parties 字段：80%  ← 这里有问题
```

**总体 92% 掩盖了 simple cases dominate**。

## Confidence 校准

模型可以返回 `confidence` 字段，但**未校准的 confidence 不可信**。

### 校准做法
1. 拿一批人工标注数据
2. 让模型预测 + 给 confidence
3. 看不同 confidence 区间的实际准确率：

```
confidence 0.9-1.0: 实际准确率 95%  ✓ 校准
confidence 0.7-0.9: 实际准确率 82%
confidence 0.5-0.7: 实际准确率 65%
```

如果不校准，可能 confidence 0.9 实际准确率 60% → 自动化阈值会出大错。

### 校准后的应用
- confidence > 0.9 → 自动入库
- 0.7-0.9 → 抽样复核
- < 0.7 → 人工必看

## 处理"已知"和"未知"

### 已知字段
有 ground truth → 比对验证准确率。

### 未知字段
没有 ground truth → 用其他信号判断：
- 跨字段一致性（求和、范围）
- 多次提取一致性（temperature=0 跑 3 次，看是否相同）
- 引用源验证（source_quote 和 extracted_value 一致）

## 不要做的事

### 1. 只看整体准确率
分段评估才能发现真问题。

### 2. 盲重试
反馈具体错误才有效。

### 3. 把 schema 通过当数据正确
语义验证是另一回事。

### 4. 用未校准 confidence 做自动化
先校准再用。

### 5. 个例错误改 schema
改 schema 是结构性问题的应对。个例可能就是噪声。

### 6. 改 prompt 不评估影响
改 prompt 后**必须重新跑评估**，可能整体好了但某个细分场景变差。

## 一个完整示例

**任务**：批量提取发票（10 万张）。

### Pipeline
1. **Extract**：用 Structured Output API 提取
2. **Schema validate**：自动验证结构
3. **Semantic validate**：求和、日期、货币一致性
4. **Retry on errors**：把具体错误反馈给模型重试一次
5. **Confidence routing**：
   - high confidence → 自动入库
   - medium → 抽样复核
   - low → 人工必看
6. **Audit log**：所有错误率按文档来源、字段分段记录
7. **Iterate**：定期看分段数据，找系统性问题改 prompt/schema

## 用你的日常经验类比

你给小红书选题打分时，不是看"整体好不好"，而是看**收藏比、点赞比、留存**这些细分维度。同样的多维评估思维。

## 自检 3 题

**Q1**: 一个发票提取应用，schema 验证 100% 通过，但用户反馈"经常算错钱"。最可能根因？
- A. 模型版本太旧
- B. 缺少语义验证（line_items 求和应该等于 total，但没校验）
- C. Schema 设计错
- D. Prompt 不够长

<details>
<summary>答案</summary>
**B**。Schema 通过 ≠ 数据正确。语义验证（求和、范围、一致性）是补丁。
</details>

---

**Q2**: 一个 agent 报告整体准确率 92%。在哪个角度更可能发现问题？
- A. 看模型版本
- B. 按文档类型、字段、来源质量分段评估
- C. 提高 confidence 阈值
- D. 切换 API

<details>
<summary>答案</summary>
**B**。聚合数据掩盖问题。分段评估才能找到弱点。
</details>

---

**Q3**: 一个 confidence 字段被用于自动化分流（>0.8 入库），但实际错误率很高。最可能原因？
- A. Confidence 未校准，0.8 实际准确率可能远低于 80%
- B. 模型不会算 confidence
- C. 数据本身太烂
- D. 阈值定低了

<details>
<summary>答案</summary>
**A**。未校准的 confidence 不可作自动化决策依据。必须先用标注数据校准。
</details>

## 一句话总结

> **两层验证：schema 验结构 + 语义验内容。重试要反馈具体错误。分段评估找系统问题。Confidence 用前必校准。**

---

下一节：[6.4 - 评估、迭代与生产部署](./04-evaluation-iteration.md)
