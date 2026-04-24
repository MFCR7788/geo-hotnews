import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { prisma } from './db.js';
import keywordsRouter from './routes/keywords.js';
import hotspotsRouter from './routes/hotspots.js';
import settingsRouter from './routes/settings.js';
import notificationsRouter from './routes/notifications.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import subscriptionRouter from './routes/subscription.js';
import paymentsRouter from './routes/payments.js';
import uploadRouter from './routes/upload.js';
// GEO 引擎路由
import contentRouter from './routes/content.js';
import knowledgeRouter from './routes/knowledge.js';
import monitorRouter from './routes/monitor.js';
import strategyRouter from './routes/strategy.js';
import videoRouter from './routes/video.js';
import geoCheckRouter from './routes/geo-check.js';
import dashboardRouter from './routes/dashboard.js';
import { apiLimiter, loginLimiter, registerLimiter } from './middleware/rateLimit.js';
import { requireAuth } from './middleware/auth.js';
import { runHotspotCheck } from './jobs/hotspotChecker.js';
import { resetUsageQuotas, checkExpiredSubscriptions, cleanupExpiredOrders } from './jobs/subscriptionJobs.js';
import { setKeywordIo } from './routes/keywords.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 全局 API 限流（健康检查除外）
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return apiLimiter(req, res, next);
});

// 认证路由（带独立限流）
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);

// 业务路由
setKeywordIo(io); // 注入 io，让 keywords 路由可触发热点扫描
app.use('/api/keywords', keywordsRouter);
app.use('/api/hotspots', hotspotsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);

// 管理员路由
app.use('/api/admin', adminRouter);

// 订阅和支付路由
app.use('/api/subscription', subscriptionRouter);
app.use('/api/payments', paymentsRouter);

// 图片上传路由
app.use('/api/upload', uploadRouter);

// GEO 引擎路由（所有路由都需要认证）
app.use('/api/geo/content', requireAuth, contentRouter);
app.use('/api/geo/knowledge', requireAuth, knowledgeRouter);
app.use('/api/geo/monitor', requireAuth, monitorRouter);
app.use('/api/geo/strategy', requireAuth, strategyRouter);
app.use('/api/geo/video', requireAuth, videoRouter);
app.use('/api/geo/geo-check', requireAuth, geoCheckRouter);
app.use('/api/geo/dashboard', requireAuth, dashboardRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual trigger for hotspot check（需要登录才能触发）
app.post('/api/check-hotspots', requireAuth, async (req, res) => {
  try {
    await runHotspotCheck(io);
    res.json({ message: 'Hotspot check completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run hotspot check' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 用户加入自己的房间（基于 userId）
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`Socket ${socket.id} joined user room: ${userId}`);
  });

  socket.on('subscribe', (keywords: string[]) => {
    keywords.forEach(kw => socket.join(`keyword:${kw}`));
    console.log(`Socket ${socket.id} subscribed to:`, keywords);
  });

  socket.on('unsubscribe', (keywords: string[]) => {
    keywords.forEach(kw => socket.leave(`keyword:${kw}`));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Scheduled job: Run hotspot check every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('🔄 Running scheduled hotspot check...');
  try {
    await runHotspotCheck(io);
    console.log('✅ Scheduled hotspot check completed');
  } catch (error) {
    console.error('❌ Scheduled hotspot check failed:', error);
  }
});

// 每月1日 00:00 重置配额
cron.schedule('0 0 1 * *', async () => {
  console.log('🔄 Resetting usage quotas...');
  try {
    await resetUsageQuotas();
    console.log('✅ Usage quotas reset completed');
  } catch (error) {
    console.error('❌ Reset quotas failed:', error);
  }
});

// 每小时检查订阅过期
cron.schedule('0 * * * *', async () => {
  try {
    await checkExpiredSubscriptions();
  } catch (error) {
    console.error('❌ Check expired subscriptions failed:', error);
  }
});

// 每日 03:00 清理过期订单
cron.schedule('0 3 * * *', async () => {
  try {
    await cleanupExpiredOrders();
    console.log('✅ Cleaned up expired orders');
  } catch (error) {
    console.error('❌ Cleanup expired orders failed:', error);
  }
});

// Export for use in other modules
export { io };

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
  🔥 GEO星擎 服务启动成功!
  📡 Server running on http://localhost:${PORT}
  🔌 WebSocket ready
  🔒 用户认证系统已启用
  ⏰ Hotspot check scheduled every 30 minutes
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
