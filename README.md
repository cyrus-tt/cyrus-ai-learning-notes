# Cyrus的AI学习笔记 - MVP

一个可直接部署到 Cloudflare Pages 的静态网站（无登录版）。

当前视觉风格：苹果官网参考的浅色极简版（大留白、细边框、低干扰卡片）。

## 目录结构

- `index.html` 主页与四个栏目（首页 / AI资讯 / AI干活 / 项目状态）
- `styles.css` 视觉样式与移动端适配
- `script.js` 数据与交互逻辑（搜索、筛选、看板）

## 本地预览（可选）

在目录里直接双击 `index.html` 也能看。若你想用本地服务：

```bash
cd /Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp
python3 -m http.server 8080
```

然后打开 `http://localhost:8080`。

## 上线到 Cloudflare Pages（新手版）

也可以直接看一步一步清单：`DEPLOY_CLOUDFLARE.md`

### 方案一：最简单（拖拽上传）

1. 打开 Cloudflare 控制台。
2. 进入 `Workers & Pages`。
3. 点击 `Create application` -> `Pages` -> `Upload assets`。
4. 项目名建议填：`cyrus-ai-notes`。
5. 把这个目录下的 3 个文件一起拖进去上传：
   - `index.html`
   - `styles.css`
   - `script.js`
6. 完成后会得到一个 `*.pages.dev` 预览域名。

### 方案二：Git 自动发布（后续推荐）

1. 把本目录推到 GitHub 仓库。
2. 在 Cloudflare Pages 选择 `Connect to Git`。
3. 选仓库后：
   - Framework preset 选 `None`
   - Build command 留空
   - Build output directory 留空或填 `.`
4. 保存并部署。

## 绑定你的域名 `cyrustyj.xyz`

> 你已经有 Cloudflare 账号和域名，按下面做即可。

1. 在 Cloudflare 控制台进入这个 Pages 项目。
2. 打开 `Custom domains` -> `Set up a custom domain`。
3. 输入 `cyrustyj.xyz`（或先用 `www.cyrustyj.xyz`）。
4. Cloudflare 会自动创建 DNS 记录，确认后等待生效（通常几分钟到半小时）。
5. 打开 `https://cyrustyj.xyz` 检查是否能访问。

## 后续维护内容（你只改一个文件）

后续只要改 `script.js` 里的三个数组：

- `newsItems`：AI资讯
- `playbookItems`：AI干活模板
- `projectItems`：项目状态

改完重新上传（或 Git 推送）即可更新网站。

## 下一版建议

1. 增加登录（邀请码或邮箱验证码）。
2. 增加后台（你不用改代码就能发内容）。
3. 增加订阅提醒（每周 AI 资讯邮件/飞书/微信通知）。
