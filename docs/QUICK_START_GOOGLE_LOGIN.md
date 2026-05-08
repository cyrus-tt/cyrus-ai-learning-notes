# 🚀 Google 登录快速配置指南

## ✅ 你已经有的

你的项目已经包含完整的认证系统：
- ✅ `/functions/api/auth/google.js` - 处理 Google 登录
- ✅ `/functions/api/auth/me.js` - 检查登录状态
- ✅ `/functions/api/auth/logout.js` - 处理登出
- ✅ `/functions/api/auth/config.js` - 返回 Google Client ID
- ✅ `auth.js` - 前端认证逻辑
- ✅ `d1/migration_003_auth.sql` - 数据库表结构

**所有代码都已就绪，只需要配置！**

---

## 📝 配置步骤（只需 3 步）

### 第 1 步：在 Google Cloud Console 创建凭据

1. **访问 Google Cloud Console**
   - 打开：https://console.cloud.google.com/

2. **创建项目**（如果还没有）
   - 点击顶部项目选择器 → 「新建项目」
   - 项目名称：`cyrus-ai-notes`
   - 点击「创建」

3. **配置 OAuth 同意屏幕**
   - 进入「API 和服务」→「OAuth 同意屏幕」
   - 选择「外部」→「创建」
   - 填写：
     - 应用名称：`Cyrus的AI学习笔记`
     - 用户支持电子邮件：你的邮箱
     - 授权域：`cyrustyj.xyz`
     - 开发者联系信息：你的邮箱
   - 点击「保存并继续」→「保存并继续」→「保存并继续」

4. **创建 OAuth 2.0 客户端 ID**
   - 进入「API 和服务」→「凭据」
   - 点击「创建凭据」→「OAuth 客户端 ID」
   - 应用类型：「Web 应用」
   - 名称：`AI学习笔记 Web`
   - **已获授权的 JavaScript 来源**：
     ```
     https://cyrustyj.xyz
     https://www.cyrustyj.xyz
     http://localhost:8080
     ```
   - **已获授权的重定向 URI**：
     ```
     https://cyrustyj.xyz
     https://www.cyrustyj.xyz
     http://localhost:8080
     ```
   - 点击「创建」

5. **保存凭据**
   - 复制「客户端 ID」（类似：`123456-abc.apps.googleusercontent.com`）
   - 复制「客户端密钥」（类似：`GOCSPX-xxxxx`）

---

### 第 2 步：配置 Cloudflare Pages 环境变量

1. **登录 Cloudflare Dashboard**
   - 访问：https://dash.cloudflare.com/

2. **进入你的 Pages 项目**
   - 选择「Workers & Pages」
   - 找到项目：`cyrus-ai-learning-notes`

3. **添加环境变量**
   - 点击「Settings」→「Environment variables」
   - 点击「Add variable」

**添加这个变量**：

| 变量名 | 值 |
|--------|-----|
| `GOOGLE_CLIENT_ID` | 你的客户端 ID（从第 1 步复制） |

4. **保存并重新部署**
   - 点击「Save」
   - Cloudflare 会自动重新部署

---

### 第 3 步：绑定 D1 数据库

1. **在 Cloudflare Dashboard 中**
   - 进入你的 Pages 项目
   - 点击「Settings」→「Functions」
   - 找到「D1 database bindings」

2. **添加绑定**
   - Variable name: `DB`
   - D1 database: 选择你的数据库（如果没有，先创建一个）

3. **运行数据库迁移**
   ```bash
   cd /Volumes/tyj/Cyrus/GitHub/cyrus-ai-learning-notes

   # 创建数据库（如果还没有）
   npx wrangler d1 create cyrus-ai-notes-db

   # 运行迁移
   npx wrangler d1 execute cyrus-ai-notes-db --file=./d1/migration_003_auth.sql
   ```

---

## 🎉 完成！

现在访问你的网站：https://cyrustyj.xyz

你应该能看到：
- 右上角有「使用 Google 登录」按钮
- 点击后跳转到 Google 授权页面
- 授权后自动登录，显示你的头像和名字

---

## 🧪 本地测试

### 1. 创建 `.dev.vars` 文件

在项目根目录创建 `.dev.vars`（不要提交到 Git）：

```bash
GOOGLE_CLIENT_ID=你的客户端ID
```

### 2. 启动本地服务器

```bash
cd /Volumes/tyj/Cyrus/GitHub/cyrus-ai-learning-notes
npx wrangler pages dev . --port 8080 --d1 DB=cyrus-ai-notes-db
```

### 3. 测试

访问：http://localhost:8080

---

## ❓ 常见问题

### Q1: 点击登录按钮没反应
**检查**：
- 浏览器控制台是否有错误
- 确认 `GOOGLE_CLIENT_ID` 环境变量已设置
- 确认域名在 Google Cloud Console 的授权列表中

### Q2: 登录后提示「db_not_configured」
**解决**：
- 确认 D1 数据库已绑定到 Pages 项目
- 变量名必须是 `DB`
- 确认已运行数据库迁移

### Q3: 提示「redirect_uri_mismatch」
**解决**：
- 检查 Google Cloud Console 中的「已获授权的重定向 URI」
- 确保包含你正在访问的完整 URL

---

## 📊 数据库表结构

你的数据库已包含以下表（来自 `d1/migration_003_auth.sql`）：

- `users` - 用户信息（id, email, name, picture）
- `user_sessions` - 登录会话（session_id, user_id, expires_at）

---

## 🔒 安全提示

1. **不要提交 `.dev.vars` 到 Git**
   - 已在 `.gitignore` 中

2. **客户端密钥不需要配置**
   - 你的代码使用 Google 的公开 API 验证 token
   - 不需要在 Cloudflare 配置 `GOOGLE_CLIENT_SECRET`

3. **Session 有效期**
   - 默认 30 天
   - 可在 `functions/api/auth/google.js` 中修改

---

## 📞 需要帮助？

如果遇到问题：
1. 检查浏览器控制台错误
2. 检查 Cloudflare Pages 部署日志
3. 确认所有环境变量已正确设置

---

**就这么简单！只需 3 步配置，你的 Google 登录就能工作了！** 🎉
