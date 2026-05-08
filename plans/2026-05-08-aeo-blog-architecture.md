# PLAN · 独立站信息架构重设计 + AEO 优化 + Field Notes

**创建于**：2026-05-08
**状态**：✅ done

---

## 1. 一句话任务

重设计 cyrustyj.xyz 的信息架构与用户动线：信任前置（About 页 + 首页 Hero）、合并干货与教程为 Field Notes、导航精简为 4 项、全站 AEO Schema 覆盖。

## 2. 为什么做（Why）

现状问题：
- 访客进来看到"资讯/干货"两个入口，不知道站长是谁，没有信任基础
- "干货"和计划中的"Blog"定位重叠——都是 Cyrus 原创内容，分两个入口让访客困惑
- 首页 Dispatches 区域是 4 张硬编码假卡片，不链接到任何真实内容
- 导航 4 项中"AI日报"其实只是资讯页的 #digest hash，浪费一个导航位
- 没有 About 页面，缺少 Person schema，AEO 缺锚点

Cyrus 的 specific knowledge 是"非技术背景用 AI 搭全栈自动化系统"——这个故事本身就是最强信任状，但网站完全没展示。

**多平台同步策略**：每篇内容三种形态——独立站长文（AEO schema）+ 小红书短版 + GitHub 代码。

## 3. 边界（不做什么）

- 不用 SSG 框架（Hugo/Next.js 等），保持纯 HTML + Cloudflare Pages
- 不做 CMS/后台，内容直接写 HTML 文件
- 不改资讯页核心功能（筛选/日报/数据源等）
- 第一期只做架构 + 1 篇示范内容，不追求数量
- 不暴露隐私数据（手机号、真实邮箱、公司名、具体业务数据）

## 4. 方案步骤

### Phase 1 — 信息架构重设计

#### Step 1.1 — 导航精简

```
现在：首页 / AI资讯 / AI日报 / AI干货
改为：首页 / 关于 / 实验室 / 资讯
```

- "AI日报"收回资讯页内部（本来就是 #digest hash link）
- "AI干货"升级为"实验室"（Field Notes），合并干货 + 教程
- 新增"关于"页面
- 所有页面的 mg-nav / footer 统一更新

#### Step 1.2 — About 页面（信任锚点）

新建 `about.html`，Magazine 风格一致。

**内容结构**（隐私安全版，从简历提炼）：
```
┌─ Hero ─────────────────────────────────────┐
│  Cyrus 宇                                   │
│  "商科生 × AI 全栈 × 一人公司"               │
│  一个非技术背景的人，用 AI 做到了工程师做的事  │
└─────────────────────────────────────────────┘

┌─ 故事线（时间轴式）─────────────────────────┐
│  大学：双一流，电子商务专业                    │
│  ↓                                          │
│  入职：某行业 Top1 集团（世界500强），         │
│        负责年流水数亿、36,000+ SKU 的业务运营  │
│  ↓                                          │
│  转折：发现业务痛点可以用 AI 解决              │
│        自学 AI Coding，用 Claude Code         │
│        独立交付了全栈系统                      │
│  ↓                                          │
│  验证：40+ 同事日常使用                       │
│        受邀做 600 人 Townhall 分享             │
│        副总裁背书                             │
│  ↓                                          │
│  现在：独立 AI 产品（已有付费客户）            │
│        B端 AI 自动化顾问交付                   │
│        小红书 AI 知识分享                      │
└─────────────────────────────────────────────┘

┌─ 项目展示（3 张卡片）──────────────────────┐
│  1. 智能经营 Agent                          │
│     → 效率 +80% / 异常响应 +5x              │
│  2. 知脉 ZhiMai                             │
│     → 本地化 AI 知识产品，已付费交付          │
│  3. B端 AI 自动化顾问                        │
│     → 独立完成从诊断到部署的全链路             │
└─────────────────────────────────────────────┘

┌─ 社交链接 ─────────────────────────────────┐
│  小红书 / GitHub                             │
└─────────────────────────────────────────────┘
```

**Schema（JSON-LD）**：
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Cyrus",
  "alternateName": "Cyrus 宇",
  "url": "https://cyrustyj.xyz",
  "description": "非技术背景 AI 全栈实践者，世界500强业务场景 AI 落地经验，独立 AI 产品创造者",
  "jobTitle": "AI Practitioner & Builder",
  "knowsAbout": ["AI Agent", "Claude Code", "n8n", "Prompt Engineering", "AEO"],
  "sameAs": ["小红书链接", "GitHub链接"]
}
```

#### Step 1.3 — 首页 Hero 重构

| 区域 | 现在 | 改为 |
|------|------|------|
| Hero 标题 | "An AI Alchemist's Field Notes" | 保留，加一句话人物定位 |
| 副标题 | "聚合全球 AI 动态，提炼可执行模板" | "非技术出身，用 AI 独立交付全栈系统的实战记录" |
| Stats Grid | 200+信息源 / 每日更新 / 30+模板 / 5K+粉丝 | 600人分享 / 40+人在用 / 付费客户交付 / 世界500强验证 |
| CTA 按钮 | 进入资讯 / AI干货模板 / 小红书 | 进入实验室 / AI 资讯 / 关于我 |
| Entry Cards | 01 资讯 / 02 干货 | 01 实验室 / 02 资讯（原创优先） |
| Dispatches | 4 张硬编码假卡片 | 动态拉取 Field Notes 最新内容（或手动维护但链接到真实页面） |

#### Step 1.4 — Footer 统一更新

所有页面 footer "站点"栏：
```
关于 Cyrus / 实验室 / AI 资讯
```

### Phase 2 — Field Notes（合并干货 + 教程）

#### Step 2.1 — 目录结构

```
field-notes/
├── index.html                        ← 列表页（替代原 resources.html）
├── _template.html                    ← 教程/内容模板（复制用）
├── claude-code-skills-guide/
│   └── index.html                    ← 第一篇教程
└── ...
```

URL：`/field-notes/claude-code-skills-guide/`

#### Step 2.2 — 列表页（field-notes/index.html）

基于现有 resources.html 改造：
- 复用 resources.js 的 JSON 加载 + 卡片渲染逻辑
- 数据结构加 `type` 字段：`tutorial` / `template` / `postmortem` / `review`
- 筛选栏加类型标签（教程 / 模板 / 复盘 / 评测）+ 现有的内容标签
- Hero 文案改为 "Field Notes · 实验室"
- Magazine 风格一致

#### Step 2.3 — 处理旧 URL

`resources.html` 改为 301 重定向到 `/field-notes/`：
```html
<meta http-equiv="refresh" content="0;url=/field-notes/" />
<link rel="canonical" href="https://cyrustyj.xyz/field-notes/" />
```
（与现有 consulting.html → news.html 的处理方式一致）

#### Step 2.4 — 内容详情页模板

Magazine 风格延续，包含：
- mg-ticker + mg-mast 导航（统一 4 项）
- 面包屑：首页 / 实验室 / 文章标题
- 文章 hero：标题 + 类型标签 + 日期 + 阅读时间
- 正文区域：支持代码块、步骤列表、提示框（.tip-box）、踩坑框（.pitfall-box）
- FAQ 区域（折叠式 Q&A，配 FAQPage schema）
- 底部：相关推荐 + 小红书关注 CTA
- Schema.org JSON-LD（HowTo / Article + FAQPage + BreadcrumbList）

### Phase 3 — AEO Schema 全站覆盖

#### Step 3.1 — 各页面 Schema

| 页面 | Schema 类型 |
|------|------------|
| about.html | Person |
| index.html | WebSite + Person（简版引用） |
| field-notes/index.html | CollectionPage |
| field-notes/*/index.html | HowTo 或 Article + FAQPage + BreadcrumbList |
| news.html | CollectionPage（已有） |

#### Step 3.2 — 教程类 Schema 示例

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Claude Code 自定义 Skill 完全指南",
  "description": "从零开始创建 Claude Code 自定义 Skill 的完整教程",
  "step": [
    { "@type": "HowToStep", "name": "理解 Skill 文件结构", "text": "..." },
    { "@type": "HowToStep", "name": "编写 SKILL.md", "text": "..." }
  ],
  "author": { "@type": "Person", "name": "Cyrus", "url": "https://cyrustyj.xyz/about.html" },
  "datePublished": "2026-05-08",
  "dateModified": "2026-05-08"
}
```

### Phase 4 — 交叉导流

#### Step 4.1 — 页面间链接

- 首页 Hero → "关于我" 按钮 → about.html
- 首页 Dispatches → 链接到 field-notes 真实文章
- About 项目卡片 → 链接到对应 field-notes 教程
- 资讯卡片底部 → "相关教程"链接（后续手动或数据字段关联）
- 教程正文中引用动态时 → 链到资讯页
- 所有页面 footer → 统一导航 + 小红书 + GitHub

### Phase 5 — 第一篇内容 + Sitemap

#### Step 5.1 — 第一篇教程（示范）

标题："Claude Code 自定义 Skill 完全指南"
- AEO 目标问题："怎么给 Claude Code 写自定义 Skill？"
- 内容来源：已有的 30+ Skills + skill-creator skill 实践经验
- 包含：什么是 Skill、文件结构、实战案例、踩坑记录、FAQ
- Schema：HowTo + FAQPage

#### Step 5.2 — Sitemap 更新

更新 sitemap.xml 包含：
- `/about.html`
- `/field-notes/`
- `/field-notes/claude-code-skills-guide/`

## 5. 涉及文件/资源

**新增：**
- `about.html` — 关于页面
- `field-notes/index.html` — 实验室列表页
- `field-notes/_template.html` — 内容模板
- `field-notes/claude-code-skills-guide/index.html` — 第一篇教程

**修改：**
- `index.html` — Hero 重构 + Dispatches 真实化 + 导航更新
- `news.html` — 导航更新（去掉独立的 AI日报 入口，收回页内）
- `resources.html` — 改为 301 重定向到 /field-notes/
- `styles.css` — 新增文章排版样式（.article-body / .tip-box / .pitfall-box / .faq-item / .timeline）
- `sitemap.xml` — 加新页面

**不改：**
- `news.js` / `resources.js` — 核心逻辑不变
- `ui.js` / `auth.js` / `visit-stats.js` — 不变

## 6. 执行顺序

```
Phase 1 (架构)   ──→  Phase 2 (Field Notes)  ──→  Phase 3 (AEO Schema)
  1.1 导航精简          2.1 目录结构                3.1 各页 Schema
  1.2 About 页面        2.2 列表页                  3.2 教程 Schema
  1.3 首页重构          2.3 旧 URL 重定向
  1.4 Footer 更新       2.4 内容模板             ──→  Phase 4 (导流)
                                                      4.1 交叉链接
                                                   ──→  Phase 5 (内容)
                                                      5.1 第一篇教程
                                                      5.2 Sitemap
```

## 7. 验收标准（全打 ✅ 才算完成）

**架构：**
- [ ] 导航统一为 4 项：首页 / 关于 / 实验室 / 资讯
- [ ] /about.html 可访问，Magazine 风格，Person schema 正确
- [ ] 首页 Hero 展示人物定位 + 真实信任数据
- [ ] 首页 Dispatches 链接到真实内容
- [ ] /resources.html 301 到 /field-notes/
- [ ] 所有页面 footer 统一

**内容：**
- [ ] /field-notes/ 列表页可访问，支持类型 + 标签筛选
- [ ] /field-notes/claude-code-skills-guide/ 教程可读，排版正常
- [ ] 教程包含 HowTo + FAQPage schema

**AEO：**
- [ ] About 页 Person schema 通过 Google Rich Results Test
- [ ] 教程页 HowTo schema 通过 Google Rich Results Test
- [ ] Sitemap 包含所有新页面

**体验：**
- [ ] 移动端响应式正常（所有新页面）
- [ ] 无隐私数据泄露（手机号 / 邮箱 / 公司名 / 具体业务数据）
- [ ] 交叉导流链接可点击、指向正确

## 8. 风险 / 阻塞

- 风险：纯 HTML 写教程效率低 → 后续可考虑 Markdown → HTML 构建脚本
- 风险：首页 Dispatches 动态化需要数据源 → 第一期可手动维护，链接到真实页面即可
- 风险：resources.html 301 后，已有外部链接可能失效 → 但目前外部引用极少，影响可控

## 9. 回滚方案

- About 页面：删除 about.html
- Field Notes：删除 field-notes/ 目录，恢复 resources.html（git checkout）
- 导航/首页：git checkout index.html news.html
- 全部可通过 `git checkout HEAD~1 -- .` 一键回滚

---

## 执行日志（动手后追加）

## 附：第一批内容选题（优先级排序）

| # | 选题 | 类型 | AEO 目标问题 | 来源 |
|---|------|------|-------------|------|
| 1 | Claude Code 自定义 Skill 完全指南 | tutorial | "怎么给 Claude Code 写 Skill" | 30+ Skills 实践 |
| 2 | n8n + Ollama 搭建知识入库管道 | tutorial | "怎么用 n8n 做 AI 知识管理" | ClawBot 项目 |
| 3 | Cloudflare Pages 零成本建站 | tutorial | "免费部署个人网站" | 本站踩坑经验 |
| 4 | 非技术背景 AI 全栈指南 | tutorial | "不会写代码怎么做 AI 项目" | 个人经历 |
| 5 | 一人公司 + Claude 产出放大术 | tutorial | "一个人怎么用 AI 做到团队产出" | OPC 项目 |
