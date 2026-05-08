# Google 登录完整配置指南

## 📋 前置准备

你已经有：
- ✅ Google Cloud 账户
- ✅ 绑定了 Visa 卡

---

## 第一步：在 Google Cloud Console 创建项目

### 1. 访问 Google Cloud Console
打开：https://console.cloud.google.com/

### 2. 创建新项目
1. 点击顶部的项目选择器
2. 点击「新建项目」
3. 项目名称：`cyrus-ai-learning-notes`（或你喜欢的名称）
4. 点击「创建」

### 3. 启用 Google Identity Services API
1. 在左侧菜单选择「API 和服务」→「库」
2. 搜索「Google Identity Services API」
3. 点击「启用」

---

## 第二步：创建 OAuth 2.0 凭据

### 1. 配置 OAuth 同意屏幕
1. 进入「API 和服务」→「OAuth 同意屏幕」
2. 选择「外部」（External）
3. 点击「创建」

**填写应用信息**：
- **应用名称**：`Cyrus的AI学习笔记`
- **用户支持电子邮件**：你的邮箱
- **应用首页**：`https://cyrustyj.xyz`
- **授权域**：`cyrustyj.xyz`
- **开发者联系信息**：你的邮箱

4. 点击「保存并继续」

**作用域（Scopes）**：
- 添加以下作用域：
  - `openid`
  - `email`
  - `profile`
- 点击「保存并继续」

**测试用户**（可选）：
- 如果应用处于测试模式，添加你的 Google 账号作为测试用户
- 点击「保存并继续」

### 2. 创建 OAuth 2.0 客户端 ID
1. 进入「API 和服务」→「凭据」
2. 点击「创建凭据」→「OAuth 客户端 ID」
3. 应用类型：选择「Web 应用」

**配置 Web 应用**：
- **名称**：`AI学习笔记 Web 客户端`
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

4. 点击「创建」

### 3. 保存凭据
创建完成后，会显示：
- **客户端 ID**：类似 `123456789-abc.apps.googleusercontent.com`
- **客户端密钥**：类似 `GOCSPX-xxxxxxxxxxxxx`

**⚠️ 重要**：复制并保存这两个值，稍后需要用到！

---

## 第三步：配置 Cloudflare Pages 环境变量

### 1. 登录 Cloudflare Dashboard
访问：https://dash.cloudflare.com/

### 2. 进入你的 Pages 项目
1. 选择「Workers & Pages」
2. 找到你的项目：`cyrus-ai-learning-notes`
3. 点击进入

### 3. 添加环境变量
1. 点击「Settings」→「Environment variables」
2. 点击「Add variable」

**添加以下变量**：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `GOOGLE_CLIENT_ID` | 你的客户端 ID | 从 Google Cloud Console 复制 |
| `GOOGLE_CLIENT_SECRET` | 你的客户端密钥 | 从 Google Cloud Console 复制 |
| `SESSION_SECRET` | 随机字符串（至少 32 位） | 用于加密 session |

**生成 SESSION_SECRET**：
```bash
# 在终端运行
openssl rand -base64 32
```

3. 点击「Save」

### 4. 重新部署
环境变量添加后，需要重新部署项目才能生效。

---

## 第四步：创建必要的 API 端点

我会帮你创建以下文件：

### 1. `/functions/api/auth/config.js`
返回 Google Client ID（前端需要）

### 2. `/functions/api/auth/google.js`
处理 Google 登录回调

### 3. `/functions/api/auth/me.js`
检查当前登录状态

### 4. `/functions/api/auth/logout.js`
处理登出

---

## 第五步：本地测试

### 1. 创建 `.dev.vars` 文件
在项目根目录创建 `.dev.vars`（不要提交到 Git）：

```bash
GOOGLE_CLIENT_ID=你的客户端ID
GOOGLE_CLIENT_SECRET=你的客户端密钥
SESSION_SECRET=你的随机密钥
```

### 2. 本地运行
```bash
cd /Volumes/tyj/Cyrus/GitHub/cyrus-ai-learning-notes
npx wrangler pages dev . --port 8080
```

### 3. 测试登录
1. 访问 `http://localhost:8080`
2. 点击「使用 Google 登录」按钮
3. 完成 Google 授权流程
4. 检查是否成功登录

---

## 第六步：部署到生产环境

### 1. 提交代码
```bash
git add .
git commit -m "feat: 完善 Google 登录功能"
git push
```

### 2. Cloudflare 自动部署
Cloudflare Pages 会自动检测到代码变更并重新部署。

### 3. 验证部署
1. 访问 `https://cyrustyj.xyz`
2. 测试 Google 登录功能

---

## 常见问题

### Q1: 登录时提示「redirect_uri_mismatch」
**解决方案**：
- 检查 Google Cloud Console 中的「已获授权的重定向 URI」
- 确保包含你的域名（包括 http/https）

### Q2: 登录后没有反应
**解决方案**：
- 检查浏览器控制台是否有错误
- 确认环境变量已正确配置
- 检查 Cloudflare Pages 的部署日志

### Q3: 本地测试正常，生产环境失败
**解决方案**：
- 确认 Cloudflare Pages 的环境变量已设置
- 检查域名是否在 Google Cloud Console 的授权列表中

---

## 安全建议

1. **不要将凭据提交到 Git**
   - `.dev.vars` 已在 `.gitignore` 中
   - 确保不要提交包含密钥的文件

2. **定期轮换密钥**
   - 建议每 3-6 个月更换一次 `SESSION_SECRET`

3. **限制授权域**
   - 只添加你实际使用的域名

4. **监控使用情况**
   - 在 Google Cloud Console 查看 API 使用情况
   - 设置配额警报

---

## 下一步

我现在会帮你创建所有必要的 API 端点文件。准备好了吗？
