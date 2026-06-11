# CCA-F 练习题集

> 学完知识点要刷题。本目录索引外部题库 + 本地模拟卷。

## 学完每个 Domain 后做的事

每个 Domain 的章节里有 3 道自检题。**全部 25 章 × 3 题 = 75 道**自检题。

建议：
1. 学完一个 Domain，回头做该 Domain 全部自检题（限时 15 分钟）
2. 错的题 → 回头看对应章节
3. 全部 Domain 过完 → 做综合模拟（120 分钟，60 题）

## 外部免费题库

| 资源 | 题量 | 用法 |
|------|------|------|
| [CertStud 300+ 免费练习题](https://certstud.com/certifications/anthropic/claude-architect) | 300+ | 学完后大量刷题 |
| [ClaudeCertifications 25 题](https://claudecertifications.com/claude-certified-architect/practice-questions) | 25 | 摸底用 |
| [CertSafari 616 题](https://www.certsafari.com/anthropic/claude-certified-architect) | 616 | 后期冲刺 |
| [OlivierAlter GitHub 77 题](https://github.com/OlivierAlter/Claude-Certified-Architect-Foundations-Certification-Exam) | 77 | 场景题，质量高 |
| [Medium 60 题完整模拟](https://medium.com/@richardhightower/claude-certified-architect-practice-exam-60-questions-with-detailed-explanations-3a4d2267603d) | 60 | 一套完整模拟卷 |
| [paullarionov GitHub 60 题](https://github.com/paullarionov/claude-certified-architect/blob/main/guide_en.MD) | 60 | 中英文版 |

## 推荐学习节奏

### Week 1：Domain 1 + 2
- 学完 8 章
- 做 8 × 3 = 24 道自检
- 做 ClaudeCertifications 25 题摸底

### Week 2：Domain 3 + 4
- 学完 8 章
- 做 24 道自检
- 做 CertStud 100 道题

### Week 3：Domain 5（最大权重）
- 学完 5 章
- 做 15 道自检 + Domain 5 主题深刷（重点）
- 做 OlivierAlter 77 题（场景题）

### Week 4：Domain 6 + 冲刺
- 学完 4 章
- 全部自检题再回顾一遍错题
- 做 Medium 60 题完整模拟（限时 120 分钟）
- 做 CertSafari 题库直到 90%+ 准确率

### 考前 2 天
- 回顾自己的错题本
- 复盘 5 大 domain 的核心心法（每章末"一句话总结"）
- 不要再学新东西，保持手感

## 考试要点速记（一图流）

| 考点 | 核心心法 |
|------|---------|
| 责任归属 | 模型负责语言/判断，代码负责权限/合规/状态 |
| 输出可靠性 | Structured Output > Tool Use > Prompt JSON |
| 错误处理 | 五类错误五种恢复路径，uncertain_write 绝不重试 |
| Context 管理 | 容量 ≠ 注意力，组合策略而非单一 |
| Agentic 模式 | 五种模式按"任务能否预先规划"+"独立性"选 |
| Subagent | 不继承父对话，prompt 自包含，工具最小集 |
| 客服 escalation | 结构化交接，三层防御 |
| Batch API | 异步省钱，SLA 容忍才用，custom_id 匹配 |
| MCP | Tools/Resources/Prompts 用途不同；annotations 不是 security |
| Hooks | 唯一可靠的硬约束，prompt 只是引导 |

## 错题本模板

把错题按 domain 整理：

```
## Domain X 错题

### 题 N
- 题目：...
- 我选了：B（正确：C）
- 错因：把 ... 误以为 ...
- 涉及章节：domain-X/0Y-...
- 关键心法：...
```

考前重点过错题本。

---

[← 返回 CCA-F 备考总览](../README.md)
