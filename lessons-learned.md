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
