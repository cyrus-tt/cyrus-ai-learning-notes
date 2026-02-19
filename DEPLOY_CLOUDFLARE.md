# Cloudflare 上线清单（新版）

适用目录：`/Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp`

## 1. 先检查关键文件

至少确认这些文件存在：

- `index.html`
- `news.html`
- `news.js`
- `data/news.json`
- `resources.html`
- `resources.js`
- `styles.css`
- `robots.txt`
- `sitemap.xml`
- `site.webmanifest`
- `favicon.svg`
- `og-cover.svg`

## 2. Cloudflare Pages 部署

### 方式 A：上传资产（快速）

1. 登录 Cloudflare。
2. 进入 `Workers & Pages`。
3. 打开项目 `cyrus-ai-notes`（或新建同名项目）。
4. 选择 `Create deployment` / `Upload assets`。
5. 建议直接上传整个目录内容。
6. 发布后访问 `*.pages.dev` 检查。

### 方式 B：Git 自动发布（推荐）

1. Pages 项目连接 GitHub 仓库：`cyrus-tt/cyrus-ai-learning-notes`
2. 构建配置：
   - Framework：`None`
   - Build command：留空
   - Build output directory：`.`
3. 保存后，每次 `git push` 自动发布。

## 3. 绑定自定义域名

1. Pages 项目 -> `Custom domains`
2. 添加：`cyrustyj.xyz` 和 `www.cyrustyj.xyz`
3. 若域名未激活，先在注册商把 NS 改为：
   - `rita.ns.cloudflare.com`
   - `rocky.ns.cloudflare.com`

## 4. 上线后检查

- `https://cyrustyj.xyz/`：看到两个入口（AI资讯 / AI干货）
- `https://cyrustyj.xyz/news.html`：资讯搜索与筛选可用
- `https://cyrustyj.xyz/resources.html`：干货搜索与筛选可用
- `https://cyrustyj.xyz/sitemap.xml`：可访问
- `https://cyrustyj.xyz/robots.txt`：可访问

## 5. 常见问题

### 域名一直 pending

多数是 NS 仍在传播，继续等待并复查公网 NS。

### 页面样式或脚本丢失

确认 `styles.css`、`news.js`、`resources.js` 与 `html` 文件在同一层目录。
