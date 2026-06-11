# Domain 4.1 — Plan Mode vs Direct Execution

> Claude Code 有两种主要工作模式：plan mode（先计划）和 direct execution（直接做）。**选错模式 = 浪费时间或带来风险**。考试爱用场景题逼你选。

## 核心概念

**Plan Mode**：
- 只读模式（read-only），不会修改文件
- 探索代码、读文档、形成方案
- 输出一份**实施计划**给用户审核
- 用户批准后再进入执行模式

**Direct Execution**：
- 直接执行（grep、read、edit、bash 等）
- 不需要审批
- 快速、高效

## 什么时候用 Plan Mode

### 标志 1：影响范围大
- 跨多个文件的重构
- 改变项目结构
- 修改公共 API
- 删除/重命名核心模块

### 标志 2：不可逆操作多
- 数据迁移
- 删除大量文件
- 改动数据库 schema

### 标志 3：方案有多种选择
- "怎么实现 X" 有 3 种方案，需要先讨论
- 用户没明确说技术选型

### 标志 4：第一次进入陌生代码库
先用 plan mode 探索，理解结构后再动手。

### 标志 5：用户明确要求
"先做个 plan" / "先讨论方案"

## 什么时候直接做

### 标志 1：小修复、单文件
- typo
- 加一个 console.log
- 改一行配置

### 标志 2：任务非常明确
- "把这个函数重命名为 X"
- "在 utils 加一个工具函数"

### 标志 3：可逆且低风险
- 实验性改动（可以 git checkout 回滚）
- 草稿代码

## Plan Mode ≠ Extended Thinking

很多人混淆这两个概念：

| 概念 | 用途 | 触发方式 |
|------|------|---------|
| **Plan Mode** | **工作流**：先规划再行动 | 用户启用 / Claude 自主进入 |
| **Extended Thinking** | **推理深度**：模型多想几步 | API 参数 / 模型能力 |

- Plan mode 是流程门禁，决定"现在该做还是该计划"
- Extended thinking 是推理增强，决定"模型对单个问题想多深"

它们正交。你可以：
- Plan mode + extended thinking（大项目深度规划）
- Plan mode + 普通推理（中等规划）
- 直接执行 + extended thinking（复杂调试）
- 直接执行 + 普通推理（日常小事）

## 错误使用模式

### 错误 1：什么都进 plan mode
任务："把这个变量改名"
进 plan mode → 浪费时间在规划上。

### 错误 2：大改动不 plan
任务："重构整个认证系统"
直接动手 → 中途发现假设错了，已经改了 30 个文件。

### 错误 3：plan 完不审就执行
plan mode 的价值是**让用户审核方案**。Claude 自己确认自己的 plan 没意义。

## 实际工作流示范

### 小修复（直接做）
```
用户：把 README 里的 "anthopic" 改成 "anthropic"
Claude：
  → Grep "anthopic"
  → Edit 修正
  → 完成
```

### 大改动（plan mode）
```
用户：把现在的 REST API 改成 GraphQL
Claude：
  → 进入 plan mode（read-only）
  → Grep 所有 API endpoint
  → Read schema、controller、test
  → 生成 plan：
    - Phase 1: 引入 GraphQL server (3 文件)
    - Phase 2: 转换 endpoint A (5 文件)
    - Phase 3: 转换 endpoint B (...)
    - 风险点：客户端 SDK 也要改
  → 用户审 plan
  → 用户：「同意，先做 Phase 1」
  → Claude 退出 plan mode 开始执行 Phase 1
```

## 用你的日常经验类比

你 `~/.claude/CLAUDE.md` 里写了"大功能（3+ 步骤）先做 plan，用户批注确认后再写代码"—— 就是这个规则。Claude 应该遵循你的全局规则。

## 自检 3 题

**Q1**: 用户说："把这个项目的认证从 JWT 改成 OAuth"。Claude 应该？
- A. 直接 grep JWT 然后开始改
- B. 进 plan mode，先探索现有认证代码、设计迁移方案、列出风险，给用户审核
- C. 拒绝任务
- D. 创建新分支然后直接改

<details>
<summary>答案</summary>
**B**。大改动 + 跨多文件 + 不可逆性 = plan mode 标准场景。
</details>

---

**Q2**: 关于 Plan Mode 和 Extended Thinking 的关系，以下哪个正确？
- A. 它们是同一个东西的两个名字
- B. Plan Mode 是流程门禁（先规划再行动），Extended Thinking 是单次推理增强（多想几步），二者正交
- C. Extended Thinking 替代了 Plan Mode
- D. 只有大模型才有 Plan Mode

<details>
<summary>答案</summary>
**B**。这是考试经典混淆点。一个是 workflow gate，一个是 reasoning depth。
</details>

---

**Q3**: 一个开发者把每个任务都进 plan mode，包括"改一个 typo"。结果？
- A. 安全性最高
- B. 工作流过度繁琐，简单任务被规划开销拖累。Plan mode 应该按任务大小判断使用
- C. 正确，应该坚持
- D. 节省时间

<details>
<summary>答案</summary>
**B**。Plan mode 是工具，不是规则。小任务直接做更高效。
</details>

## 一句话总结

> **大、广、不可逆、多方案 → Plan Mode。小、明确、可逆 → 直接做。Plan Mode ≠ Extended Thinking（一个是流程，一个是推理）。**

---

下一节：[4.2 - Session 管理（continue/resume/fork）](./02-session-management.md)
