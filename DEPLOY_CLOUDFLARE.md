# Cloudflare 上线清单（给新手）

适用项目目录：`/Volumes/tyj/Cyrus/Projects/主业/cyrus-ai-learning-notes-mvp`

## 0. 准备文件

确认目录里有这 3 个文件：

- `index.html`
- `styles.css`
- `script.js`

## 1. 先发布一个 Pages 测试地址（最简单）

1. 登录 Cloudflare。
2. 左侧进入 `Workers & Pages`。
3. 点击 `Create application`。
4. 选择 `Pages`。
5. 选择 `Upload assets`（不是 Git）。
6. `Project name` 填：`cyrus-ai-notes`。
7. 把上面 3 个文件拖进去上传。
8. 点击 `Deploy site`。

完成后会得到一个 `https://cyrus-ai-notes.pages.dev` 的地址。

## 2. 绑定你的域名 `cyrustyj.xyz`

1. 进入刚刚创建的 Pages 项目。
2. 点击 `Custom domains`。
3. 点击 `Set up a custom domain`。
4. 输入：`cyrustyj.xyz`。
5. 确认添加。

Cloudflare 通常会自动创建 DNS 记录（不用手动写）。

## 3. 等待生效 + 检查

1. 等 3-20 分钟。
2. 打开：`https://cyrustyj.xyz`。
3. 检查 3 件事：
   - 页面能打开
   - 顶部导航可跳转
   - 搜索和标签筛选可用

## 4. 后续更新内容

每次更新只需要改 `script.js` 里的三组数据：

- `newsItems`
- `playbookItems`
- `projectItems`

改完后，在 Pages 里重新上传 3 个文件即可。

## 5. 常见问题

### 打开域名显示 404

去 Pages 项目里确认 `index.html` 在根目录，不要放在子文件夹。

### 域名还没生效

在 Cloudflare 的 DNS 页面确认域名状态是 `Active`，再等一会。

### 页面样式丢失

确认 `styles.css` 和 `script.js` 与 `index.html` 在同一层目录。
