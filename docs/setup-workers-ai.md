# Workers AI 配置指南

## 启用 AI Binding

1. 登录 Cloudflare Dashboard
2. 进入 Pages 项目 → Settings → Functions
3. 在 "AI Bindings" 部分，点击 "Add binding"
4. Variable name: `AI`
5. 保存

## 测试

部署后，POST 请求到 `/api/chat`:

```bash
curl -X POST https://cyrustyj.xyz/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "你是谁？"}]}'
```

## 免费层限制

- Workers AI: 每天 10,000 次推理请求
- 模型: Llama 3.3 70B (fp8)
- 对个人站足够用

## 未配置 AI Binding 时

API 会返回 fallback 响应提示用户 AI 功能正在配置中。网站其他功能不受影响。
