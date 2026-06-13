# Lessons Learned — cyrus-ai-learning-notes

实战中踩过的坑，防止重蹈覆辙。每条教训附根因和规则。

---

## L001 · 域名 403：Worker 代理是多余的层（2026-05-07）

**现象**：`cyrustyj.xyz` 返回 403 Forbidden，`cyrus-ai-notes.pages.dev` 正常。

**根因**：用 `edge-proxy.js`（Cloudflare Worker）反向代理到 Pages.dev，而不是用 Pages 原生 Custom Domain。Worker 经过 Zone 级安全规则（Bot Fight Mode），外部请求被拦截。

**第一性原理拆解**：
- "这层为什么存在？" → 完全不该存在。Pages 原生支持 Custom Domain，Worker 代理是多余的层，增加延迟、引入安全规则冲突、增加排障复杂度。
- "失败会怎么表现？" → 手动 Dashboard 操作无记录、不可复现，应该用 Wrangler CLI 脚本化。
- "3 个月后看懂吗？" → 域名配置散落在 Cloudflare Dashboard 里，没人记得。应在仓库留命令记录。

**规则**：
1. Cloudflare Pages 项目绑自定义域名，**永远用 Pages Custom Domain，不要加 Worker 代理层**
2. 基础设施变更用 **Wrangler CLI**（`wrangler pages domain create`），不手动点 Dashboard
3. 基础设施命令存到 `scripts/` 里，可审计可复现

**修复方案**：
```bash
# Pages Custom Domain 绑定（API）
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/cyrus-ai-notes/domains" \
  -H "Authorization: Bearer $TOKEN" -d '{"name":"cyrustyj.xyz"}'

# 删除 Worker route + Worker（API）
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/workers/routes/$ROUTE_ID" -H "Authorization: Bearer $TOKEN"
curl -X DELETE "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/cyrus-ai-domain-proxy" -H "Authorization: Bearer $TOKEN"

# DNS CNAME 需手动（Wrangler OAuth 无 dns_records:write scope）
# Dashboard → DNS → 将 A 记录改为 CNAME → cyrus-ai-notes.pages.dev
rm edge-proxy.js
```

---

## L002 · Wrangler OAuth scope 不含 DNS 写入（2026-05-08）

**现象**：想用 Wrangler CLI 全自动化域名修复，但 DNS records API 返回 Authentication error。

**根因**：`wrangler login` 的 OAuth scope 列表里没有 `dns_records:write`，只有 `zone:read`。DNS 记录写入必须用 API Token（Dashboard 手动创建）或 Global API Key。

**规则**：
1. Wrangler CLI 能管 Workers/Pages/KV/D1，**不能管 DNS records**
2. 需要 DNS 自动化时，在 Dashboard 创建 API Token（Edit zone DNS 权限），存到 `.env` 里用 curl 调 API
3. SSH 远程环境 `wrangler login` 回调地址是 `localhost:8976`，手机无法接收 → 用 API Token 代替

---

## L003 · 公开网站不得暴露个人隐私信息（2026-05-08）

**现象**：about.html 和 index.html 直接暴露了学校（双一流）、专业（电子商务）、商科生字眼、具体业务数据（36,000+ SKU、600人 Townhall、副总裁）、产品名（知脉 ZhiMai）等可定位个人身份的信息。

**根因**：从简历直接搬运文案到公开网站，没有做隐私脱敏处理。把"尽量展示信任状"和"隐私保护"的边界搞混了。

**规则**：
1. **公开网站禁止出现**：真实姓名（除公开 ID）、学校名/类型、专业名、公司名、具体职位、手机号、邮箱、具体业务数据（SKU 数、流水、人数）、内部事件细节（Townhall、副总裁）
2. **可以出现**：公开 ID（Cyrus）、泛化描述（"世界500强"、"AI Builder"）、公开产品、GitHub/社媒链接
3. **简历内容 ≠ 网站内容**：简历是给面试官看的私密文档，网站是给陌生人看的公开页面。信任状要通过作品和内容证明，不是暴露个人经历
4. 每次生成公开内容前，先跑一遍隐私关键词检查（grep 学校/专业/公司名/职位/手机/邮箱）

---

## L004 · CSP 太严格会默默吞掉所有外部资源（2026-05-14）

**现象**：Playground 页面情感分析报 "Failed to fetch dynamically imported module"，iframe 可视化全部打不开，Google Fonts 不加载。用户看到的是"功能坏了"，没有任何提示是 CSP 拦截。

**根因**：`_headers` 文件的 CSP 写了 `script-src 'self'`、`connect-src 'self'`，把所有外部 CDN、字体、iframe 源全拦了。CSP 违规只在 DevTools Console 报错，普通用户看不到。

**规则**：
1. 新增外部资源（CDN script、iframe、font、API）时，**必须同步更新 `_headers` 的 CSP**
2. 本地验证时打开 DevTools Console，**搜 "Content Security Policy"** 确认无拦截
3. `connect-src` 必须覆盖 AI 模型下载源（HuggingFace CDN 有多个子域名）
4. `frame-src` 必须列出所有嵌入的第三方站点
5. WASM 执行需要 `'wasm-unsafe-eval'`，Web Worker 需要 `worker-src 'self' blob:`

---

## L005 · 跨项目教训不传播 = 同一个坑踩多次（2026-05-21）

**现象**：OPC 项目已沉淀 97 条教训（CORS 白名单、auth fail-closed、速率限制等），但 cyrus-ai-learning-notes 仍然 CORS 全开 `*`、mc-auth 缺 token 时默认放行、chat API 无速率限制。

**根因**：每个项目独立维护 CLAUDE.md，教训锁在各自项目里。全局 CLAUDE.md 只有抽象原则（"第一性原理"），没有具体检查项。`coding-workflow-default` skill 是被动的（需要主动调用），不含技术级检查清单。

**规则**：
1. 通用教训写入 `Rules_Skills/rules/shared-code-checklist.md`，通过 `$include` 自动加载到所有项目
2. 项目 CLAUDE.md 只写项目特有规则，不重复通用项
3. 发现新的通用教训时，先问"这只是本项目的问题，还是所有项目都会遇到？"——后者必须提升到共享层

---

## L006 · Auth 守卫必须 fail-closed（2026-05-21）

**现象**：`mc-auth.js` 在 `MC_AUTH_TOKEN` 环境变量未配置时返回 `true`（放行所有请求），注释写的是"dev mode"。但生产环境如果忘了配 token，就等于没有 auth。

**根因**：开发便利性优先于安全默认值。正确做法：没配 token = 拒绝所有请求，强制开发者配置。

**规则**：
1. Auth 中间件/守卫在配置缺失时必须**拒绝请求**（fail-closed），不是放行（fail-open）
2. 如果需要 dev mode 跳过 auth，用显式的环境变量 `AUTH_SKIP=true`，不是"没配 token 就跳过"

---

## L007 · 验证线上版本必须 curl -L：clean URL 的 308 空 body 会骗人（2026-06-12）

**现象**：v4 部署后 `curl -s .../consulting.html | grep stage-ribbon` 持续返回 0，监控等了 10 分钟判定"部署失败"。实际上 v4 早已上线——Pages 开了 clean URL，`.html` 路径返回 308 空 body，grep 空内容当然是 0。

**根因**：验证命令没跟随重定向。308 的 body 是空的，`grep -c` 返回 0 和"内容里没有这个字符串"无法区分。错误结论又引发了半小时的"部署排障"，方向全错。

**规则**：
1. curl 验证页面内容**一律带 `-L`**；判定"没部署"之前先 `curl -o /dev/null -w "%{http_code}"` 看状态码
2. 监控/冒烟脚本里的 curl 同理（smoke-test.sh 已修）
3. grep 计数为 0 时，第一反应是"我抓的 body 是不是空的"，不是"内容不存在"

---

## L008 · 冒烟测试指向死域名 = 永远红灯，掩盖一切真问题（2026-06-12）

**现象**：deploy workflow 连续 3+ 次失败，排查发现部署步骤一直成功，失败的全是冒烟测试——它打的 `cyrusai.me` 域名 DNS 委派已消失（疑似过期释放），从 GitHub runner 连不上。

**根因**：冒烟测试的目标域名和站点 canonical 域名（cyrustyj.xyz）不一致，域名挂了没人发现，流水线从此永远红灯。红灯常态化后就没人看了——真失败也会被淹没（狼来了效应）。

**规则**：
1. 冒烟测试目标用 canonical 域名，和 SEO meta 保持一致
2. CI 红灯连续 2 次就必须排查，不允许"反正一直红"常态化
3. 域名/证书这类有效期资产，挂掉的第一信号往往是 CI，不是用户——别忽略
