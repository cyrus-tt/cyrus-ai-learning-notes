# DESIGN.md — cyrustyj.xyz Design System

> AI coding agent 读到这个文件后，必须按以下规范生成前端代码。
> 灵感来源：Vercel Geist + Claude Design + Cursor + Linear + Stripe + Notion。
> 风格定位：暖色调极简编辑感，个人 AI 学习平台，不是 SaaS。

---

## Brand Identity

- **品牌名**：Cyrus AI Learning Notes
- **品牌色**：橙红 `#e8450e`（亮模式）/ `#ff6b3d`（暗模式）
- **品牌调性**：克制、专业、有温度。像一本设计精良的独立杂志，不像企业官网。
- **设计哲学**：好看不是天赋，是纪律。每个值都写死，没有"看着差不多就行"。

---

## Color Tokens

所有颜色通过 CSS custom properties 使用，禁止在代码中硬编码 hex 值。

### Light Mode (default)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#f8f7f4` | 页面主背景（暖奶白，不是冷白） |
| `--bg-2` | `#f0efe9` | 次级背景（侧栏、代码区外围） |
| `--bg-elevated` | `#ffffff` | 卡片、弹窗、浮层表面 |
| `--ink` | `#1a1a1a` | 主文字（暖近黑，不是纯黑） |
| `--ink-2` | `#333330` | 次要标题、强调段落 |
| `--muted` | `#6b6b66` | 三级文字（日期、标签、辅助说明） |
| `--muted-2` | `#8e8e88` | 四级文字（placeholder、disabled） |
| `--line` | `#e6e5e0` | 边框、分割线（暖灰，不是冷灰） |
| `--line-soft` | `#eeedea` | 更轻的分割（表格行、hover 底色边界） |
| `--accent` | `#e8450e` | 品牌强调色（仅 CTA 按钮、链接 hover、重点标注） |
| `--accent-soft` | `color-mix(in srgb, var(--accent) 8%, transparent)` | 强调色浅底（标签背景、选中态底色） |
| `--ok` | `#16a34a` | 成功状态 |
| `--error` | `#dc2626` | 错误状态 |
| `--warning` | `#d97706` | 警告状态 |

### Dark Mode

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0e0e0c` | 页面主背景（暖深黑） |
| `--bg-2` | `#181816` | 次级背景 |
| `--bg-elevated` | `#1e1e1c` | 卡片、弹窗表面 |
| `--ink` | `#f0f0ec` | 主文字（暖浅灰） |
| `--ink-2` | `#d4d4d0` | 次要文字 |
| `--muted` | `#8e8e88` | 三级文字 |
| `--muted-2` | `#6b6b66` | 四级文字 |
| `--line` | `#2e2e2a` | 边框 |
| `--line-soft` | `#242420` | 轻分割 |
| `--accent` | `#ff6b3d` | 品牌强调色（暗模式偏亮橙） |

### Color Rules

- **强调色克制原则**：`--accent` 仅用于最高优先级 CTA、链接 hover、进度条。一个视口内最多出现 2 处强调色。想用第 3 处时，重新考虑布局。
- **文字颜色只用 4 档**：`--ink`（主标题/正文）→ `--ink-2`（副标题）→ `--muted`（辅助文字）→ `--muted-2`（placeholder）。
- **禁止在浅色背景上用品牌色做大面积填充**。品牌色只点缀，不铺底。
- **暗模式不是反色**：暗模式的 `--accent` 必须比亮模式更亮（`#ff6b3d`），保证在深色背景上的对比度。

---

## Typography

### Font Stack

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | `"Inter", "Noto Sans SC", -apple-system, sans-serif` | 正文、UI 元素 |
| `--font-display` | `"Space Grotesk", var(--font-sans)` | 页面大标题、hero 区域 |
| `--font-mono` | `"JetBrains Mono", ui-monospace, Menlo, monospace` | 代码、终端、数据标签 |

### Type Scale

| Name | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|----------------|-------|
| `display-xl` | `clamp(44px, 9vw, 80px)` | 800 | 0.95 | `-0.04em` | Hero 主标题，每页最多 1 个 |
| `display-lg` | `clamp(36px, 7vw, 64px)` | 700 | 1.0 | `-0.035em` | 页面标题 |
| `display-md` | `24px` | 600 | 1.2 | `-0.02em` | Section 标题 |
| `display-sm` | `20px` | 600 | 1.3 | `-0.015em` | 卡片标题 |
| `body-lg` | `18px` | 400 | 1.7 | `0` | 长文正文、hero 副标题 |
| `body-md` | `16px` | 400 | 1.65 | `0` | 默认正文 |
| `body-sm` | `14px` | 400 | 1.5 | `0` | 卡片描述、导航链接 |
| `caption` | `12px` | 500 | 1.4 | `0.02em` | 日期、标签、徽章 |
| `label-mono` | `11px` | 400 | 1.3 | `0.12em` | 代码标签、kicker 行（全大写） |

### Typography Rules

- **Display 字体用 Space Grotesk**，body 用 Inter。不混用。
- **大标题必须负字距**：字号越大，letter-spacing 越紧。这是标题力量感的来源（学自 Vercel `-2.4px` @ 48px）。
- **正文 line-height ≥ 1.6**：阅读舒适度的底线。
- **一个页面最多 2 种字重**：通常 400（正文）+ 600 或 700（标题）。不要 400 + 500 + 600 + 700 混用。
- **全大写仅用于 `label-mono`**（如 kicker、badge），正文标题禁止全大写。

---

## Spacing System

**基准单位：4px。所有间距必须是 4 的倍数。**

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | `4px` | 图标与文字间距、最小内边距 |
| `space-2` | `8px` | 紧凑组件内边距、行内元素间距 |
| `space-3` | `12px` | 表单元素间距、列表项间距 |
| `space-4` | `16px` | 默认组间距、卡片网格 gap |
| `space-6` | `24px` | 卡片内边距、导航侧边距 |
| `space-8` | `32px` | Section 内组间距 |
| `space-10` | `40px` | 移动端 Section 间距 |
| `space-12` | `48px` | 双栏网格 gap |
| `space-16` | `64px` | Section 间距（桌面端） |
| `space-20` | `80px` | 大 Section 垂直 padding |
| `space-24` | `96px` | Hero 区顶部 padding |

### Spacing Rules

- **组内间距 8px，组间 16px，板块间 32-48px**。这是层次感的数学基础（学自 Vercel）。
- **禁止 6px、10px、14px、18px、28px 等非 4 倍数间距**。如果你发现需要 14px，用 12px 或 16px。
- **移动端间距 = 桌面端 × 0.75**（向下取到最近的 4 倍数）。例如桌面 80px → 移动端 60px（不是 56px，因为 60 不是 4 的倍数 → 用 56px）。

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | 输入框、按钮、小组件 |
| `--radius-md` | `12px` | 卡片、面板、弹窗 |
| `--radius-lg` | `16px` | 大卡片、hero 入口卡、对话面板 |
| `--radius-full` | `999px` | 药丸标签、badge、进度条 |

### Radius Rules

- **按钮统一 8px**，不用药丸形（999px）。药丸形仅用于标签和 badge（学自 Claude/Notion/Cursor 的 8px 按钮，更克制）。
- **卡片统一 12px**。不要出现 10px、14px、16px 混用。
- **输入框和按钮同半径（8px）**，视觉上属于同一交互层级。

---

## Elevation & Shadows

### Shadow Scale

| Token | Value (Light) | Usage |
|-------|---------------|-------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | 卡片默认态（几乎不可见） |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.06)` | 导航栏滚动态、下拉菜单 |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | 卡片 hover 态、弹窗 |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.12)` | 模态框、对话面板 |

### Elevation Rules

- **默认用发丝边框（1px `--line`），不用阴影**。卡片默认态 = 1px 边框，不加 shadow。shadow 仅在 hover/focus 时出现（学自 Claude/Cursor/Linear）。
- **阴影代替粗边框**：不画 2px+ 的边框。如果需要更强的分割感，加阴影而不是加粗边框（学自 Vercel）。
- **深色代码卡片可以有阴影**：暗色底（`#1a1a1a`）的代码块/终端预览允许 `--shadow-md`，制造浮起感。浅色卡片不需要。

---

## Buttons

### Button Variants

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| **Primary** | `--accent` | `#ffffff` | none | 主 CTA（每个视口最多 1 个） |
| **Secondary** | `--bg-elevated` | `--ink` | `1px solid var(--line)` | 次要操作 |
| **Tertiary** | `transparent` | `--muted` | none | 第三级操作（取消、返回） |
| **Danger** | `--error` | `#ffffff` | none | 删除、不可逆操作 |

### Button Specs

- **Height**：`40px`（默认）、`32px`（紧凑）、`48px`（hero CTA）
- **Padding**：`10px 20px`（默认）、`8px 16px`（紧凑）
- **Radius**：`8px`（统一，不用药丸）
- **Font**：`14px`，weight `500`
- **Hover**：Primary → `color-mix(in srgb, var(--accent) 85%, #000)`；Secondary → `border-color: var(--accent)`
- **Transition**：`all 0.15s ease-out`

### Button Rules

- **一个视口最多 1 个 Primary 按钮**。需要第 2 个 CTA 时用 Secondary。
- **不叠两种填充色按钮在一起**。Primary + Secondary = OK。Primary + Danger = 不行。
- **按钮文案用动词开头**（"Get Started"、"View Tutorials"），不用名词（"Documentation"）。

---

## Cards

### Card Default

```css
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--line);
  border-radius: 12px;      /* --radius-md */
  padding: 24px;             /* space-6 */
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Card Hover

```css
.card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
  box-shadow: var(--shadow-md);
}
```

### Card Rules

- **卡片不加 hover 前的 shadow**。默认态只有 1px 边框，shadow 在 hover 时出现。
- **hover 上移 3px**，不是 1px 也不是 5px。3px 是"有感知但不浮夸"的甜区。
- **hover 边框颜色混入 30% accent**，不是直接变 accent（太刺眼）。
- **卡片顶部强调线**：需要标示类别时，可以在卡片顶部加 `3px solid var(--accent)` 的条线（scaleX 0→1 动画），但不是所有卡片都加。

---

## Navigation

- **高度**：`64px`
- **背景**：`color-mix(in srgb, var(--bg) 85%, transparent)` + `backdrop-filter: saturate(180%) blur(20px)`
- **底边框**：`1px solid color-mix(in srgb, var(--line) 60%, transparent)`
- **链接颜色**：`--muted`（默认）→ `--ink`（hover/active）
- **Active 指示器**：底部 2px `--accent` 横线，scaleX 动画
- **最大宽度**：`var(--max-w-wide)`（1100px），居中

---

## Layout

### Content Width

| Token | Value | Usage |
|-------|-------|-------|
| `--max-w` | `680px` | 文章正文、单列内容 |
| `--max-w-wide` | `1100px` | 首页全宽、grid 布局 |

### Grid System

- **教程 grid**：`repeat(3, 1fr)` @ 1100px，`repeat(2, 1fr)` @ 768px，`1fr` @ mobile
- **双栏（新闻 + TIL）**：`1.4fr 1fr` @ desktop，`1fr` @ mobile
- **Stats bar**：`repeat(4, 1fr)` @ desktop，`repeat(2, 1fr)` @ mobile
- **Grid gap**：统一 `16px`，双栏间 `48px`

### Breakpoints

| Name | Value | Changes |
|------|-------|---------|
| Desktop | `> 1100px` | 全部展开 |
| Tablet | `≤ 1100px` | 3 列→2 列，TOC 隐藏 |
| Mobile | `≤ 768px` | 单列，padding 缩至 16px |
| Small | `≤ 480px` | 对话面板全宽 |

---

## Animation & Motion

### Easing

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 大多数交互（snappy 出场） |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹性效果（仅 FAB、notification） |

### Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | `0.15s` | hover 颜色变化、opacity |
| `--duration-normal` | `0.25s` | 卡片 hover、展开/收起 |
| `--duration-slow` | `0.4s` | 页面级过渡、scroll reveal |

### Motion Rules

- **入场动画只用 fadeUp**（opacity 0→1 + translateY 16px→0），不搞旋转、缩放、弹跳。
- **Hover 动画不超过 0.25s**。用户不想等。
- **减少不必要动画**：`prefers-reduced-motion` 下禁用所有 transform 动画，保留 opacity。
- **GSAP 仅用于首页 hero**，其他页面用纯 CSS transition。

---

## Don'ts — 最重要的部分

> 这些禁止项对 AI 生成质量的提升是最大的。AI 默认会做很多"看起来也行"的决定，你不明确说不行，它就会做。

### 颜色

- **不用纯白 `#ffffff` 做页面背景**。用暖奶白 `--bg`。纯白只用在 elevated 表面（卡片内部）。
- **不用纯黑 `#000000` 做文字**。用 `--ink`（`#1a1a1a`）。纯黑在暖底上太刺眼。
- **不在浅色背景上用 accent 色做大面积填充**。accent 只点缀。
- **不混用冷色和暖色**。整站暖色调，不要突然出现冷蓝/冷灰。
- **不硬编码 hex 值**。所有颜色走 CSS 变量。

### 字体

- **不用全大写标题**（`label-mono` 除外）。
- **不在一个页面用 3 种以上字重**。
- **不用 font-weight 800 以上**。Display 用 700，body 用 400，偶尔 600。
- **不在正文用 Space Grotesk**。Display 字体归 Display，body 归 Inter。
- **不用系统默认字体做 fallback 的第一选项**。始终先指定品牌字体。

### 间距

- **不用奇数 px 间距**（1px 边框除外）。
- **不用 5px、6px、10px、14px、18px、22px**。只用 4 的倍数。
- **不在组件间用超过 48px 的 gap**。48px 以上只用于 section 间。

### 组件

- **不给浅色卡片加 drop shadow 做默认态**。默认态只有发丝边框。
- **不叠两个 Primary CTA 在同一视口**。
- **不给按钮用药丸圆角（999px）**。按钮统一 8px。999px 仅用于标签/badge。
- **不在卡片 hover 时改变背景色**。只改 border-color + 加 shadow + 上移。
- **不用 border-width > 1.5px**。粗边框显廉价。

### 布局

- **不超过 1100px 内容宽度**。
- **不在移动端保持 3 列 grid**。768px 以下必须 1-2 列。
- **不在 hero 区域放超过 3 个交互元素**。1 标题 + 1 副标题 + 1 CTA 是黄金比例。

### 动画

- **不做超过 0.4s 的入场动画**。
- **不用 ease-in**（先慢后快，违反物理直觉）。只用 ease-out 或 spring。
- **不给所有元素都加 hover 动画**。只有可交互元素（链接、按钮、卡片）需要。

---

## Component Reference

### Tags / Badges

```css
.tag {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
}
```

### Code Blocks

- **背景**：暗色 `#1a1a1a`（亮模式下制造对比），暗模式下 `var(--bg-2)`
- **字体**：`var(--font-mono)` @ `14px`
- **内边距**：`20px 24px`
- **圆角**：`12px`
- **浅色模式下可加 `--shadow-sm`** 制造浮起感

### Stats / Metrics

- **数字字体**：`var(--font-display)` @ `clamp(28px, 4vw, 40px)`，weight 700
- **标签字体**：`var(--font-mono)` @ `11px`，uppercase
- **布局**：4 列 grid，居中对齐

---

## File Structure

```
styles.css          → 全局 token + reset + 通用组件
css/home.css        → 首页专用样式
js/components/      → 组件级 CSS（chat、toast 等）
```

所有新增组件样式写在 `styles.css` 或对应的组件 CSS 中，不要创建散落的 `<style>` 标签。

---

## Resources

- [Vercel Geist Design System](https://vercel.com/design.md)
- [DESIGN.md Spec (Google Stitch)](https://github.com/google-labs-code/design.md)
- [454 Design Systems](https://designmd.app)
- [Awesome Design MD](https://github.com/voltagent/awesome-design-md)
