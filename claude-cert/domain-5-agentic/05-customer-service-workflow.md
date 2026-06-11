# Domain 5.5 — 客服 / 工作流 Agent 设计

> 客服是考试**六大 scenario** 之一（每场考 4 个），必考。这一节讲生产级 agent 工作流的标准模式。

## 核心概念

**客服 agent 不是"会聊天的 chatbot"**。它是个组合体：

```
Agent = 对话能力 + 工具调用 + 业务规则 + 升级机制 + 审计日志
```

每个环节都不能少。

## 客服 agent 必备能力

### 1. 意图识别 + Routing
用户问什么类型（退款/技术/咨询/投诉），不同类别走不同处理。

### 2. 工具调用
查订单、改信息、退款、创建工单等。

### 3. 知识库引用
FAQ、政策、产品信息作为 resource 注入。

### 4. 升级（Escalation）机制
判断什么时候必须转人工。

### 5. 状态保持
用户多轮对话中，记住关键信息（已查的订单、已确认的金额）。

### 6. 审计与合规
所有动作记录，敏感操作需双重确认。

## 升级（Escalation）的核心规则

**什么时候必须升级**：

### 规则 1：用户明确要求人工
"我要找真人"、"我要投诉到主管"
**例外**：如果是简单问题立刻能解决，可以问"我能现在帮你解决 X，是否需要"

### 规则 2：需要 agent 没有的权限
- 大额退款（超阈值）
- 政策例外
- 法律相关决定

### 规则 3：用户激烈情绪持续上升
重复表达不满 → 升级，不要继续 agent 处理

### 规则 4：Agent 无法判断
工具返回 uncertain、信息冲突、用户描述模糊到无法决策

### 规则 5：高风险操作
- 涉及金额大
- 涉及法律条款
- 涉及健康/医疗

## Escalation 的正确做法

### 错误做法
```
"我无法处理这个，请联系客服。"
```
（用户："我就是在联系客服啊！")

### 正确做法
**结构化交接**：

```json
{
  "customer_id": "C12345",
  "issue_type": "refund_dispute",
  "root_cause": "用户认为产品质量不符描述",
  "actions_already_taken": [
    "查询订单 #5678，已发货 7 天",
    "查询退货政策，30 天内可退",
    "用户拒绝部分退款方案"
  ],
  "relevant_records": ["order_5678", "support_ticket_999"],
  "recommended_next_action": "升级给售后主管，建议批准全额退款 + 安抚",
  "urgency": "medium",
  "agent_confidence": "high"
}
```

**好处**：
- 接手的人**3 秒了解全貌**
- 不用再问用户重复信息
- 保留 audit trail

## 三层防御（Defense in Depth）

生产级 agent 的安全模型：

```
Layer 1：Prompt（引导）
  → "退款上限 $500，超过要升级"
  作用：bias 模型行为，让"按规矩做"是默认选项

Layer 2：Tool 实现（强制）
  → refund 工具内部校验金额，超过 $500 直接拒绝
  作用：硬约束。无论 prompt 怎么被绕过，工具层不让过

Layer 3：Audit Log（监控）
  → 所有 refund 调用记录到日志
  作用：万一有漏洞，事后能发现并修复
```

**三层缺一不可**。考试很爱考"只靠 prompt 行不行" → 答案永远是"不行，需要 tool 层强制"。

## 敏感操作的 Preview-Confirm 模式

回顾 Domain 3.1 讲过的 preview-token-execute：

```
用户："退我 100 美元"
Agent:
  → preview_refund(order, 100) → {preview: "...", token: "abc"}
  → 展示 preview 给用户确认
  → 用户确认
  → execute_refund(token="abc")  ← 一次性 token 验证
```

**核心**：
- 高额操作必须用户**显式确认**
- Token 一次性 + 服务端验证
- 不要相信 prompt 控制就够了

## 优雅降级

当 agent 不能完成全部任务，**部分成功也要清晰沟通**：

❌ 不好：
```
"出错了"
```

✅ 好：
```
"已完成的事：
1. ✓ 查到订单 #5678
2. ✓ 确认在退货政策内

无法完成：
- 退款金额超过我的权限上限
  下一步：我已经把这个工单转给售后主管 [ticket #999]，他们会在 4 小时内联系您
"
```

**用户知道**：
- 哪些做成了
- 哪些没做
- 接下来谁负责
- 多久能解决

## 不要做的事

### 1. 升级时不交接 context
"请联系人工" 不带任何信息 → 用户重复一遍 → 体验差。
**正解**：结构化交接（如上）。

### 2. 高额操作只靠 prompt 限制
"NEVER refund more than $500" → 容易被绕过。
**正解**：tool 实现内校验。

### 3. 用户表达不满还继续 agent 处理
用户："你不懂！我要主管！"
**继续 agent**：让用户更愤怒
**正解**：立即升级，结构化交接。

### 4. 重复要求用户确认
"删除？""是""真的删除？""是""确认删除？""我吐了"
**正解**：首次确认，后续同类操作不重复。

### 5. Agent 自己 "假装"做了事
工具调用失败，agent 回："已经处理了"。
**正解**：诚实告知失败，给下一步。

## 一个完整场景

**用户**："你们卖的耳机一周就坏了，我要退款。"

### Agent 工作流：

**Step 1：意图识别**
→ Intent: refund_request

**Step 2：查询订单**
→ search_orders(user_id) → 找到 order_5678
→ 查询：购买 6 天前，耳机型号 X

**Step 3：查询政策**
→ Resource: 退货政策（已在 context）
→ 政策：7 天内质量问题可全额退

**Step 4：判断**
→ 6 天 < 7 天，符合
→ 金额 $89 < $500 阈值，agent 权限内

**Step 5：Preview + Confirm**
→ preview_refund(order_5678, 89) → "将退款 $89 到您原支付方式，3-5 工作日到账"
→ 用户："好"

**Step 6：Execute**
→ execute_refund(token) → ✓ 成功
→ Notify: 退款受理 SMS

**Step 7：Audit + 关闭**
→ Log: refund processed, agent_id, timestamp, amount
→ "已为您办理退款，3-5 个工作日到账。还有什么需要吗？"

## 用你的日常经验类比

你 `dispatch-agent` 项目就是这种 workflow agent。意图识别 → 路由 → 调对应工具 → 状态保持 → 必要时升级。这个 pattern 跨场景通用。

## 自检 3 题

**Q1**: 一个客服 agent 收到 "我要找你们老板！" 这类升级请求。最优处理？
- A. 继续按流程处理用户原问题
- B. 直接转人工，不带任何 context
- C. 结构化交接：customer_id + issue + 已采取的行动 + 推荐下一步，转给人工
- D. 让用户重新描述问题

<details>
<summary>答案</summary>
**C**。Escalation 的核心是结构化交接，让接手的人立刻有 context。
</details>

---

**Q2**: 一个退款工具的安全设计：开发者只在 prompt 里写"上限 $500"。是否充分？
- A. 充分，模型会遵守 prompt
- B. 不充分。必须在 tool 实现内强制校验金额。Prompt 是软引导，tool 是硬约束
- C. 取决于模型
- D. 加更多 IMPORTANT 就行

<details>
<summary>答案</summary>
**B**。三层防御原则：prompt + tool + audit。硬约束放代码。
</details>

---

**Q3**: 一个 agent 完成了 3 个操作中的 2 个，第 3 个因权限不足失败。最佳响应？
- A. "出错了，请重试"
- B. 列出已完成的、未完成的、原因、下一步建议（结构化降级）
- C. 重试到成功为止
- D. 隐藏失败只报告成功

<details>
<summary>答案</summary>
**B**。优雅降级 + 诚实沟通是生产 agent 的基本要求。
</details>

## 一句话总结

> **客服 agent = 意图识别 + 工具调用 + 知识库 + Escalation + 审计。三层防御（prompt+tool+audit）。Escalation 必须结构化交接。失败要诚实降级。**

---

[← Domain 5 目录](./README.md) · 下一 Domain：[Domain 6 - Context 管理与可靠性](../domain-6-context/01-context-management-strategies.md)
