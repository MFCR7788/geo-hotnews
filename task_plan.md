# MFCR-HotNews 用户系统升级计划

## 目标
为 MFCR-HotNews 添加多租户用户认证系统，支持个性化定制，打造面向公众的产品。

## 当前系统状态
- **后端**：Express + Prisma + SQLite + Socket.io
- **前端**：React + Vite + TailwindCSS v4 + Framer Motion
- **现有表**：Keyword / Hotspot / Notification / Setting
- **无用户认证**，所有 API 公开访问

---

## 阶段规划

### 阶段 1：基础设施搭建（P0 核心）
- [ ] 1.1 安装依赖（bcrypt / jsonwebtoken / express-rate-limit / multer）
- [ ] 1.2 扩展 Prisma Schema（User / UserSettings / 关联 Keyword/Notification）
- [ ] 1.3 创建数据库迁移
- [ ] 1.4 添加环境变量（JWT_SECRET / IMGBB_API_KEY / SENDGRID_API_KEY）
- [ ] 1.5 创建认证中间件（verifyToken / requireAuth / isAdmin）

### 阶段 2：后端认证 API（P0 核心）
- [ ] 2.1 创建用户注册 API（`POST /api/auth/register`）
- [ ] 2.2 创建用户登录 API（`POST /api/auth/login`）
- [ ] 2.3 创建 Token 刷新 API（`POST /api/auth/refresh`）
- [ ] 2.4 创建找回密码 API（`POST /api/auth/forgot-password`）
- [ ] 2.5 创建重置密码 API（`POST /api/auth/reset-password`）

### 阶段 3：用户数据隔离改造（P0 核心）
- [ ] 3.1 改造 Keyword 表（添加 userId 关联）
- [ ] 3.2 改造 Notification 表（添加 userId 关联）
- [ ] 3.3 创建用户设置 API（`GET/PUT /api/users/settings`）
- [ ] 3.4 改造关键词/通知路由（添加 userId 过滤）
- [ ] 3.5 改造热点查询（用户只看自己关键词匹配的热点）
- [ ] 3.6 改造 WebSocket（按用户房间推送）

### 阶段 4：管理员后台 API（P0 核心）
- [ ] 4.1 创建管理员用户列表 API（`GET /api/admin/users`）
- [ ] 4.2 创建封禁/解封用户 API（`PATCH /api/admin/users/:id/ban`）
- [ ] 4.3 创建用量统计 API（`GET /api/admin/stats`）
- [ ] 4.4 添加管理员中间件（isAdmin）

### 阶段 5：个性化定制功能（P1）
- [ ] 5.1 Logo 上传服务（ImgBB API 集成）
- [ ] 5.2 主题定制（深色/浅色/主题色）
- [ ] 5.3 数据源偏好
- [ ] 5.4 过滤/排序偏好
- [ ] 5.5 通知偏好

### 阶段 6：前端登录页面（P0 核心）
- [ ] 6.1 创建登录页面（`/login`）
- [ ] 6.2 创建注册页面（`/register`）
- [ ] 6.3 创建找回密码页面
- [ ] 6.4 集成 JWT Token 管理（localStorage）
- [ ] 6.5 添加请求拦截器（自动附加 Token）

### 阶段 7：前端个性化设置页面（P1）
- [ ] 7.1 创建设置页面（`/settings`）
- [ ] 7.2 Logo 上传组件
- [ ] 7.3 主题切换组件
- [ ] 7.4 偏好配置组件

### 阶段 8：前端管理员后台（P1）
- [ ] 8.1 创建管理员仪表盘（`/admin`）
- [ ] 8.2 用户列表组件
- [ ] 8.3 封禁/解封功能
- [ ] 8.4 用量统计图表

### 阶段 9：限流与安全（P1）
- [ ] 9.1 注册限流（1账号/分钟/IP）
- [ ] 9.2 登录限流（防暴力破解）
- [ ] 9.3 API 限流（100次/分钟/用户）
- [ ] 9.4 CORS 配置

### 阶段 10：邮件通知集成（P1）
- [ ] 10.1 SendGrid 邮件发送服务
- [ ] 10.2 注册验证邮件
- [ ] 10.3 找回密码邮件
- [ ] 10.4 热点通知邮件（按用户偏好）

### 阶段 11：微信小程序（未来 P3）
- [ ] 11.1 微信登录 API
- [ ] 11.2 账号绑定功能
- [ ] 11.3 小程序端适配

---

## 技术决策

### 认证方案
- JWT（Access Token 1小时 + Refresh Token 7天）
- 密码用 bcrypt（12轮加密）
- Refresh Token 存数据库，支持主动失效

### Logo 存储
- ImgBB 免费图床 API
- 上传后返回 URL，存入 UserSettings

### 邮件服务
- SendGrid API（免费100封/天）
- 注册验证 + 找回密码 + 热点通知

### 限流方案
- express-rate-limit（API 层）
- 简单内存限流（注册/登录场景）

### 多租户数据隔离
- 热点数据共享爬取（单库）
- 关键词/通知/设置按 userId 隔离
- 热点通过 keyword.userId 间接归属用户

---

## 文件清单

### 新增文件
```
server/src/
├── routes/
│   ├── auth.ts          # 认证路由
│   └── admin.ts         # 管理员路由
├── middleware/
│   ├── auth.ts          # 认证中间件
│   └── rateLimit.ts     # 限流中间件
├── services/
│   ├── imgbb.ts         # Logo 上传
│   └── sendgrid.ts      # 邮件发送
└── utils/
    └── jwt.ts           # JWT 工具

client/src/
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── ForgotPassword.tsx
│   ├── Settings.tsx
│   └── AdminDashboard.tsx
├── components/
│   ├── LogoUploader.tsx
│   ├── ThemeSelector.tsx
│   └── UserTable.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useTheme.ts
└── services/
    └── auth.ts          # 认证 API
```

### 修改文件
```
server/
├── prisma/schema.prisma         # 扩展 User/UserSettings
├── src/index.ts                 # 注册新路由
├── src/routes/keywords.ts       # 添加 userId 过滤
├── src/routes/notifications.ts  # 添加 userId 过滤
├── src/routes/hotspots.ts       # 按关键词归属过滤
├── src/jobs/hotspotChecker.ts   # 按用户推送通知
├── src/services/email.ts        # SendGrid 升级
└── .env / .env.example          # 新增环境变量

client/
├── src/App.tsx                 # 添加路由
├── src/services/api.ts          # 添加认证头
└── src/services/auth.ts         # 认证 API
```

---

## 依赖包

### 后端新增
- `bcrypt` — 密码加密
- `jsonwebtoken` — JWT 认证
- `express-rate-limit` — API 限流
- `multer` — 文件上传
- `nodemailer` — 邮件发送（已有）
- `axios` — ImgBB API 调用（已有）

### 前端新增
- `react-router-dom` — 页面路由
- 已有 framer-motion / lucide-react 可复用

---

## 遇到的问题

| 问题 | 尝试次数 | 解决方案 |
|------|---------|---------|
| （待记录） | - | - |

---

## 更新日志

| 日期 | 阶段 | 状态 | 备注 |
|------|------|------|------|
| 2026-04-18 | - | 进行中 | 完成项目架构分析 |
