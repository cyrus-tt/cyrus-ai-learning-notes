# ClawBot Knowledge Inbox

微信 ClawBot 插件 → n8n Webhook → 抓取原文 → 本地 Ollama 打标 → Obsidian Inbox

## 数据流

```
微信 ClawBot / Telegram
        ↓
   n8n Webhook (POST /knowledge-inbox)
        ↓
   Normalize Input — 提取 URL、备注、来源
        ↓
   Fetch Content — HTTP 抓取原文（小红书特殊解析）
        ↓
   Prepare Prompt — 组装 LLM prompt
        ↓
   Summarize with Ollama — 本地 qwen3:8b 生成摘要+标签+分类
        ↓
   Build Markdown — YAML frontmatter + 原文 → .md
        ↓
   Write to Inbox — 写入 Obsidian Vault/Inbox/
```

## 目录结构

```
clawbot/
├── workflows/
│   ├── knowledge-inbox-core.json          # 主处理流程（n8n 导入用）
│   └── knowledge-inbox-telegram-entry.json # Telegram 入口流程
├── nodes/
│   ├── normalize-input.js                 # 提取 URL、清洗输入
│   ├── fetch-content.js                   # 抓取网页（含小红书解析）
│   ├── prepare-prompt.js                  # 组装 Ollama prompt
│   ├── build-markdown-file.js             # 生成 Obsidian markdown
│   └── telegram-normalize-telegram-message.js  # Telegram 消息解析
└── README.md
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `KNOWLEDGE_OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama API 地址 |
| `KNOWLEDGE_OLLAMA_MODEL` | `qwen3:8b` | 打标用的模型 |
| `KNOWLEDGE_INBOX_DIR` | `/know/Inbox` | Markdown 输出目录（容器内路径） |
| `KNOWLEDGE_CORE_WEBHOOK_URL` | `http://localhost:5678/webhook/knowledge-inbox` | Core webhook（Telegram 入口用） |
| `N8N_RESTRICT_FILE_ACCESS_TO` | `/vault;/know` | n8n 文件访问白名单（**分号分隔**） |

## 分类体系

AI技术 / AI商业 / 运营方法 / 产品思维 / 技术实操 / 职业发展 / 生活洞察

## 当前部署

- **n8n**: Docker 容器 `zhimai-n8n`，host 端口 **5680**（5678 被 SSH tunnel 占）
- **Ollama**: 本地 `localhost:11434`，模型 `qwen3:8b`
- **输出路径**: `/Volumes/tyj/Cyrus/know/Inbox/`（挂载到容器 `/know/Inbox/`）
- **docker-compose**: `/Volumes/tyj/Cyrus/GitHub/grace-knowledge-system/docker-compose.yml`

## 公网访问链路

```
微信 ClawBot → https://opc.wajk365.com/webhook/knowledge-inbox
    → Caddy (腾讯云 101.34.244.33:443)
    → socat (0.0.0.0:5681 → 127.0.0.1:5680)
    → SSH 反向隧道 (-R 5680:localhost:5680)
    → Mac 本地 Docker n8n (5680)
```

依赖的进程（Mac 端都要跑着）：
1. Docker n8n 容器 `zhimai-n8n` (port 5680)
2. Ollama + qwen3:8b
3. SSH 反向隧道: `ssh -R 0.0.0.0:5680:localhost:5680 -N ubuntu@101.34.244.33`

远程服务器：
4. socat 端口转发: `socat TCP-LISTEN:5681,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:5680`
5. Caddy 路由: `/webhook/knowledge-inbox → host.docker.internal:5681`

## 测试

```bash
# 本地测试
curl -X POST http://localhost:5680/webhook/knowledge-inbox \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/article","note":"备注","author":"cyrus","source":"wechat"}'

# 公网测试
curl -X POST https://opc.wajk365.com/webhook/knowledge-inbox \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/article","note":"备注","author":"cyrus","source":"wechat"}'
```
