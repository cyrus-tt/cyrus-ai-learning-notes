# Cyrus的AI学习笔记 - MVP

一个可直接部署到 Cloudflare Pages 的静态网站（无登录版）。

当前结构：
- 首页只保留两个入口：`AI资讯`、`AI干货`
- `AI资讯`：聚合国内外社媒平台信息，附可执行动作
- `AI干货`：生产力模板与可复用工作流

## 目录结构

- `index.html`：双入口首页
- `news.html`：AI资讯页面
- `news.js`：资讯数据与筛选逻辑
- `resources.html`：AI干货页面
- `resources.js`：干货数据与筛选逻辑
- `styles.css`：全站样式
- `robots.txt`、`sitemap.xml`、`site.webmanifest`：SEO/索引文件
- `favicon.svg`、`og-cover.svg`：站点图标与分享图
- `consulting.html`、`work.html`：旧链接跳转页

## 本地预览

```bash
cd /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp
python3 -m http.server 8080
```

打开：`http://localhost:8080`

## 部署到 Cloudflare Pages

详细步骤见：`DEPLOY_CLOUDFLARE.md`

## 后续维护

### 改 AI资讯内容

编辑 `news.js` 里的 `newsItems` 数组。

### 改 AI干货内容

编辑 `resources.js` 里的 `resourcesItems` 数组。

### 发布更新

```bash
cd /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp
git add .
git commit -m "update: 网站内容更新"
git push
```

## 域名生效说明

若 `cyrustyj.xyz` 仍未生效，通常是 NS 传播中。一般几分钟到 24 小时，最长可能 48 小时。
