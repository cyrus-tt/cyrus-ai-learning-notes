# Design: Minimal Redesign

## Decision
Strip magazine aesthetic, rebuild with restraint. White + black + one accent color. Content-first homepage.

## Kill list
Ticker, CYRUS QUARTERLY letter-animation logo, VOL.47 metadata, rotating SVG badge, paper texture (body::before), terminal animation, portrait avatar, marquee, stats grid, pull quote, entry cards, Bodoni Moda / Noto Serif fonts.

## Design tokens
```
Font: Inter, "Noto Sans SC", -apple-system, sans-serif
Code: "JetBrains Mono", monospace
BG light: #ffffff    BG dark: #111
Ink light: #111      Ink dark: #fafafa
Muted: #666 / #999 (dark)
Accent: #e8450e (orange-red, hover + tags only)
Max-width: 680px
```

## Homepage structure
1. Minimal nav bar: "Cyrus" wordmark left, 4 links + theme toggle right
2. Hero: large title "Field Notes." + one-liner bio + 3 pill buttons
3. Latest section: simple list (title + date), linked to field-notes articles
4. AI News section: one-liner + link to /news.html
5. Minimal footer: copyright + social links

## Sub-pages
All share same nav bar. No page-specific mastheads. About page uses prose paragraphs, not timeline decorations.

## CSS strategy
New minimal CSS file (~200-300 lines). Extract functional styles for news/field-notes filter toolbars and card grids from old styles.css. Everything else rewritten.

## Privacy
No personal info (school, major, company, metrics, internal events).
