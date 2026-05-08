# ✅ Google 登录配置检查清单

## 在 Google Cloud Console

- [ ] 创建了项目
- [ ] 配置了 OAuth 同意屏幕
- [ ] 创建了 OAuth 2.0 客户端 ID
- [ ] 添加了授权的 JavaScript 来源：
  - [ ] `https://cyrustyj.xyz`
  - [ ] `https://www.cyrustyj.xyz`
  - [ ] `http://localhost:8080`（用于本地测试）
- [ ] 添加了授权的重定向 URI（同上）
- [ ] 复制并保存了客户端 ID

---

## 在 Cloudflare Dashboard

- [ ] 进入了 Pages 项目设置
- [ ] 添加了环境变量 `GOOGLE_CLIENT_ID`
- [ ] 绑定了 D1 数据库（变量名：`DB`）
- [ ] 运行了数据库迁移 `d1/migration_003_auth.sql`
- [ ] 重新部署了项目

---

## 本地测试（可选）

- [ ] 创建了 `.dev.vars` 文件
- [ ] 添加了 `GOOGLE_CLIENT_ID` 到 `.dev.vars`
- [ ] 运行了 `npx wrangler pages dev`
- [ ] 测试了登录功能

---

## 验证

- [ ] 访问网站能看到「使用 Google 登录」按钮
- [ ] 点击按钮能跳转到 Google 授权页面
- [ ] 授权后能成功登录
- [ ] 登录后能看到用户头像和名字
- [ ] 点击「退出」能成功登出

---

## 需要的信息

从 Google Cloud Console 获取：
- **客户端 ID**：`_______________________________`

配置到 Cloudflare Pages 环境变量：
- `GOOGLE_CLIENT_ID` = 你的客户端 ID

---

## 快速命令

```bash
# 创建 D1 数据库
npx wrangler d1 create cyrus-ai-notes-db

# 运行数据库迁移
npx wrangler d1 execute cyrus-ai-notes-db --file=./d1/migration_003_auth.sql

# 本地测试
npx wrangler pages dev . --port 8080 --d1 DB=cyrus-ai-notes-db
```

---

**完成所有勾选项后，你的 Google 登录就配置好了！** 🎉
