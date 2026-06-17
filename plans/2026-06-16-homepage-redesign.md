# PLAN · 首页视觉重做 — 从"手机博客"到"个人品牌站"

**创建于**：2026-06-16
**状态**：🔵 in-progress

---

## 1. 一句话任务

重做首页视觉和布局，从当前 680px 窄柱列表式博客升级为全宽 bento grid 品牌站，加入 GSAP 动画、个人 IP 标识、社会证明，让桌面端访问有冲击力且能记住"这是 Cyrus 的站"。

## 2. 为什么做（Why）

当前首页 3 个核心问题：
1. **max-width 680px** — 桌面端浏览器里就是一根窄柱子，跟手机截图一样
2. **所有 section 都是"标题+列表"** — 没有视觉节奏，像套了 blog 模板
3. **零个人标识** — 没有 IP 符号、成就数据、或任何让人记住 Cyrus 的元素

参考基准：tools.html 的 bento grid + 终端 hero 风格已被验证好看。

## 3. 边界（不做什么）

- **不换框架** — 继续 vanilla HTML/CSS/JS，不引入 React/Vue/Astro
- **不改后端** — API、D1、Workers 不动
- **不改内容** — 教程列表、TIL、新闻数据源不变，只改展示方式
- **不改其他页面** — 只动 index.html 和 styles.css（首页相关部分）
- **不改 nav 结构** — 导航栏已够好，保留
- **性能红线** — LCP < 2.5s，不引入 Three.js 这类重型依赖

## 4. 方案步骤

### Phase 1：基础设施（CDN + 字体 + 工具链）

**Step 1.1 — 引入 GSAP 全家桶 + Lenis**
- 添加 CDN：GSAP 3.15 core + ScrollTrigger + SplitText（全免费）
- 添加 CDN：Lenis（丝滑滚动）
- 添加 CDN：Typed.js（hero 打字机效果）
- 所有库 `defer` 加载，不阻塞首屏
- 产出：`<script>` 标签加到 index.html 底部

**Step 1.2 — 字体升级**
- 新增 display font：**Space Grotesk**（variable, 用于标题/hero）
  - 理由：几何感强、有辨识度、支持中文回退到 Noto Sans SC
  - tools.html 用 Sora，首页用 Space Grotesk 区分但风格一致
- Inter 保留给正文
- JetBrains Mono 保留给代码/标签
- 产出：更新 Google Fonts `<link>`

### Phase 2：Hero 重做（第一屏冲击力）

**Step 2.1 — 全屏深色 Hero**
- 高度：`min-height: 80vh`（当前 400px → 全屏感但不浪费空间）
- 背景：深色 `#0f1117` + 双色径向渐变光晕（复用 tools.html 模式）
  - 顶部橙色光 `rgba(232,69,14,.12)`
  - 底部紫色光 `rgba(139,92,246,.08)`
- 保留 p5.js neural 动画作为背景层（已有，不替换）
- 网格装饰线（tools.html 的虚线竖线效果）

**Step 2.2 — Hero 内容重构**
- 顶部 badge：`● SYSTEM ONLINE` 脉冲点 + monospace（复用 tools.html 模式）
- 主标题：Space Grotesk 800, `clamp(40px, 8vw, 72px)`
  - 文案：`AI 实践手册.` → 保留，但 "AI" 做渐变色处理（橙→金）
- 副标题：保留当前文案，字号提到 17px，颜色 `#8b8fa3`
- 打字机效果：在标题下方加一行 Typed.js 循环展示
  - `"教程 → 从零到上线"` → `"工具 → 浏览器里体验 AI"` → `"资讯 → 每日全球 AI 动态"`
- 双入口卡（读者/企业）保留但样式升级：
  - 卡片加 `backdrop-filter: blur(12px)` 毛玻璃效果
  - hover 加上彩色顶边（accent 色 3px bar，复用 tools.html 卡片模式）

### Phase 3：布局系统重做（680px → 全宽 bento）

**Step 3.1 — 全局布局变量**
```css
:root {
  --content-max: 1100px;      /* 之前 680px，桌面端拉宽 */
  --content-narrow: 680px;    /* 纯文字段落保留窄宽 */
  --section-pad-y: 80px;      /* section 垂直间距统一 */
  --section-pad-x: 24px;      /* 水平安全边距 */
  --card-radius: 16px;
  --card-gap: 16px;
}
```

**Step 3.2 — "这里有什么" → 四宫格 bento card**
- 当前：纯文本 `<ul>` 列表
- 改为：2×2 CSS Grid，每个格子一张卡（教程/Playground/资讯/TIL&周报）
- 每张卡：icon + 标题 + 一句话描述 + 链接
- hover：translateY(-4px) + shadow + 彩色顶边
- 移动端：2列 → 1列

**Step 3.3 — 社会证明 stats bar（新增 section）**
- 位置：紧跟 hero 下方（bento 之前）
- 全宽深色背景条（与 hero 衔接）
- 3-4 个数据指标，水平排列：
  - `59K+` 小红书获赞
  - `N 篇` 实战教程
  - `每日更新` AI 资讯
  - `N+ 工具` AI 工具栈
- 数字用 Space Grotesk 800 大字，标签用 monospace 小字
- GSAP 滚动触发计数动画（数字从 0 滚到目标值）

**Step 3.4 — 教程精选 → 3列卡片网格**
- 当前：单列列表 `<ul class="post-list">`
- 改为：`grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`
- 每张卡：标题 + 日期 + 描述 + 分类标签
- 第一张可做 `grid-column: span 2` 的 featured 大卡
- 卡片入场动画：GSAP ScrollTrigger stagger fade-up

**Step 3.5 — AI 新闻 + TIL → 双栏布局**
- 当前：两个独立的全宽列表 section
- 改为：一个 section 内 2 列并排
  - 左栏（60%）：AI 热点 NEWS — 紧凑列表，保留 aiScore 徽章
  - 右栏（40%）：TIL 最近学到的 — 紧凑列表 + 彩色左边框
- 标签：section-label 加装饰（小色点/线段）
- 移动端：堆叠为单列

**Step 3.6 — 订阅区 → 全宽 CTA 色块**
- 当前：普通 content 宽度的表单
- 改为：全宽背景色块（深色渐变或 accent 色调）
- 标题加大，描述精简
- 表单居中，input + button 样式打磨
- 视觉效果：subtle noise/grain 纹理覆盖（CSS SVG filter，0KB）

**Step 3.7 — "更多" + "学习打卡" → 合并为 footer 上方的 grid**
- Quick Links 3 卡 + Streak Widget 合并到一行
- 4 列 grid（3 个 quick link + 1 个 streak 可视化）
- 移动端：2×2 网格

### Phase 4：动画与交互

**Step 4.1 — Lenis 丝滑滚动**
- 初始化 Lenis，配置 `duration: 1.2, easing`
- 与 GSAP ScrollTrigger 联动（Lenis 官方集成方式）

**Step 4.2 — GSAP 滚动动画**
- 每个 section 标题：SplitText 拆字 + stagger fade-in（进入视口时触发）
- 卡片网格：stagger 入场（从底部 20px fade up）
- Stats bar 数字：countUp 动画
- 所有动画包裹在 `prefers-reduced-motion` 检查里

**Step 4.3 — 鼠标追踪光晕（Brittany Chiang 式）**
- Hero 区域内：CSS radial-gradient 跟随鼠标位置
- 实现：`mousemove` 事件更新 CSS 变量 `--mouse-x`, `--mouse-y`
- 效果：半径 ~400px 的柔和光斑跟着鼠标移动
- 移动端不加载此效果

**Step 4.4 — 卡片 hover 微交互**
- 所有卡片统一 hover 效果：lift + shadow + 彩色顶边
- 复用 tools.html 的 `.tool-card:hover` 模式
- 过渡：`transition: transform 200ms ease, box-shadow 200ms ease`

### Phase 5：视觉细节与打磨

**Step 5.1 — Noise/Grain 纹理**
- 通过 CSS `url("data:image/svg+xml,...")` 内联 SVG feTurbulence
- 应用到 hero 和 subscribe section 作为微妙纹理叠加层
- 3-5% opacity，不影响可读性

**Step 5.2 — Section 背景交替**
- 奇数 section：默认背景 `var(--bg)`
- 偶数 section：微调背景 `var(--bg-2)` 或 `var(--surface-1)`
- 制造"章节感"的视觉节奏

**Step 5.3 — Dark Mode 精调**
- 确保所有新组件在 dark/light 两个模式下都好看
- Hero 和 stats bar 固定深色（不随主题切换）
- 卡片在 dark mode 下用 `rgba(255,255,255,0.04)` 微妙提升

**Step 5.4 — 响应式断点**
- `>1100px`：全宽 bento grid，3列教程卡，双栏新闻/TIL
- `768-1100px`：2列教程卡，双栏→单列
- `<768px`：单列，hero 缩小到 60vh，stats bar 2×2 网格

## 5. 涉及文件/资源

- **主要修改**：
  - `index.html` — 结构重写
  - `styles.css` — 新增首页布局/动画样式（或抽出 `css/home.css`）

- **新增**：
  - `js/home-animations.js` — GSAP/Lenis 初始化 + 首页动画逻辑

- **CDN 依赖（新增）**：
  - GSAP 3.15 core (~73KB gz) — `https://cdn.jsdelivr.net/npm/gsap@3.15/dist/gsap.min.js`
  - GSAP ScrollTrigger (~12KB) — `https://cdn.jsdelivr.net/npm/gsap@3.15/dist/ScrollTrigger.min.js`
  - GSAP SplitText (~8KB) — `https://cdn.jsdelivr.net/npm/gsap@3.15/dist/SplitText.min.js`
  - Lenis (~7KB) — `https://cdn.jsdelivr.net/npm/lenis@latest/dist/lenis.min.js`
  - Typed.js (~5KB) — `https://cdn.jsdelivr.net/npm/typed.js@2/lib/typed.min.js`
  - 总新增：~105KB gzipped（合理，低于 Three.js 一个库的体积）

- **不动**：
  - `js/neural-hero.js` — p5.js 动画保留
  - `js/components/*` — 所有组件逻辑不变
  - `functions/api/*` — 后端不动
  - `data/*` — 数据源不动

## 6. 验收标准（全打 ✅ 才算完成）

- [ ] 桌面端（1440px+）首页不再是 680px 窄柱，内容利用全宽
- [ ] Hero 占据 80vh，有渐变光晕 + 网格装饰 + 打字机效果
- [ ] 社会证明 stats bar 显示 59K+ 等数据，数字有滚动计数动画
- [ ] 教程区域是 3 列卡片 grid（非列表），有 stagger 入场动画
- [ ] 新闻 + TIL 区域桌面端双栏并排
- [ ] 订阅区有全宽色块背景 + noise 纹理
- [ ] 移动端（375px）所有 section 正常显示，无横向溢出
- [ ] Dark mode / Light mode 都好看
- [ ] `prefers-reduced-motion` 下无动画，内容正常可用
- [ ] LCP < 2.5s（Lighthouse 测一次）
- [ ] p5.js hero 动画仍然正常运行
- [ ] Cmd+K、聊天、订阅等已有功能不受影响
- [ ] Playwright 截图对比桌面端 + 移动端效果

## 7. 风险 / 阻塞

- **风险**：GSAP CDN 版本锁定 — 用 `@3.15` 精确版本避免自动升级破坏
- **风险**：Lenis 与 Pagefind 搜索弹窗可能冲突 — Cmd+K 打开时需暂停 Lenis
- **风险**：SplitText 中文兼容 — 需要测试中英文混排的拆字效果
- **风险**：styles.css 已有 2182 行，改动量大 — 首页样式考虑抽为 `css/home.css` 避免冲突

## 8. 回滚方案

- 所有改动在 `claude/homepage-redesign` 分支上执行
- 回滚 = `git checkout main`，不影响生产
- 上线后如果有问题：`git revert` 合并提交即可

---

## 执行日志（动手后追加）

