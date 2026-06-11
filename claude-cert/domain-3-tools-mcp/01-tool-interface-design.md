# Domain 3.1 — Tool 接口设计原则

> 好的工具让正确的动作变得容易，错误的动作变得困难。Tool 设计 = Prompt 设计 + API 设计的结合。

## 核心概念

工具设计**不是简单的 API 包装**。它是给模型用的，所以必须考虑：
- 模型怎么"看到"这个工具（描述）
- 模型怎么"选择"调用它（命名、参数）
- 模型怎么"用好"返回结果（输出结构）

**核心原则**：
> **Tool 是给模型的 UX。让正确的事容易做，错误的事难做。**

## 七大设计原则

### 原则 1：描述要说"何时该用"
❌ 不好：
```
search_orders: 搜索订单
```

✅ 好：
```
search_orders: 根据订单号、用户ID或日期范围查询订单。
何时使用：用户询问"我的订单状态"、"上周的订单"、"订单 #12345"。
何时不使用：用户问的是退款流程（用 refund_help）或商品查询（用 search_products）。
输入：必须提供 order_id、user_id、或 date_range 三者之一。
输出：订单列表，每条含 id、status、total、created_at。
限制：最多返回 50 条，更多请用 cursor 分页。
```

**关键四问**：
1. **What it does**：做什么
2. **When to use**：什么场景用
3. **When NOT to use**：什么场景**不**用（关键！）
4. **Input/Output format**：参数和返回结构

### 原则 2：参数用 enum，不用自由文本

❌ 不好：
```json
{
  "status": {"type": "string", "description": "订单状态"}
}
```
模型可能传 "pending"、"in_progress"、"等待中"、"待处理" —— 全是合法字符串，但语义混乱。

✅ 好：
```json
{
  "status": {
    "type": "string",
    "enum": ["pending", "shipped", "delivered", "cancelled"]
  }
}
```

### 原则 3：参数名要反映含义，不要藏格式

❌ 不好：`date_str` —— 啥格式？
✅ 好：`date_iso8601` —— 一看就知道

❌ 不好：`config` —— 啥 config？
✅ 好：`retry_config_json` —— 知道是 JSON 字符串

### 原则 4：输出要结构化，**含链接 ID**

工具不仅要给模型当下需要的信息，还要给**下一步可能用得上的 ID**。

❌ 不好：
```json
{"results": ["订单A有问题", "订单B已发货"]}
```
模型想看订单 A 详情，没 ID。

✅ 好：
```json
{
  "results": [
    {"id": "ord_123", "summary": "订单A有问题"},
    {"id": "ord_456", "summary": "订单B已发货"}
  ]
}
```
模型能链式调用 `get_order_detail(ord_123)`。

### 原则 5：分页返回，不要全部 dump

返回 1000 条数据 → 占满 context → 注意力衰减。

✅ 好：
```json
{
  "items": [...],   // 第一页 20 条
  "cursor": "abc123",
  "total_count": 1000
}
```
模型按需翻页。

### 原则 6：区分"成功空结果" vs "错误"

❌ 不好：
```json
{"items": []}
```
模型不知道是查到 0 条，还是查询失败了。

✅ 好：
```json
{"items": [], "status": "success", "message": "未找到匹配订单"}
```
或
```json
{"items": null, "isError": true, "error": "数据库连接超时"}
```

### 原则 7：拆分语义不同的操作

❌ 不好：一个 `manage_user` 工具同时支持 create/update/delete，参数因操作类型而异。
**问题**：模型容易传错参数组合，schema 难以约束。

✅ 好：拆成 `create_user`、`update_user`、`delete_user` 三个工具，各自参数明确。

## 进阶模式

### Lookup-then-Act（先查后做）

用户说"取消我刚才下的订单"，模型不知道具体订单号。

❌ 不好：直接让 `cancel_order(latest)` 工具支持 "latest" 这种模糊参数。
✅ 好：
1. 先调用 `search_orders(user_id, sort='created_desc', limit=1)`
2. 拿到 order_id
3. 再调用 `cancel_order(order_id)`

把模糊解析的责任放在前一步，让 act 工具只接受精确 ID。

### Preview-Token-Execute（高风险操作）

```python
# 第一步：预览
preview_result = preview_delete(file_ids=[1,2,3])
# 返回 {preview: "将删除 3 个文件...", confirmation_token: "abc123"}

# 模型展示给用户，用户确认后
execute_delete(confirmation_token="abc123")
# 验证 token 后才真删
```

**Token 是一次性的**，过期失效。这防止：
- Prompt injection 直接触发删除
- 模型"思考偏了"误执行

### Requires_Review 字段

模型不确定的输出，主动标记需要人工复审：
```json
{
  "extracted_value": "1.2B",
  "confidence": 0.65,
  "requires_review": true,
  "review_reason": "原文格式不规范，无法确定单位是百万还是十亿"
}
```

下游可以按 `requires_review` 自动分流到人工队列。

## 不要做的事

### 1. Free-text 参数代替 enum
模型自由发挥 → 下游处理一团乱。

### 2. 把所有信息塞一个工具
"manage everything" 类工具调用率高但出错率也高。拆分粒度。

### 3. 只返回文本（"订单查询成功"）
模型无法链式使用结果。永远返回**结构化 + 含 ID**。

### 4. 假设 annotations 是安全保障
MCP 的 `readOnlyHint`、`destructiveHint` 是**提示**，不是强制。安全规则必须在 tool 实现内部。

### 5. 工具描述里写 "IMPORTANT NEVER"
强制规则放代码。描述里写场景判断。

## 用你的日常经验类比

Claude Code 的 Edit 工具有个设计：`old_string` 必须在文件中唯一。这就是"让正确的事容易做"—— 避免无意中改错位置。Edit 还分 Edit 和 MultiEdit，分粒度。Read 强制 use Edit 之前先读。**这都是 tool design 的范例。**

## 自检 3 题

**Q1**: 一个工具 `manage_user` 同时支持 create、update、delete 三种操作，参数因操作类型而变化。最优重构方案？
- A. 加更详细的描述说明每种操作的参数
- B. 拆分为 `create_user`、`update_user`、`delete_user` 三个独立工具
- C. 让模型自己学会判断参数
- D. 用 enum 控制操作类型

<details>
<summary>答案</summary>
**B**。语义不同、参数差异大的操作要拆分。这让 schema 约束更精确，模型选择更明确。
</details>

---

**Q2**: 一个 search 工具返回 500 条结果一次性塞进 context。最合理的改进？
- A. 切换更大 context 的模型
- B. 改为分页返回（first page + cursor + total_count），模型按需翻页
- C. 把结果转成更精简的格式
- D. 限制每次只返回 1 条

<details>
<summary>答案</summary>
**B**。分页是标准做法，既控制 token，又保留全部数据可访问性。
</details>

---

**Q3**: 一个删除工具，开发者担心 prompt injection 让模型误删。最优防御？
- A. 在工具描述里写 "IMPORTANT: 删除前必须确认"
- B. 在 system prompt 里写"小心删除"
- C. 在 tool 实现里强制 preview-token-execute 两步流程，token 只能用一次
- D. 切换更"安全"的模型

<details>
<summary>答案</summary>
**C**。硬约束必须在代码层。Preview-token-execute 是不可逆操作的标准模式。
</details>

## 一句话总结

> **Tool = 给模型的 UX。描述写"何时用/何时不用"，参数用 enum，输出结构化含 ID，分页防爆 context，高风险用 preview-token-execute。**

---

下一节：[3.2 - MCP 三大构建块](./02-mcp-building-blocks.md)
