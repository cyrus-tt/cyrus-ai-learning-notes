# Domain 2.1 — System Prompt 设计与 XML 标签

> System prompt 是模型的"持久人格"。考试会大量考"如何写一个好 system prompt"的判断题。

## 核心概念

**System prompt 三个关键事实**：

1. 它在**每次请求都被完整发送**（API 无状态，前面讲过）
2. 它定义**角色、风格、约束、优先级**
3. 它对模型的**软引导**，**不是硬规则**

**重要心法**：
> **能用代码强制的事，不要靠 prompt 引导。**

权限、合规、阈值这些**硬约束**必须放代码里（hooks、tool 实现、应用层）。Prompt 只负责"模型的判断偏向"。

## 好的 System Prompt 结构

用 **XML 标签**分段，让模型清晰看到结构：

```xml
<role>
你是一名资深 Python 工程师，帮用户调试代码。
</role>

<style>
- 简洁直接，先给结论再给原因
- 代码用 markdown 包裹
- 不解释基础语法，假设用户有经验
</style>

<safety>
- 不要执行 rm -rf 或修改系统文件
- 涉及生产环境时，提醒用户备份
</safety>

<examples>
<example>
User: 这段代码报错 TypeError
Assistant: 第 5 行 `x + "1"` 类型不匹配。改成 `x + 1` 或 `str(x) + "1"`。
</example>
</examples>
```

**为什么用 XML**：
- 模型对 XML 标签结构理解很好（训练数据里大量 XML）
- 比"重要的事说三遍"更可靠
- 调试时容易看清哪段没起作用

## 关键设计原则

### 原则 1：用"原则"而不是"条件列表"
❌ 不好：
```
- 如果用户说"代码"，回 Python
- 如果用户说"网页"，回 HTML
- 如果用户说"快速"，简短回答
- 如果用户说"详细"，长回答
... (列 50 条)
```

✅ 好：
```
风格原则：根据问题复杂度调整回答深度。简单问题简短直答，复杂问题分点解释。
```

**为什么**：模型擅长理解原则并泛化，不擅长记忆 50 条规则。规则越多，模型越容易"漏看"某条。

### 原则 2：Few-shot 示例 > 长篇大论
表达微妙差别（如"专家级回答"vs"小白级回答"）时，**给 2-3 个示例比写 500 字描述有效得多**。

### 原则 3：安全条件用显式 if-then
**唯一例外**：安全/合规相关的硬触发，要写成明确的条件式。
```
<safety>
如果用户请求涉及 PII（身份证、电话、地址），拒绝并提示用户隐去。
如果用户请求生成代码会执行系统级命令（rm, sudo, format），必须先警告。
</safety>
```

### 原则 4：长 session 要在节点重复关键规则
对话越长，system prompt 的影响越弱（attention 衰减）。
**做法**：在长 session 中每 N 轮，由应用层在用户消息前注入一条"提醒"。

### 原则 5：长期项目版本化 system prompt
线上 prompt 改了一版后，老 session 还用老 prompt。
**做法**：prompt 加版本号、记录变更，方便回溯问题。

## 不要做的事

### 1. 用 "IMPORTANT" / "NEVER" / 大写吼模型
```
IMPORTANT!! NEVER GIVE FINANCIAL ADVICE !!! THIS IS CRITICAL !!!
```
**没用**。模型不是被吼大的。该写代码强制就写代码，该 few-shot 就给例子。

### 2. 把工作流细节塞 global system prompt
```
<workflow>
步骤 1: 先用 grep...
步骤 2: 然后 read...
步骤 3: 接下来 edit...
</workflow>
```
**问题**：这是任务级 workflow，不是全局规则。塞 system prompt 会污染所有任务。
**正确**：放在 slash command / skill / 任务级指令里。

### 3. 把硬规则放 prompt 当安全网
```
你不能给超过 $500 的退款。
```
模型会被 prompt injection 绕过。**硬规则必须在 tool 实现里 enforce**。

### 4. 把所有可能场景列举式描述
长 prompt = 注意力分散。挑最关键的，其他靠原则泛化。

## 用你的日常经验类比

你 `~/.claude/CLAUDE.md` 写的全局规则就是 system prompt。看看你的规则结构 —— 大部分是**原则**（"探索用 subagent"、"主 session 只收结论"），不是**条件列表**。这就是好的 system prompt 设计。

## 自检 3 题

**Q1**: 一个开发团队在 system prompt 里反复用 `IMPORTANT: NEVER do X` 强调安全规则，但模型还是会被 prompt injection 绕过执行 X。最优解是？
- A. 改成全大写吼得更凶
- B. 加更多 IMPORTANT 标签
- C. 在 tool 实现层 enforce 这个规则，不再依赖 prompt
- D. 切换到更新的模型版本

<details>
<summary>答案</summary>
**C**。硬规则必须放代码。Prompt 只能"引导"，不能"强制"。这是考试核心心法。
</details>

---

**Q2**: 一个 system prompt 列了 50 条"如果...则..."规则，模型在长对话中经常漏看某些规则。最优化方向是？
- A. 重新整理规则的优先级，按重要性排序
- B. 把规则改成几条"原则"+ few-shot 示例，依赖模型泛化
- C. 把规则全部翻译成中文
- D. 增加规则数量到 100 条以提高覆盖

<details>
<summary>答案</summary>
**B**。原则化 + 例子化 > 长条件列表。这是 prompt 工程核心原则。
</details>

---

**Q3**: 一个长 session（200 轮对话）的助手，system prompt 中的"输出风格要简洁"在后期被完全忽略。最佳做法？
- A. 把"简洁"写在 system prompt 开头并加 IMPORTANT
- B. 在长 session 中定期由应用层注入风格提醒，或在关键节点重发 system prompt
- C. 调高 temperature
- D. 改成更短的 system prompt

<details>
<summary>答案</summary>
**B**。这考的是 attention 衰减 + 长 session 处理。定期复述关键约束是标准做法。
</details>

## 一句话总结

> **System prompt = 角色 + 风格 + 安全 + 例子（XML 分段）。原则化、给例子、硬规则进代码、长 session 复述。**

---

下一节：[2.2 - Few-shot 示例的威力](./02-few-shot.md)
