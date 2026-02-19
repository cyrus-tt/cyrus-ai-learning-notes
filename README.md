# Cyrus的AI学习笔记 - MVP

一个可直接部署到 Cloudflare Pages 的静态网站（无登录版）。

当前结构：
- 首页只保留两个入口：`AI咨询`、`AI干活`
- 公开项目状态看板已移除
- 已补齐基础 SEO（meta、OG、sitemap、robots、manifest）

## 目录结构

- `index.html`：入口页（双选项）
- `consulting.html`：AI咨询页面
- `work.html`：AI干活模板页
- `work.js`：AI干活模板数据与筛选逻辑
- `styles.css`：全站样式
- `robots.txt`、`sitemap.xml`、`site.webmanifest`：SEO/索引文件
- `favicon.svg`、`og-cover.svg`：站点图标与社交分享图

## 本地预览

```bash
cd /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp
python3 -m http.server 8080
```

打开：`http://localhost:8080`

## 部署到 Cloudflare Pages

详细步骤见：`DEPLOY_CLOUDFLARE.md`

## 后续维护

### 改 AI干活模板

编辑 `work.js` 里的 `workItems` 数组。

### 改 AI咨询页面

编辑 `consulting.html` 文案即可。

### 发布更新

```bash
cd /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp
git add .
git commit -m "update: 网站内容更新"
git push
```

## 域名生效说明

如果 `cyrustyj.xyz` 还未生效，通常是 NS 传播中。一般几分钟到 24 小时，最长可能 48 小时。
