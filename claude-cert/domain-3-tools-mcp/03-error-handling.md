# Domain 3.3 — 工具错误处理的五类分类

> 工具错误不只是"出错了"。**不同类型的错误，模型应该走完全不同的恢复路径**。这是考试高频考点。

## 核心概念

**工具错误分五类**，每类对应不同的恢复策略：

| 错误类型 | 中文 | 模型应该做什么 |
|---------|------|---------------|
| Transient Infrastructure | 瞬态基础设施错误 | 工具内部重试 |
| Permanent Validation | 永久验证错误 | 修改参数后重试 |
| Business Rule | 业务规则错误 | 不重试，可能转人工 |
| Permission | 权限错误 | 不重试，升级授权 |
| Uncertain Write State | 写入状态不确定 | **小心**：可能已部分执行 |

**核心原则**：
> **错误信息要告诉模型"这是哪类错误"，模型才能做对反应。**

## 五类详解

### 1. Transient Infrastructure（瞬态基础设施）

**例子**：数据库连接超时、网络抖动、上游服务 503。

**处理方式**：
- **工具内部**用指数退避重试（exponential backoff）
- 重试 2-3 次后仍失败再返回错误
- **不要让模型重试**（模型不知道该等多久）

```json
{
  "isError": true,
  "error_type": "transient_infrastructure",
  "message": "Database connection timeout after 3 retries.",
  "suggestion": "User can try again later."
}
```

### 2. Permanent Validation（永久验证）

**例子**：参数格式错误、缺必填字段、enum 值不合法。

**处理方式**：
- 返回**结构化错误**，告诉模型**具体哪里错**
- 模型修正参数后重试

```json
{
  "isError": true,
  "error_type": "validation",
  "message": "Invalid date format",
  "details": {
    "field": "date_range.start",
    "received": "2026/05/01",
    "expected_format": "YYYY-MM-DD (ISO 8601)"
  }
}
```

❌ 不要返回："Invalid input"（模型不知道改哪）
✅ 要返回：精确字段 + 收到的值 + 期望格式

### 3. Business Rule（业务规则）

**例子**：退款金额超过订单金额、订单已发货不能取消、超出库存。

**处理方式**：
- **不要重试**（重试也不会成功）
- 把规则解释清楚给模型
- 可能需要走升级流程

```json
{
  "isError": true,
  "error_type": "business_rule",
  "message": "Refund amount exceeds order total.",
  "details": {
    "order_total": 100,
    "requested_refund": 150,
    "max_allowed": 100
  },
  "next_action": "ask_user_to_lower_amount_or_escalate"
}
```

### 4. Permission（权限）

**例子**：用户无权访问某资源、操作需要管理员权限。

**处理方式**：
- **不要重试**
- 不要泄露过多细节（"用户不存在" vs "无权访问"差别敏感）
- 引导模型给出升级路径

```json
{
  "isError": true,
  "error_type": "permission",
  "message": "Access denied for this operation.",
  "next_action": "escalate_to_admin"
}
```

### 5. Uncertain Write State（写入状态不确定）

**最危险的错误**。例子：扣款 API 调用后，网络断开，不知道扣款是否成功。

**处理方式**：
- **绝对不要自动重试**（可能导致重复扣款）
- 返回 "uncertain" 状态，要求人工核实
- 用幂等键（idempotency key）支持安全重试

```json
{
  "isError": true,
  "error_type": "uncertain_write",
  "message": "Payment may have been processed; verify before retrying.",
  "operation_id": "pay_abc123",
  "next_action": "manual_verification_required"
}
```

## 关键规则：写操作和幂等性

**有副作用的写操作（支付、发送邮件、创建订单），重试逻辑必须基于幂等键**。

```python
# 不安全
def charge_user(user_id, amount):
    return payment_api.charge(user_id, amount)

# 安全
def charge_user(user_id, amount, idempotency_key):
    return payment_api.charge(
        user_id, amount,
        idempotency_key=idempotency_key  # 相同 key 不会重复扣
    )
```

**没有幂等保证的写操作**，宁可失败也不要自动重试。

## 错误信息的结构

好的工具错误返回**永远是结构化的**：

```json
{
  "isError": true,
  "error_type": "validation | business_rule | permission | transient | uncertain",
  "message": "human-readable summary",
  "details": { ... 结构化的具体信息 ... },
  "next_action": "retry | ask_user | escalate | verify | abort",
  "retry_safe": true | false
}
```

**不要返回**：
- 异常 stack trace
- 自由文本错误（"Something went wrong"）
- 让模型猜的模糊信息

## MCP 错误的两层

MCP 协议本身区分两种"错误"：

| 类型 | 例子 | 返回方式 |
|------|------|---------|
| 协议错误 | 缺参数、调用未注册工具 | JSON-RPC error response |
| 工具执行错误 | 404、503、业务拒绝 | `isError: true` in tool result |

**不要把业务错误抛成协议错误**。模型只能从 `isError` 的工具结果中学到信息，从协议错误中学不到。

## 不要做的事

### 1. 抛异常代替返回错误
```python
# ❌ 不好
def search_user(id):
    user = db.query(id)
    if not user:
        raise UserNotFoundError()  # 异常向上抛
    return user
```
**结果**：MCP server 崩溃或返回协议错误，模型看到的是"调用失败"，不知道具体原因。

✅ 好：
```python
def search_user(id):
    user = db.query(id)
    if not user:
        return {"isError": True, "error_type": "not_found", "id": id}
    return user
```

### 2. 把不确定写当成可重试
扣款超时 → 模型自动重试 → 重复扣款。
**永远**对 uncertain_write 返回明确标志。

### 3. 不区分"成功 0 结果"和"错误"
`{"items": []}` 没法区分"查到 0 条" vs "查询失败"。

### 4. 给模型自由文本错误让它猜
模型猜不准。**结构化错误才能精确恢复**。

## 一个完整的"商品搜索"工具错误处理

```python
def search_products(query, max_retries=3):
    # 1. Validation
    if not query or len(query) > 200:
        return {
            "isError": True,
            "error_type": "validation",
            "message": "Query must be 1-200 chars",
            "details": {"received_length": len(query)}
        }
    
    # 2. Transient retry (internal)
    for attempt in range(max_retries):
        try:
            results = db.search(query)
            return {"items": results, "total": len(results), "status": "success"}
        except DBTimeout:
            if attempt == max_retries - 1:
                return {
                    "isError": True,
                    "error_type": "transient_infrastructure",
                    "message": "Search timed out after retries"
                }
            time.sleep(2 ** attempt)  # exponential backoff
        except PermissionDenied:
            return {
                "isError": True,
                "error_type": "permission",
                "next_action": "escalate_to_admin"
            }
```

## 用你的日常经验类比

你用 Claude Code 时，Bash 工具执行失败 → 返回结构化的 stderr 而不是抛异常。你能看到具体出错原因再决定下一步。这就是好的错误处理。

## 自检 3 题

**Q1**: 一个支付工具调用后网络断开，不知道是否扣款成功。最合理的处理？
- A. 自动重试 3 次确保成功
- B. 返回 `error_type: uncertain_write`，不重试，要求人工核实
- C. 假设没扣款，重新尝试一次
- D. 假设扣款了，告知用户成功

<details>
<summary>答案</summary>
**B**。Uncertain write 是最危险的错误类型，绝不能自动重试。这是生产 agent 的核心安全原则。
</details>

---

**Q2**: 一个工具因 enum 参数传错被拒绝。错误信息应该是？
- A. "Invalid input"
- B. "Internal error"
- C. `{"error_type": "validation", "field": "status", "received": "等待中", "expected": ["pending", "shipped", ...]}`
- D. 抛 ValueError 异常

<details>
<summary>答案</summary>
**C**。结构化错误 + 具体字段 + 期望值，让模型能精确修正参数后重试。
</details>

---

**Q3**: 关于工具内部重试，正确的判断是？
- A. 所有错误都应该让模型决定要不要重试
- B. 所有错误都应该工具内部重试 3 次
- C. 瞬态基础设施错误工具内部重试；验证错误返回结构化错误让模型修正；写入状态不确定时绝不自动重试
- D. 只重试 200 OK 的请求

<details>
<summary>答案</summary>
**C**。重试逻辑要放在"知道该怎么重试"的层。瞬态在工具，验证靠模型，业务/权限靠用户/管理员，不确定写要人工。
</details>

## 一句话总结

> **五类错误 = 五种恢复路径。Transient 工具重试 / Validation 模型修正 / Business 拒绝 / Permission 升级 / Uncertain 绝不自动重试。错误信息必须结构化。**

---

下一节：[3.4 - MCP scopes 与生产实践](./04-mcp-scopes-production.md)
