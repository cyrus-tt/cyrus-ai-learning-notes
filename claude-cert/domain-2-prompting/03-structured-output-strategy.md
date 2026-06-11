# Domain 2.3 — 结构化输出的实战策略

> 1.3 节讲了**用哪种方式**输出结构化数据。这一节讲**schema 怎么设计**才能避免常见坑。

## 核心概念

设计好 schema 的本质：**让模型容易"诚实"，不容易"硬编"**。

四个核心设计原则：

1. **必填字段只放确定存在的**
2. **枚举要留逃生舱**
3. **null 和空数组的语义要分清**
4. **source grounding：数据可追溯**

## 原则 1：必填字段 vs 可选字段

### 错误设计
```json
{
  "required": ["name", "email", "phone", "address", "company"]
}
```
真实数据：用户简历常常没有电话。
**后果**：模型硬编一个虚假电话以满足 schema。

### 正确设计
```json
{
  "properties": {
    "name": {"type": "string"},
    "email": {"type": "string"},
    "phone": {"type": ["string", "null"]},
    "address": {"type": ["string", "null"]},
    "company": {"type": ["string", "null"]}
  },
  "required": ["name", "email"]
}
```

**规则**：只把"100% 一定有"的字段设为 required。其他用 nullable。

## 原则 2：枚举要有逃生舱

### 错误设计
```json
{
  "category": {"enum": ["bug", "feature", "question"]}
}
```
新出现的"performance complaint"怎么办？模型被迫选最接近的（可能是 bug），**信号丢失**。

### 正确设计
```json
{
  "category": {"enum": ["bug", "feature", "question", "other"]},
  "category_detail": {
    "type": "string",
    "description": "若 category 是 other，请说明具体类别。"
  }
}
```

**规则**：枚举永远加 `"other"` + detail 字段。新类别出现时不丢信号。

## 原则 3：null vs 空数组

| 语义 | 表示 |
|------|------|
| 字段未知/未查 | `null` |
| 查过了，确认没有 | `[]` |

**例子**：搜索"某书的读者评论"
- 还没查 → `comments: null`
- 查了 0 条 → `comments: []`
- 查了 5 条 → `comments: [...]`

考试经常考这个区别。错把 null 当空数组（或反过来），会让下游逻辑判断错。

## 原则 4：Source Grounding（数据可追溯）

任何"提取"任务，输出要能**追溯回原始来源**：

```json
{
  "company_revenue_2024": {
    "value": "1.2B",
    "source_location": "Section 3.2, page 14",
    "source_quote": "Total revenue for fiscal year 2024 reached $1.2 billion."
  }
}
```

**为什么重要**：
- 审计：万一数据错了，能查原文
- 合规：金融/医疗类应用必备
- 调试：模型出错时能定位是看错原文还是推理错

## 完整示例：发票提取 schema

```json
{
  "type": "object",
  "properties": {
    "invoice_number": {"type": "string"},
    "total_amount": {
      "type": "object",
      "properties": {
        "value": {"type": "number"},
        "currency": {"type": "string"},
        "source_quote": {"type": "string"}
      },
      "required": ["value", "currency", "source_quote"]
    },
    "line_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": {"type": "string"},
          "amount": {"type": "number"},
          "category": {
            "enum": ["product", "service", "tax", "discount", "other"]
          },
          "category_detail": {"type": ["string", "null"]}
        }
      }
    },
    "currency_unclear": {
      "type": "boolean",
      "description": "如果发票上未明确标注货币，设为 true"
    },
    "_confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": ["invoice_number", "total_amount", "line_items"]
}
```

**注意**：
- `line_items` 是必填（发票一定有商品行），但**单行内的 category 是枚举 + other**
- 加 `currency_unclear` 字段允许模型主动报告不确定性
- 加 `_confidence` 让下游可以按置信度分流

## 输出和验证的两层

记住：**Schema 验证是结构层，业务验证是语义层**。

| 层次 | 检查什么 | 例子 |
|------|---------|------|
| Schema 验证 | 结构、类型、必填 | `amount` 是 number ✓ |
| 语义验证 | 内容合理性 | `line_items` 求和 = `total_amount` ✓ |

Schema 通过 ≠ 数据正确。必须加业务规则验证（Domain 6 会详细讲）。

## 当验证失败时怎么处理

**不要无脑重试**。要把**具体错误**反馈给模型。

### 错误做法
```python
try:
    result = call_claude(prompt)
    validate(result)
except ValidationError:
    result = call_claude(prompt)  # 一模一样的请求
```
**问题**：相同输入大概率得到相同错误。

### 正确做法
```python
result = call_claude(prompt)
errors = validate(result)
if errors:
    retry_prompt = f"""
原始输出：{result}
验证错误：{errors}
请修正这些具体错误后重新输出。
"""
    result = call_claude(retry_prompt)
```

**关键**：把**具体错误**作为反馈给模型，命中率大幅提升。

## 考试常见陷阱

### 陷阱 1：把"可能缺"的字段设 required
模型硬编 → 数据污染。

### 陷阱 2：枚举不留 other
新类别出现 → 信号丢失。

### 陷阱 3：用 null 表示"查了为零"
下游逻辑判错（以为没查 vs 查了没有）。

### 陷阱 4：没 source grounding，事后无法追溯
出错时只能盲改 prompt。

### 陷阱 5：依赖 schema 通过 = 数据正确
忘了加业务规则验证（求和、范围、ID 格式）。

## 用你的日常经验类比

你设计 D1 schema 时，必填字段、外键、check constraint 都是同样逻辑。Schema 设计能力跨场景通用。

## 自检 3 题

**Q1**: 一个简历提取应用，schema 中 `phone` 字段是 required。实际简历经常没有电话，但模型总能填出一个号码。最可能的根因？
- A. 模型记住了过去的电话号
- B. 必填字段在数据缺失时，模型会 hallucinate 一个值满足 schema 约束
- C. Schema 解析错误
- D. 模型温度太高

<details>
<summary>答案</summary>
**B**。这是 schema 设计经典陷阱。改为 nullable 即可。
</details>

---

**Q2**: 一个 RAG 应用从文档提取数据，下游审计部门要求每条数据都能"指向原文"。schema 应该加什么字段？
- A. `timestamp`：提取时间
- B. `source_location` + `source_quote`：原文位置和引用
- C. `model_version`：模型版本
- D. `confidence`：置信度

<details>
<summary>答案</summary>
**B**。Source grounding 是审计/合规场景必需。A/C/D 是辅助信息但不能"指向原文"。
</details>

---

**Q3**: 验证失败后，最有效的重试策略是？
- A. 用相同 prompt 重发请求
- B. 把验证错误信息附在 prompt 里再请求（"以下输出有这些错误：..."）
- C. 切换更大的模型
- D. 放弃这条数据

<details>
<summary>答案</summary>
**B**。具体错误反馈是重试的关键。盲重试基本无效（A），切大模型治标不治本（C）。
</details>

## 一句话总结

> **Schema 设计四原则：可选字段 nullable / 枚举留 other / null≠[] / source grounding 必备。Schema 通过 ≠ 数据正确。**

---

下一节：[2.4 - 澄清问题与对话行为](./04-clarifying-questions.md)
