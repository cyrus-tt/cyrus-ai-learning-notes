export async function onRequestPost(context) {
  const { request, env } = context;

  // Parse request
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return new Response(JSON.stringify({ error: "No messages provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limiting: simple in-memory check (resets per worker instance)
  // For production, use D1 or KV for persistent rate limiting

  // Load knowledge base
  let knowledge;
  try {
    const knowledgeUrl = new URL("/data/knowledge.json", request.url);
    const knowledgeRes = await fetch(knowledgeUrl.toString());
    knowledge = await knowledgeRes.json();
  } catch {
    knowledge = { persona: {}, articles: [], til: [], services: {} };
  }

  // Build context from knowledge base
  const persona = knowledge.persona || {};
  const articles = (knowledge.articles || [])
    .map((a) => `【${a.title}】${a.summary}\n${(a.content || "").slice(0, 800)}`)
    .join("\n\n");
  const tilEntries = (knowledge.til || [])
    .map((t) => `【TIL: ${t.title}】${t.body}`)
    .join("\n\n");
  const services = knowledge.services || {};

  const systemPrompt = `你是 Cyrus 的 AI 数字分身。你需要以 Cyrus 的身份和视角回答问题。

## 关于你（Cyrus）
- 身份：${persona.tagline || "AI 全栈实践者"}
- 背景：${persona.background || "非技术背景出身，靠好奇心走进 AI 世界"}
- 项目经验：${(persona.projects || []).join("、")}
- 社交：小红书 @Cyrus 宇，GitHub: cyrus-tt

## 你的说话风格
- 中文为主，技术术语用英文
- 语气直接、有观点，像朋友聊天而不是客服
- 用具体例子和数据说话，不说空话
- 可以说"我不确定"或"这个我没研究过"
- 适当用比喻，让复杂技术变得好理解

## 你的核心观点
- AI 是工具，不是目的。关键是解决真实问题
- 非技术背景反而是优势——因为更懂业务场景
- 动手做比看文章有用 10 倍
- 信息不等于行动力，只有可执行的信息才有价值

## 你的知识库

### 教程和文章
${articles}

### TIL（Today I Learned）
${tilEntries}

### 服务
${services.description || "AI 自动化顾问"}
联系：${services.contact || "cyrusttyj2@gmail.com"}

## 回答规则
1. 如果问题与你的知识库内容相关，优先从知识库中找答案并引用
2. 如果知识库里没有，用你的 AI 实践经验来回答
3. 不要编造你没做过的项目或经历
4. 可以推荐你的教程文章（给出链接路径如 /field-notes/xxx/）
5. 保持简洁，每次回答控制在 200 字以内，除非用户要求详细展开
6. 用中文回答，除非用户用英文提问`;

  // Prepare messages for LLM
  const llmMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 1000),
    })),
  ];

  // Check if Workers AI binding exists
  if (!env.AI) {
    // Fallback: return a static response when AI binding is not configured
    const fallbackResponse = JSON.stringify({
      response: "AI 功能正在配置中，请稍后再试。你可以先浏览网站上的教程和资讯内容。",
      fallback: true,
    });
    return new Response(fallbackResponse, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    // Call Workers AI with streaming
    const aiResponse = await env.AI.run(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      {
        messages: llmMessages,
        stream: true,
        max_tokens: 512,
      }
    );

    // Return streaming response
    return new Response(aiResponse, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "AI inference failed", detail: String(err) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
