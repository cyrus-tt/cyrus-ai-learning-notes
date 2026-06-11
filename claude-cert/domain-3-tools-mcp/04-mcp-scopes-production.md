# Domain 3.4 — MCP Scopes 与生产实践

> MCP 在 Claude Code 里有三种 scope，常考。还有"工具过多怎么办"的进阶模式。

## MCP Scope 三层

在 Claude Code 里，MCP server 可以配置在三个层级：

| Scope | 配置位置 | 共享范围 | 适用场景 |
|-------|---------|---------|---------|
| **Project** | `.mcp.json`（项目内） | 项目所有成员（团队共享） | 项目专属工具，团队共用 |
| **Local** | `~/.claude.json`（项目作用域） | 仅本机 + 这个项目 | 项目相关但只自己用（如本地 API key） |
| **User** | `~/.claude.json`（全局作用域） | 仅本机 + 所有项目 | 个人通用工具（如 GitHub MCP） |

**核心区别**：
- **Project**：进 git，团队共享配置
- **Local**：不进 git，私人本机配置（项目级）
- **User**：不进 git，私人本机配置（全局）

## 选 scope 的判断

### Project scope
✅ 适合：
- 团队共用的 API 接口（公司 ticketing 系统）
- 项目专属的数据库连接（开发环境只读）
- 项目相关的文档查询

❌ 不适合：
- 包含 secret/token（不能进 git）
- 个人偏好工具

### Local scope
✅ 适合：
- 项目相关但带 secret 的配置
- 本机才能跑的开发工具

### User scope
✅ 适合：
- 跨项目通用的个人工具（GitHub、Slack、个人 Notion）
- 不依赖项目上下文的工具

## 工具过多的进阶模式

当你接入 5+ MCP server，工具数量可能上百。模型选错率上升（Domain 1.4 讲过）。

### 模式 1：Routing（路由）

**先分类，再暴露相关工具子集**。

```
用户输入 → intent classifier → 决定调用哪类工具
```

- 用户问代码问题 → 暴露 grep/read/edit
- 用户问数据问题 → 暴露 query/chart
- 用户问任务 → 暴露 ticket/project

### 模式 2：Tool Search（工具搜索）

提供一个 "meta tool"：`search_tools(query)`。模型遇到不熟的任务，先搜索可用工具。

```
模型："我要发邮件，有什么工具？"
→ search_tools("send email") → 返回 [send_email, draft_email, ...]
→ 模型再调用 send_email
```

### 模式 3：Dynamic Tool Registration

MCP server 支持 `list_changed` 通知。Server 可以根据上下文动态变更可用工具列表。

例子：
- 用户登录管理员 → server 通知客户端"现在多了 admin 工具"
- 用户进入沙盒环境 → server 通知"现在只有只读工具"

### 模式 4：MCP-Apps 联合体

把多个 MCP server 包装成一个统一接入点。

- 内部 ops 中心 = customer-mcp + billing-mcp + ticketing-mcp + analytics-mcp
- 客户端只需连一个，背后 fan-out 到多个

## MCP Server 设计建议

如果你要自己写 MCP server：

### 1. 工具命名一致
```
search_*     → 查询
get_*        → 单条获取
create_*     → 创建
update_*     → 更新
delete_*     → 删除
analyze_*    → 分析
```

### 2. Resource URI 用 scheme
```
db://schema/users
catalog://products/active
docs://api/v2
```

### 3. Server 自报家底
实现 `tools/list`、`resources/list`、`prompts/list`，让客户端能发现能力。

### 4. 加监控
- 工具调用次数
- 失败率（按 error_type 分类）
- 平均延迟

### 5. 版本化
工具签名变化要谨慎，保留旧版兼容一段时间。

## 安全实践

### 1. Annotations 不是安全保障
（上一节强调过）`readOnlyHint`、`destructiveHint` 是元数据，不是 access control。

### 2. 权限校验在 server 内部
不要相信"客户端会负责"，server 必须独立验证。

### 3. Secret 别走 prompt
不要让用户在对话里粘贴 API key 给模型。Secret 配在 server 的环境变量里。

### 4. 速率限制
MCP 协议**不**自动限流，server 要自己做。

### 5. Audit log
所有写操作记录日志，包括调用方、参数、结果。

## 考试常见陷阱

### 陷阱 1：把含 secret 的 MCP 配成 project scope
配置进 git → secret 泄露。Local 或 User scope 才对。

### 陷阱 2：以为 MCP 自动处理 auth/limit/retry
**全要自己实现**。

### 陷阱 3：工具数量超过 50 仍不分层
模型选错率上升。考虑 routing 或 tool search。

### 陷阱 4：用 user scope 装项目专属工具
团队其他人没这个工具 → 配置不一致。应该用 project scope。

## 用你的日常经验类比

你 `~/.claude/CLAUDE.md` 是 user scope（全局个人），项目里的 `CLAUDE.md` 是 project scope（团队共享）。MCP 三层 scope 是一样的设计哲学。

## 自检 3 题

**Q1**: 一个团队项目接入了内部 ticketing 系统的 MCP server，配置不含 secret（OAuth 流程）。最合适的 scope？
- A. User scope（仅自己）
- B. Local scope（本机+本项目）
- C. Project scope（团队共享，进 git）
- D. 不用 MCP，写死在代码

<details>
<summary>答案</summary>
**C**。团队共用、无 secret = project scope 标配。这样新成员 clone 项目就能用。
</details>

---

**Q2**: 一个 agent 接入了 80 个 MCP 工具，模型选错工具频繁。最优解决方向？
- A. 把所有工具描述写得更长更细
- B. 提高模型温度
- C. 实现意图路由，根据请求类型只暴露相关工具子集（routing）；或提供 tool search meta-tool
- D. 限制每次只能调一个工具

<details>
<summary>答案</summary>
**C**。工具数量爆炸是 routing 或 tool search 的标准场景。A 让 token 噪声更大，反向恶化。
</details>

---

**Q3**: MCP 的 `readOnlyHint: true` 在 tool 定义里。这能阻止恶意调用产生副作用吗？
- A. 能，客户端会强制只读
- B. 不能，它只是 hint，server 实现里如果有副作用照样会执行。安全要在 server 强制
- C. 取决于客户端
- D. 仅 Claude 客户端支持

<details>
<summary>答案</summary>
**B**。Annotations 不是 security boundary，这是 MCP 必考点。
</details>

## 一句话总结

> **MCP 三 scope：Project 团队共享、Local 本机项目、User 跨项目个人。工具多用 routing/tool search/动态注册。安全永远在 server 内强制。**

---

[← Domain 3 目录](./README.md) · 下一 Domain：[Domain 4 - Claude Code 工作流](../domain-4-claude-code/01-plan-mode-vs-execution.md)
