# Domain 1.3 — 结构化输出 vs Tool Use vs 纯文本 JSON

> 让模型返回 JSON 是日常需求。但你有 3 种方式实现，**可靠性差异巨大**。考试会用场景题逼你选对。

## 核心概念

让 Claude 返回结构化数据（不只是自然语言），按可靠性从高到低排列：

| 方式 | 中文 | 可靠性 | 一句话 |
|------|------|--------|--------|
| Structured Output | 结构化输出 | ★★★★★ | 用 JSON Schema 约束输出 |
| Tool Use | 工具调用 | ★★★★ | 借工具 schema 强制结构 |
| Prompt + 纯文本 JSON | 提示词让模型"输出 JSON" | ★★ | 最不可靠，容易出格 |

**核心原则**：**schema-backed output 永远优先于 prompt-only JSON。**

## 三种方式怎么写

### 方式 1：Structured Output（推荐）

直接传 JSON Schema，模型必须按 schema 输出：

```json
{
  "model": "claude-opus-4-7",
  "messages": [{"role": "user", "content": "提取这个简历的信息"}],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "Resume",
      "schema": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "years_experience": {"type": "number"},
          "skills": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["name", "skills"]
      }
    }
  }
}
```

### 方式 2：Tool Use（次优）

把"返回数据"包装成一个工具调用：

```json
{
  "tools": [{
    "name": "save_resume",
    "input_schema": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "skills": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["name", "skills"]
    }
  }],
  "tool_choice": {"type": "tool", "name": "save_resume"}
}
```

模型必须调用 `save_resume`，参数就是结构化数据。这是 structured output 出现前的标准做法。

### 方式 3：Prompt 让模型输出 JSON（最差）

```
请提取简历信息，输出格式为 JSON：
{"name": "...", "skills": [...]}
```

**问题**：
- 模型可能加 markdown 包装（` ```json ... ``` `）
- 可能加解释文字（"以下是结果："）
- 字段名拼写错
- 字段缺失
- 嵌套 JSON 转义错

## 为什么 schema-backed 更可靠

模型在 schema 约束下，**采样阶段就被限制**只能产生符合 schema 的 token。这是 grammar-based decoding 的硬约束，不靠模型"听话"。

prompt-only JSON 是软约束，模型"理解"了要 JSON，但生成时仍有自由度，所以会出错。

## 考试常见陷阱

### 陷阱 1：以为 "valid JSON" = "correct data"
**Schema 验证只保证结构对，不保证内容对。**
- ✅ Schema 通过：`{"price": 999}`
- ❌ 实际数据错：商品真实价格是 99，模型抄错了一位
- 这是 Domain 6 的**语义验证**问题，不能靠 schema 解决

### 陷阱 2：必填字段太严导致模型"硬编"
如果你把 `address` 设成 required，但简历里就是没地址，**模型会硬编一个**（hallucination）。
**正确做法**：把"可能缺失"的字段设为可选（不在 required 里）或允许 nullable。

### 陷阱 3：用 enum 但不留逃生舱
```json
"category": {"enum": ["A", "B", "C"]}
```
新出现的类别 D 怎么办？模型被迫选 A/B/C 里最接近的，**信号丢失**。
**正确做法**：留 `"other"` + `detail` 字段：
```json
"category": {"enum": ["A", "B", "C", "other"]},
"category_detail": {"type": "string", "description": "若选 other，说明具体类别"}
```

### 陷阱 4：null vs 空数组混淆
- `null` = "未知 / 没找到这个字段"
- `[]` = "查过了，确认没有"
**语义不同**，schema 设计时要分清。

### 陷阱 5：长文档一次性提取所有字段
文档很长 + 字段很多 → 模型注意力分散。
**正确做法**：先做摘要/分块，再分别提取。

## 用你的日常经验类比

你用 Claude Code 时，subagent 返回结果就是结构化的（task ID、状态、产物）。这种结构化比"让模型口头描述结果"可靠得多 —— 同理。

## 自检 3 题

**Q1**: 一个简历提取应用，需要返回 `{"name": str, "skills": list, "address": str?}`。开发者发现 `address` 字段经常被模型编造。最可能的根因是？
- A. 模型能力不足
- B. `address` 在 schema 中被设为 required，但实际简历常不含地址，模型被迫硬编
- C. 温度（temperature）设得太高
- D. Prompt 写得不清楚

<details>
<summary>答案</summary>
**B**。这是 schema 设计经典陷阱：必填字段+真实数据缺失=hallucination。改成可选或 nullable 即可。
</details>

---

**Q2**: 一个分类应用，schema 中 `category` 是枚举 `["bug", "feature", "question"]`。新业务出现了"performance issue"类别，但还没更新 schema。模型的行为最可能是？
- A. 报错拒绝输出
- B. 返回空值
- C. 选最接近的现有类别（可能是 bug），信号丢失
- D. 自动添加新类别

<details>
<summary>答案</summary>
**C**。模型被 schema 硬约束，只能选已有枚举值。正确做法是加 `"other"` + `detail` 字段做逃生舱。
</details>

---

**Q3**: 团队三种实现都试了：(1) 在 prompt 里要求输出 JSON；(2) Tool use；(3) Structured Output。哪种最可靠？
- A. (1)，因为最灵活
- B. (2)，因为 tool schema 强制
- C. (3)，因为 grammar-based decoding 硬约束
- D. 都一样，看 prompt 质量

<details>
<summary>答案</summary>
**C**。Structured Output > Tool Use > Prompt JSON。考试很爱考这个排序。
</details>

## 一句话总结

> **结构化数据用 schema-backed output，不要相信"prompt 让模型听话"。schema 保结构，不保内容正确性。**

---

下一节：[1.4 - 上下文 token 与注意力衰减](./04-attention-boundary.md)
