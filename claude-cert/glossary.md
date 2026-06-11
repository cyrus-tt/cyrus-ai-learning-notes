# CCA-F 中英术语对照表

> 考试是英文的，记住英文术语关键。按 Domain 分组。

## Domain 1：API 基础

| 英文术语 | 中文 | 一句话解释 |
|---------|------|-----------|
| Messages API | 消息接口 | Claude 主对话接口，无状态 |
| Stateless | 无状态 | 每次请求独立，服务端不存历史 |
| `system` parameter | 系统参数 | 顶层字段，存 system prompt |
| `messages` array | 消息数组 | 对话历史，每次必须全发 |
| `tool_choice: auto` | 工具选择：自动 | 模型自己决定要不要调用 |
| `tool_choice: any` | 工具选择：强制 | 必须调用某个工具 |
| `tool_choice: tool` | 工具选择：指定 | 必须调用某个具体工具 |
| `tool_choice: none` | 工具选择：禁用 | 不允许调用工具 |
| Structured Output | 结构化输出 | 模型按 schema 返回数据 |
| Schema-backed Output | 基于 schema 的输出 | 比纯文本 JSON 更可靠 |
| Tool Use | 工具调用 | 模型通过工具 schema 输出结构化结果 |
| Attention Boundary | 注意力边界 | 上下文太长，模型注意力衰减 |
| Tool Schema | 工具 schema | 工具的接口定义（名字、参数、描述） |
| Tool Call | 工具调用 | 模型决定要执行一个工具的输出 |
| Pipeline / Workflow | 流水线 / 工作流 | 固定顺序的多阶段处理流程 |
| Agent | 智能体 | 能感知、决策、执行动作的 AI 系统 |
| Context Window | 上下文窗口 | 模型一次能装下的最大 token 数 |
| Lost in the Middle | 中间丢失 | 长 context 中间内容易被忽略 |
| Hallucination | 幻觉 | 模型编造不存在的信息 |
| Grammar-based Decoding | 语法约束解码 | schema 在采样阶段硬约束 |

## Domain 2：提示工程

| 英文术语 | 中文 | 一句话解释 |
|---------|------|-----------|
| System Prompt | 系统提示 | 定义角色、风格、约束 |
| Few-shot | 少样本 | 在 prompt 里给几个示例 |
| XML Tags | XML 标签 | 用 `<role>`、`<style>` 等结构化 prompt |
| Prompt Injection | 提示词注入 | 用户输入诱导模型偏离指令 |
| Reasoning Field | 推理字段 | few-shot 里写决策过程 |
| Source Grounding | 来源锚定 | 提取数据带 source 引用 |
| Provenance | 出处 | 信息来源追溯 |
| Escape Hatch | 逃生舱 | 枚举加 "other" + detail |
| Nullable | 可为空 | 字段允许 null（数据缺失场景） |
| Semantic Validation | 语义验证 | 检查内容逻辑（不只是格式） |
| Confidence Calibration | 置信度校准 | 让 confidence 数值反映真实准确率 |

## Domain 3：工具与 MCP

| 英文术语 | 中文 | 一句话解释 |
|---------|------|-----------|
| MCP (Model Context Protocol) | 模型上下文协议 | AI 接外部系统的开放标准 |
| Tools | 工具 | 让模型做动作（动词） |
| Resources | 资源 | 给模型提供上下文（名词） |
| Prompts | 提示模板 | 可复用工作流 |
| Annotations | 注解 | hint 不是 enforcement |
| `readOnlyHint` | 只读提示 | 工具不会改状态（hint） |
| `destructiveHint` | 破坏性提示 | 工具有破坏性（hint） |
| `idempotentHint` | 幂等提示 | 重复调用结果相同 |
| Idempotency Key | 幂等键 | 重复调用不会重复执行 |
| Lookup-then-Act | 先查后做 | 模糊请求先精确查询再操作 |
| Preview-Token-Execute | 预览-令牌-执行 | 不可逆操作两步确认 |
| Transient Error | 瞬态错误 | 网络/超时，工具内重试 |
| Validation Error | 验证错误 | 参数错，模型修正后重试 |
| Business Rule Error | 业务规则错误 | 规则不允许，不重试 |
| Permission Error | 权限错误 | 升级授权，不重试 |
| Uncertain Write State | 写入状态不确定 | 绝不自动重试 |
| Routing | 路由 | 按意图分发到不同处理器 |
| Tool Search | 工具搜索 | meta-tool 让模型按需发现工具 |
| Project / Local / User Scope | 项目/本地/用户作用域 | MCP 配置三层 |

## Domain 4：Claude Code

| 英文术语 | 中文 | 一句话解释 |
|---------|------|-----------|
| Plan Mode | 计划模式 | 只读探索 + 出方案 + 等审批 |
| Direct Execution | 直接执行 | 不审批直接做 |
| Extended Thinking | 扩展思考 | 模型推理深度增强 |
| Session | 会话 | 单次对话的 transcript |
| `--continue` | 继续 | 接最近一次 session |
| `--resume` | 恢复 | 手选具体 session |
| `--fork-session` | 分叉 | 复制 session 再操作 |
| CLAUDE.md | 项目记忆文件 | 自动加载的规则文件 |
| User / Project / Subdirectory CLAUDE.md | 用户/项目/子目录层级 | 三层加载 |
| `@import` | 导入 | CLAUDE.md 引用其他文件 |
| `/memory` | 记忆命令 | 看加载了哪些 CLAUDE.md |
| Hooks | 钩子 | harness 强制执行的脚本 |
| `PreToolUse` | 工具前钩子 | 唯一能阻止工具调用的机制 |
| `PostToolUse` | 工具后钩子 | 副作用、日志 |
| `UserPromptSubmit` | 用户提交钩子 | 注入上下文 |
| `SessionStart` | 会话启动钩子 | 初始化环境 |
| Subagent | 子智能体 | 独立 context 的委派 |
| `Task` tool | 任务工具 | 委派 subagent 的工具 |
| `allowedTools` | 允许工具列表 | 限制 agent 工具范围 |

## Domain 5：Agentic 架构

| 英文术语 | 中文 | 一句话解释 |
|---------|------|-----------|
| Agent Loop | 智能体循环 | observe → reason → act 循环 |
| Prompt Chaining | 提示链 | 固定步骤线性工作流 |
| Routing | 路由分发 | 先分类再处理 |
| Orchestrator-Workers | 编排器-工作者 | 中心调度子任务 |
| Dynamic Decomposition | 动态分解 | 发现驱动的探索 |
| Parallel Subagents | 并行子智能体 | 独立任务并行 |
| Map-Reduce | 映射-归约 | 经典并行模式 |
| Fan-out / Synthesis | 扇出 / 综合 | 多源调研后综合 |
| Speculative Parallel | 推测并行 | 同时尝试多方案选最优 |
| Escalation | 升级 | 转交人工 |
| Defense in Depth | 纵深防御 | prompt + tool + audit 三层 |
| Claim-Source Index | 事实-来源索引 | 每条信息映射到来源 |
| Established / Contested / Insufficient | 确认/有争议/不足 | claim 的状态标注 |
| Audit Log | 审计日志 | 所有动作的记录 |
| Graceful Degradation | 优雅降级 | 部分失败时清晰沟通 |

## Domain 6：Context 管理与可靠性

| 英文术语 | 中文 | 一句话解释 |
|---------|------|-----------|
| Sliding Window | 滑动窗口 | 只保留最近 N 轮 |
| Progressive Summarization | 渐进式摘要 | 早期对话结构化压缩 |
| Structured State | 结构化状态 | JSON 形式的当前状态 |
| Persistent Reference | 持久引用 | 永不压缩的关键信息 |
| Retrieval | 检索 | 按需获取大量信息 |
| Tool Result Compression | 工具结果压缩 | 工具返回精简后保留 |
| Batch API / Message Batches | 批处理接口 | 异步、50% 折扣、24h 窗口 |
| `custom_id` | 自定义 ID | batch 结果匹配用 |
| Chunking | 分块 | 长文档拆小段处理 |
| Segment Evaluation | 分段评估 | 按维度细分准确率 |
| Stable / Mutating Eval Set | 稳定/动态评估集 | 长期基准 + 反映最新 |
| Dismissal | 拒绝 | 人工复核被拒（信号） |
| Regression | 回归 | 改进某处反而让别处变差 |
