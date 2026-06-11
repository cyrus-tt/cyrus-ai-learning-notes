# Domain 1.2 — tool_choice 的四种模式

> Tool use 是 Claude 的核心能力之一。`tool_choice` 这个参数决定**模型有没有自由意志去选要不要调用工具**。考试每套题都会考。

## 核心概念

当你在 API 请求里定义了一组 `tools`（工具），Claude 默认会**根据情况自己决定**要不要调用。

但有时候你需要**强制**它的行为 —— 这就是 `tool_choice` 参数的用处。

`tool_choice` 有**四种模式**：

| 模式 | 行为 | 一句话场景 |
|------|------|-----------|
| `auto` | 模型自己决定要不要调用工具 | **默认**，绝大多数场景 |
| `any` | 模型必须调用**某一个**工具（任意一个都行） | 强制 agent 必须行动，不能只说话 |
| `tool`（具名） | 模型必须调用**这个指定**的工具 | 强制走某一步 workflow |
| `none` | 模型**不能**调用任何工具，必须用文字回答 | 临时禁用工具能力 |

## 四种模式的 JSON 长啥样

### 1. `auto`（默认）
```json
{
  "tools": [...],
  "tool_choice": {"type": "auto"}
}
```
等价于不写 `tool_choice`。模型看情况决定。

### 2. `any`（强制调用任意工具）
```json
{
  "tools": [...],
  "tool_choice": {"type": "any"}
}
```
模型**必须**输出一个 tool call，不允许只回文字。但**调哪个**它自己选。

### 3. `tool`（强制调用指定工具）
```json
{
  "tools": [...],
  "tool_choice": {"type": "tool", "name": "get_weather"}
}
```
模型**必须**调用 `get_weather` 这个工具。

### 4. `none`（禁用所有工具）
```json
{
  "tools": [...],
  "tool_choice": {"type": "none"}
}
```
模型不能调工具，只能输出文字。

## 为什么要有这四种模式

理解每种模式的存在意义，比死记定义重要：

- **`auto`** —— 给模型最大自由度。它会判断这个问题该不该用工具。最自然，但也最不确定。
- **`any`** —— 当你的应用要求"这一步必须执行动作"。例如客服 agent 收到工单，必须从 5 个工具里选一个去处理，不能干聊。
- **`tool`** —— 当你在 workflow 中明确知道下一步是什么。例如多阶段 pipeline 的第二步是"必须分类"，那就强制调用 `classify` 工具。
- **`none`** —— 当你**临时**想关掉工具能力。比如让模型先做一次纯总结，再开启工具调用。

## 一个真实场景示范

假设你做一个客服 agent，工具有：`search_orders`、`refund_order`、`create_ticket`。

**场景 A**：用户说"我想退款"
- 用 `auto`，让模型自己理解意图并选 `refund_order`。

**场景 B**：用户说"我心情不好"
- 用 `auto` 时，模型可能选择不调用任何工具（因为聊天就够了）。
- 但如果你产品定位是"每次必须有动作"，那就用 `any`，强制它至少调用某个工具（比如 `create_ticket` 记录一下）。

**场景 C**：你做的是固定流程的报销审批 pipeline，第一步永远是分类
- 用 `tool: classify_request`，强制走分类。
- 不要给模型选择权，因为流程是死的。

**场景 D**：你想让模型先做纯文本摘要，再启用工具
- 第一次请求用 `none`，输出摘要。
- 第二次请求把摘要塞进去，切回 `auto`，让模型基于摘要调工具。

## 考试常见陷阱

### 陷阱 1：把 `any` 当成"必须调用所有工具"
`any` = **任意一个**，不是"全部"。模型只会调一个工具。

### 陷阱 2：用 `any` 期望模型选对工具
题目场景：「我有 10 个工具，我想模型必须调用其中的退款工具。」
错误做法：`tool_choice: any` —— 这只保证调一个工具，**不保证调哪个**，可能选错。
正确做法：`tool_choice: tool, name: refund` —— 强制指定。

### 陷阱 3：用 `none` 来"删除工具"
如果你压根不想让模型见到工具，**直接把 `tools` 数组改成空**或不传，不要传 `tools` + `tool_choice: none`。后者只是临时禁用，模型还能看到工具描述（依然占 token 成本）。

### 陷阱 4：以为 `auto` 模式下模型一定会调工具
`auto` 是**自由选择**。如果模型判断不用调，它就只回文字。如果你的逻辑依赖"必有 tool call"，用 `any` 或具名。

## 用你的日常经验类比

你用 Claude Code 时：
- 平常它自己判断要不要 grep、要不要 read —— 那是 `auto`
- 你说"必须用 Plan mode" —— 类似强制走某种工作流
- 你在 hooks 里限制工具调用 —— 类似 `none` 或更细粒度的工具白名单

## 自检 3 题

**Q1**: 你设计一个客户支持 agent，希望每次收到用户消息都至少触发一个动作（不允许干聊）。最合适的 `tool_choice` 是？
- A. `auto`
- B. `any`
- C. `tool` with specific name
- D. `none`

<details>
<summary>答案</summary>
**B**。`any` 强制必须调用某个工具，但模型自己选哪个 —— 正好匹配"必须有动作但不指定动作"的需求。
</details>

---

**Q2**: 一个多阶段 pipeline 中，第二阶段必须调用 `validate_input` 工具进行验证。最合适的 `tool_choice` 配置是？
- A. `{"type": "auto"}`
- B. `{"type": "any"}`
- C. `{"type": "tool", "name": "validate_input"}`
- D. 移除其他所有工具，只留 `validate_input`

<details>
<summary>答案</summary>
**C**。明确指定具体工具，这是 workflow 已知下一步时的标准做法。D 也能强制效果但不优雅 —— 移除工具会丢失上下文信息且每次都要重构请求。
</details>

---

**Q3**: 开发者发现模型在一个本应调用 `search` 的场景下，只输出了文字回答。最可能的根因是？
- A. `tool_choice` 设成了 `none`
- B. `tool_choice` 没设，默认 `auto`，模型判断不需要调工具
- C. `tools` 数组里有 `search` 工具但 schema 描述不清晰，模型不知道何时调
- D. B 和 C 都可能

<details>
<summary>答案</summary>
**D**。这种考"诊断根因"的题在考试里很常见。`auto` 下模型自由决定，**但它是否选对工具，强依赖工具描述质量**（这是 Domain 3 的重点）。
</details>

## 决策树速记

```
要不要给模型自由度？
├─ 要 → auto（默认）
└─ 不要 → 强制调用
    ├─ 必须调某个具体工具 → tool (named)
    ├─ 必须调一个工具但模型选 → any
    └─ 不能调工具 → none（且考虑直接不传 tools）
```

## 一句话总结

> **`tool_choice` 四模式 = 谁来决定调不调、调哪个：auto 模型决定 / any 必调随便选 / tool 必调指定 / none 不准调**

---

下一节：[1.3 - 结构化输出 vs Tool Use](./03-structured-output.md)
