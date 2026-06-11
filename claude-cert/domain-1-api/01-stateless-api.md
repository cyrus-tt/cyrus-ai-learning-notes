# Domain 1.1 — Messages API 是无状态的

> 这是整个考试最底层的概念。**理解了这个，后面 80% 的"坑题"你都能识别出来。**

## 核心概念

**Claude 的 Messages API 是 stateless（无状态）的**：

> Claude 的服务端**完全不记得**你上一次跟它说过什么。
> 每次发请求，模型看到的**只有这次请求里包含的内容**。

## 为什么这个概念这么重要？

很多人用 ChatGPT 用惯了，会下意识以为"AI 有记忆"。这是错觉。

**真相是**：
- 你在 Claude.ai 网页上聊天看起来像有记忆 → 那是**前端帮你把历史消息全部重发**了
- API 调用同理：你想让 Claude 记得之前的对话，必须**自己在 `messages` 数组里把全部历史都塞进去**

这就引出三个直接后果：

1. **Token 成本随对话变长** — 对话越长，每次请求要发的 token 越多
2. **延迟也变长** — 模型要处理的输入更多
3. **没有所谓的 "session_id 让 Claude 记住"** — 你看到的任何 session 概念，都是你的应用层在做事

## 一个最简单的 API 请求长啥样

```json
{
  "model": "claude-opus-4-7",
  "max_tokens": 1024,
  "system": "你是一个简洁的助手。",
  "messages": [
    {"role": "user", "content": "你好"}
  ]
}
```

**关键点**：
- `system` 是**顶层字段**，不在 `messages` 里面
- `messages` 是数组，按时间顺序排
- 每次请求，**整个 messages 数组都要重新发**

## 多轮对话长啥样

```json
{
  "model": "claude-opus-4-7",
  "system": "你是一个简洁的助手。",
  "messages": [
    {"role": "user", "content": "你好"},
    {"role": "assistant", "content": "你好！有什么可以帮你？"},
    {"role": "user", "content": "刚才我说了什么？"}
  ]
}
```

这次请求里，Claude 能看到你之前说过"你好"，**仅仅因为你在 messages 里把它发过来了**。如果你不发，Claude 完全不知道。

## 考试常见陷阱

考试题经常用这些陷阱测你懂不懂"无状态"：

### 陷阱 1：把 system prompt 放到 messages 里
❌ 错误：
```json
{
  "messages": [
    {"role": "system", "content": "你是助手"},   // 错！
    {"role": "user", "content": "你好"}
  ]
}
```
✅ 正确：`system` 是**顶层参数**，不是 message role。

### 陷阱 2：以为 session_id 让 Claude 记住
题目可能问："如何让 Claude 在多轮对话中记住用户偏好？"
错误选项会写：「传一个 session_id 让 Claude 关联会话」
**正确答案**永远是：「在 messages 里包含完整对话历史」或「把偏好编码进 system prompt」。

### 陷阱 3：以为长对话不需要管 token 成本
题目可能描述一个"对话已经进行了 50 轮，每次都很慢"的场景。
错误的做法是"增加超时时间"或"换模型"。
正确做法是**摘要压缩历史消息**（这是 Domain 6 的内容）。

## 用你的日常经验类比

你天天用 Claude Code，每次进项目 Claude 自动读 `CLAUDE.md` —— 这不是"Claude 记得你的项目"，而是 **Claude Code 这个客户端每次都把 CLAUDE.md 内容发进 system prompt**。

这就是「无状态 API + 客户端做记忆」的最好例子。

## 自检 3 题

**Q1**: 在 Claude Messages API 中，system prompt 应该放在哪里？
- A. `messages` 数组的第一个元素，role 为 `system`
- B. 请求的顶层 `system` 参数
- C. `messages` 数组的最后一个元素
- D. `metadata` 字段中

<details>
<summary>答案</summary>
**B**。system 是顶层参数，不在 messages 数组里。这是最常考的基础题。
</details>

---

**Q2**: 一个应用让用户和 Claude 进行了 10 轮对话。第 11 次请求时，开发者只在 messages 里发了第 11 轮的用户消息。Claude 的行为是？
- A. Claude 会自动加载前 10 轮的历史
- B. Claude 只看得到第 11 轮的内容，完全不知道之前发生了什么
- C. Claude 会要求开发者补全历史
- D. Claude 会通过 session_id 查找历史

<details>
<summary>答案</summary>
**B**。无状态 API 不存任何历史，没发就是没有。这考的就是对 stateless 的理解。
</details>

---

**Q3**: 一个多轮对话应用，每次请求的延迟越来越高，token 成本也越来越贵。最合理的根因是？
- A. Claude 模型本身在变慢
- B. 对话历史在 messages 中累积，每次都要发送和处理全部历史
- C. API 限流
- D. 需要切换到更小的模型

<details>
<summary>答案</summary>
**B**。每次都重发全部历史 = 输入 token 线性增长 = 成本和延迟都涨。解决方案：摘要压缩或滑动窗口（Domain 6）。
</details>

## 一句话总结

> **Messages API 无状态 = 模型只看本次请求 = 历史和系统提示都得你每次主动塞进去**

---

下一节：[1.2 - tool_choice 的四种模式](./02-tool-choice.md)
