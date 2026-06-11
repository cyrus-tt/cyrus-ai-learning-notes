# Domain 3.2 — MCP 三大构建块

> Model Context Protocol（MCP）= 让 AI 应用连外部系统的开放标准。考试 18% 权重，必须吃透三大构建块的**用途差别**。

## 核心概念

**MCP 是协议，定义了 AI 应用如何接外部服务**。

它有三个构建块（building blocks），**用途完全不同，不能混用**：

| 构建块 | 中文 | 控制权 | 用途 |
|--------|------|--------|------|
| **Tools** | 工具 | 模型决定何时调 | 让模型**做动作**（搜索、创建、修改） |
| **Resources** | 资源 | 应用决定何时加载 | 给模型**提供上下文**（schema、文档、目录） |
| **Prompts** | 提示模板 | 用户/应用主动调用 | 可复用的**工作流模板** |

> **死记：Tools 是动词，Resources 是名词，Prompts 是工作流。**

## Tools：让模型做事

模型决定**何时调用**、**调用哪个**、**传什么参数**。

例子：
```
search_database(query: str) → 数据库搜索
create_ticket(title, body) → 创建工单
send_email(to, subject, body) → 发邮件
```

**特点**：
- 模型主动选择
- 适合需要**判断和决策**的动作
- 描述质量直接影响选用准确率（Domain 3.1 讲过）

## Resources：给模型上下文

**应用层**决定加载什么，**提前注入** context。模型不主动"请求"。

例子：
```
db://schema/users → 当前用户表 schema
catalog://products → 商品目录
docs://api/v2 → API 文档
```

**特点**：
- 应用决定何时加载
- 适合**参考资料**、**静态/半静态数据**
- 减少模型用 tool 探索的次数

### Tools vs Resources 的判断
**经典场景**：用户问"商品 X 的价格"

- ❌ 用 Tool：`get_product_price(id)` → 模型必须先调用才知道
- ✅ 用 Resource：开场把整个商品目录作为 resource 注入 → 模型直接看到，无需调用

**判断规则**：
- 数据**经常用、量不大** → Resource
- 数据**偶尔用、量大** → Tool 按需查
- 数据**实时变化** → Tool（resource 可能过期）

## Prompts：可复用工作流

**用户或应用**主动调用，封装常见操作流程。

例子：
- `/code-review` → 自动加载代码评审 prompt 模板
- `/extract-invoice` → 加载发票提取模板
- `/onboard-customer` → 加载客户引导流程

**特点**：
- 用户/应用触发，**不是模型**触发
- 适合**重复执行的固定流程**
- 类似 Claude Code 的 slash commands

## 三者的协同示例

设计一个客户支持 MCP server：

```
Resources（自动加载到 context）:
  - support://product-catalog → 产品目录
  - support://kb-faq → 常见问题库
  - support://escalation-policy → 升级政策

Tools（模型自由调用）:
  - search_customer(query) → 查客户
  - create_ticket(...) → 创工单
  - issue_refund(...) → 退款
  - escalate_to_agent(...) → 转人工

Prompts（用户/应用触发）:
  - /handle-complaint → 投诉处理流程
  - /onboard-new-customer → 新客引导
```

**workflow**：
1. 客户输入问题
2. 应用加载 resources（catalog、faq、policy）到 context
3. 用户或应用触发 prompt `/handle-complaint`
4. 模型按 prompt 引导，自由调用 tools

## MCP 的优势

**复用性**：
- 一个内部工单系统 MCP server，可以同时被 5 个 AI 应用使用
- 不用每个应用都重写一遍接口

**标准化**：
- 任何 MCP-compatible 客户端（Claude Code、Claude desktop、ChatGPT 等）都能用
- 不锁定厂商

## 考试常见陷阱

### 陷阱 1：把 Resource 用成 Tool
题目场景：「每次模型想看 schema 都要调用 `get_schema()` 工具，效率低。」
错误：「加缓存」/「优化工具速度」
**正确**：把 schema 改成 resource，开场注入。

### 陷阱 2：把 Tool 用成 Resource
题目场景：「把 100MB 的实时商品数据作为 resource 注入。」
**问题**：每次请求 context 巨大，模型可能也只需要 1-2 条。
**正确**：作为 Tool 按需查。

### 陷阱 3：MCP annotations 当安全保障
```json
{
  "readOnlyHint": true,
  "destructiveHint": false
}
```
这些是**hints**（提示），**不是强制**。客户端可以信也可以不信。**真正的安全在 server 实现里**。

### 陷阱 4：以为 MCP 替你做 auth/retry/rate-limit
**不会**。MCP 只是协议，这些都要 server 自己实现。

### 陷阱 5：把多个工具合并成 "natural language aggregator"
设计一个 `ask_database(question: str)` 工具内部用 LLM 解析自然语言再查库。
**问题**：
- 隐藏了真实接口，模型不知道有哪些能力
- 双重 LLM 解析，错误率叠加
- 难调试

**正确**：暴露具体的、明确的工具（`search_users`, `count_orders`, `filter_by_date`），让模型直接选。

## 用你的日常经验类比

你 Claude Code 里：
- **Tools**：grep、read、edit、bash —— 都是动作
- **Resources**：CLAUDE.md 自动加载 —— 是上下文
- **Prompts**：slash commands（/clear、/btw）—— 是工作流模板

完全是 MCP 三大构建块的对应。

## 自检 3 题

**Q1**: 一个 AI 助手需要经常引用公司的"产品目录"（约 50KB，每天更新一次）。最合适的设计？
- A. 作为 Tool `get_catalog()`，每次需要时调用
- B. 作为 Resource，每次会话开始时加载到 context
- C. 嵌进 system prompt
- D. 用 MCP Prompt 包装

<details>
<summary>答案</summary>
**B**。经常用 + 量不大 + 半静态 = Resource 的标准场景。A 浪费调用，C 让 prompt 臃肿且不便更新。
</details>

---

**Q2**: 一个 MCP server 提供退款工具，开发者在 tool 定义里加了 `destructiveHint: true`。这能阻止恶意调用吗？
- A. 能，客户端会自动屏蔽 destructive 工具
- B. 不能。Annotations 是 hints（提示），不是强制。真正的安全要在 server 实现里
- C. 部分能，需要配合 readOnlyHint
- D. 取决于客户端实现

<details>
<summary>答案</summary>
**B**。Annotations 不是 security boundary。这是考试反复考的点。
</details>

---

**Q3**: 设计一个数据库查询的 MCP server，以下哪个**最差**？
- A. 暴露 `search_users(filters)`、`count_orders(date_range)` 等具体工具
- B. 把表 schema 作为 resource 注入
- C. 提供 `/daily-report` prompt 模板
- D. 暴露一个万能工具 `ask_database(natural_language_query: str)`，内部用 LLM 解析

<details>
<summary>答案</summary>
**D**。"Natural language aggregator" 隐藏真实接口、双重 LLM 解析、难调试。A 暴露明确能力是正解。
</details>

## 一句话总结

> **MCP 三件套：Tools 让模型做事（动词）、Resources 给模型上下文（名词）、Prompts 复用工作流。Annotations 是 hints 不是 security。**

---

下一节：[3.3 - 工具错误处理的五类分类](./03-error-handling.md)
