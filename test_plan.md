# 全面功能测试计划 - yupi-hot-monitor

## 测试目标
对 yupi-hot-monitor 项目进行全面系统的功能测试，覆盖前端应用与后端服务的所有核心业务流程。

## 测试范围

### 前端应用 (client 2/)
- [ ] 用户认证页面（登录/注册/找回密码）
- [ ] 管理员后台 (AdminPage)
- [ ] 计费页面 (BillingPage)
- [ ] 定价页面 (PricingPage)
- [ ] 设置页面 (SettingsPage)
- [ ] 订阅页面 (SubscriptionPage)
- [ ] 核心组件功能（FilterSortBar、UI组件）
- [ ] 服务层（API调用、认证、Socket、订阅）

### 后端服务 (server/)
- [ ] 认证 API（注册/登录/Token刷新/密码重置）
- [ ] 关键词管理 API
- [ ] 热点数据 API
- [ ] 通知系统 API
- [ ] 管理员 API
- [ ] 设置管理 API
- [ ] 支付 API
- [ ] 文件上传 API
- [ ] 中间件（认证/限流/配额/上传）
- [ ] 定时任务（热点检查/订阅任务）
- [ ] 外部服务集成（AI分析/搜索/邮件/Twitter/支付）

### 非功能性需求
- [ ] 性能测试（响应时间）
- [ ] 安全性测试（认证/授权/输入验证）
- [ ] 错误处理测试

## 测试阶段

### Phase 1: 项目结构与依赖分析 ✓
**状态**: 进行中
**任务**:
- 分析项目架构和技术栈
- 确认所有功能模块
- 检查依赖配置完整性
- **输出**: 功能模块清单、API接口清单

### Phase 2: 后端API功能测试
**状态**: 待开始
**任务**:
- 测试所有RESTful API端点
- 验证请求/响应格式
- 测试正常场景、边界条件、异常情况
- **输出**: API测试结果记录

### Phase 3: 前端功能测试
**状态**: 待开始
**任务**:
- 测试页面渲染和路由
- 测试用户交互流程
- 测试表单验证
- 测试响应式布局
- **输出**: 前端测试结果记录

### Phase 4: 集成测试
**状态**: 待开始
**任务**:
- 测试前后端集成
- 测试WebSocket实时通信
- 测试外部服务集成
- **输出**: 集成测试结果

### Phase 5: 缺陷分析与分类
**状态**: 待开始
**任务**:
- 汇总所有发现的问题
- 按严重程度分级（Critical/Major/Minor/Info）
- 分类缺陷类型
- **输出**: 缺陷清单

### Phase 6: 测试报告编写
**状态**: 待开始
**任务**:
- 编写完整测试报告
- 包含测试范围、方法、结果统计
- 提供改进建议
- **输出**: 最终测试报告

## 测试方法论

### 测试类型
1. **功能测试** - 验证业务逻辑正确性
2. **接口测试** - 验证API契约
3. **UI测试** - 验证用户界面交互
4. **边界测试** - 验证极限条件处理
5. **异常测试** - 验证错误处理机制
6. **安全测试** - 验证认证和授权

### 缺陷分级标准
- **P0-Critical**: 系统崩溃、数据丢失、安全漏洞
- **P1-Major**: 主要功能不可用、核心流程阻断
- **P2-Minor**: 次要功能异常、用户体验问题
- **P3-Info**: 建议优化、代码规范问题

## 关键文件路径

### 后端核心文件
```
server/src/
├── index.ts                    # 应用入口
├── routes/                     # API路由
│   ├── auth.ts                # 认证
│   ├── admin.ts               # 管理
│   ├── hotspots.ts            # 热点
│   ├── keywords.ts            # 关键词
│   ├── notifications.ts       # 通知
│   ├── payments.ts            # 支付
│   ├── settings.ts            # 设置
│   ├── subscription.ts        # 订阅
│   └── upload.ts              # 上传
├── middleware/                 # 中间件
│   ├── auth.ts                # 认证中间件
│   ├── quota.ts               # 配额限制
│   ├── rateLimit.ts           # 限流
│   └── upload.ts              # 上传处理
├── services/                   # 业务服务
│   ├── ai.ts                  # AI分析
│   ├── chinaSearch.ts         # 中国搜索
│   ├── email.ts               # 邮件
│   ├── imgUpload.ts           # 图片上传
│   ├── newsSources.ts         # 新闻源
│   ├── search.ts              # 搜索
│   ├── twitter.ts             # Twitter
│   └── xorPay.ts              # 支付
└── jobs/                       # 定时任务
    ├── hotspotChecker.ts      # 热点检查
    └── subscriptionJobs.ts    # 订阅任务
```

### 前端核心文件
```
client 2/src/
├── App.tsx                     # 主应用
├── pages/                      # 页面组件
│   ├── AdminPage.tsx          # 管理后台
│   ├── BillingPage.tsx        # 计费
│   ├── ForgotPasswordPage.tsx # 找回密码
│   ├── LoginPage.tsx          # 登录
│   ├── PricingPage.tsx        # 定价
│   ├── RegisterPage.tsx       # 注册
│   ├── SettingsPage.tsx       # 设置
│   └── SubscriptionPage.tsx   # 订阅
├── components/                 # UI组件
│   └── FilterSortBar.tsx      # 过滤排序
├── services/                   # 服务层
│   ├── api.ts                 # API封装
│   ├── auth.ts                # 认证服务
│   ├── socket.ts              # Socket服务
│   └── subscription.ts        # 订阅服务
└── context/                    # 上下文
    └── AuthContext.tsx         # 认证上下文
```

## 遇到的问题

| 问题 | 尝试次数 | 解决方案 |
|------|---------|---------|
| （待记录） | - | - |

## 更新日志

| 日期 | 阶段 | 状态 | 备注 |
|------|------|------|------|
| 2026-04-22 | Phase 1 | 进行中 | 开始全面功能测试 |
