# Claude Certified Architect (CCA-F) 中文备考指南

> 中文互联网第一份系统化的 CCA-F 备考资料。从零搭建知识体系，配英文术语对照，覆盖 6 大考试 domain。

## 考试速览

| 项目 | 详情 |
|------|------|
| 全称 | Claude Certified Architect – Foundations |
| 简称 | CCA-F |
| 题量 | 60 道场景选择题（每题 1 正 3 误） |
| 时长 | 120 分钟 |
| 及格 | 720 / 1000 |
| 价格 | Partner Network 免费 / 非 Partner $99 |
| 证书有效期 | 6 个月 |
| 推出时间 | 2026-03-12 |

## 6 大 Domain 权重

| Domain | 权重 | 中文名 |
|--------|------|--------|
| Agentic Architecture & Orchestration | **27%** | 智能体架构与编排 |
| Claude Code Configuration & Workflows | 20% | Claude Code 配置与工作流 |
| Prompt Engineering & Structured Output | 20% | 提示工程与结构化输出 |
| Tool Design & MCP Integration | 18% | 工具设计与 MCP 集成 |
| Context Management & Reliability | 15% | 上下文管理与可靠性 |
| (API Fundamentals 散布在以上各 domain) | — | API 基础 |

## 学习路径

按"打地基→主力 domain→进阶话题"顺序：

### Domain 1 - API 基础（4 节）
- [1.1 Messages API 是无状态的](./domain-1-api/01-stateless-api.md)
- [1.2 tool_choice 的四种模式](./domain-1-api/02-tool-choice.md)
- [1.3 结构化输出 vs Tool Use vs 纯文本 JSON](./domain-1-api/03-structured-output.md)
- [1.4 上下文容量 ≠ 模型注意力](./domain-1-api/04-attention-boundary.md)

### Domain 2 - 提示工程 20%（4 节）
- [2.1 System Prompt 设计与 XML 标签](./domain-2-prompting/01-system-prompt-design.md)
- [2.2 Few-shot 示例的威力](./domain-2-prompting/02-few-shot.md)
- [2.3 结构化输出的实战策略](./domain-2-prompting/03-structured-output-strategy.md)
- [2.4 澄清问题与对话行为](./domain-2-prompting/04-clarifying-questions.md)

### Domain 3 - 工具设计与 MCP 18%（4 节）
- [3.1 Tool 接口设计原则](./domain-3-tools-mcp/01-tool-interface-design.md)
- [3.2 MCP 三大构建块](./domain-3-tools-mcp/02-mcp-building-blocks.md)
- [3.3 工具错误处理的五类分类](./domain-3-tools-mcp/03-error-handling.md)
- [3.4 MCP Scopes 与生产实践](./domain-3-tools-mcp/04-mcp-scopes-production.md)

### Domain 4 - Claude Code 工作流 20%（4 节）
- [4.1 Plan Mode vs Direct Execution](./domain-4-claude-code/01-plan-mode-vs-execution.md)
- [4.2 Session 管理（continue/resume/fork）](./domain-4-claude-code/02-session-management.md)
- [4.3 CLAUDE.md 层级与 Memory 系统](./domain-4-claude-code/03-claude-md-memory.md)
- [4.4 Hooks 与 Subagents](./domain-4-claude-code/04-hooks-subagents.md)

### Domain 5 - Agentic 架构 27%（最大权重，5 节）
- [5.1 Agent Loop 与五种 Agentic 模式](./domain-5-agentic/01-agent-loop-patterns.md)
- [5.2 Subagent 委派的核心原则](./domain-5-agentic/02-subagent-delegation.md)
- [5.3 并行编排与结果汇总](./domain-5-agentic/03-parallel-orchestration.md)
- [5.4 Research / Synthesis 模式与 Provenance](./domain-5-agentic/04-research-synthesis.md)
- [5.5 客服 / 工作流 Agent 设计](./domain-5-agentic/05-customer-service-workflow.md)

### Domain 6 - Context 管理与可靠性 15%（4 节）
- [6.1 Context 管理的六大策略](./domain-6-context/01-context-management-strategies.md)
- [6.2 Batch API 与成本/延迟优化](./domain-6-context/02-batch-cost-latency.md)
- [6.3 数据提取的语义验证与重试](./domain-6-context/03-data-extraction-validation.md)
- [6.4 评估、迭代与生产部署](./domain-6-context/04-evaluation-iteration.md)

### 练习
- [练习题集与学习节奏](./practice/README.md)
- [中英术语对照表](./glossary.md)

## 学习方法

- 每个 domain 拆成多节，每节配：核心概念 + 为什么重要 + 英文术语 + 实例 + 常见陷阱 + 自检题
- 用 Claude Code 日常经验做类比锚定
- 每节学完做 3-5 道对应练习题
- 全部 domain 过完后做模拟考（限时 120 分钟）

## 文件组织

```
claude-cert/
├── README.md           # 本文件
├── glossary.md         # 中英术语对照表（动态积累）
├── domain-1-api/       # API 基础
├── domain-2-prompting/ # 提示工程
├── domain-3-tools-mcp/ # 工具与 MCP
├── domain-4-claude-code/ # Claude Code
├── domain-5-agentic/   # Agentic 架构
├── domain-6-context/   # Context 管理
└── practice/           # 练习题与模拟考
```

## 资源引用

- 官方课程：[Anthropic Academy](https://anthropic.skilljar.com/)
- 英文 study guide：[daronyondem/claude-architect-exam-guide](https://github.com/daronyondem/claude-architect-exam-guide)
- 免费练习题：[CertStud 300+](https://certstud.com/certifications/anthropic/claude-architect)
- 模拟题库：[OlivierAlter 77 题](https://github.com/OlivierAlter/Claude-Certified-Architect-Foundations-Certification-Exam)
