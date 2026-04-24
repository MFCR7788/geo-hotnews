import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router();

// 获取 GEO 健康度概览
router.get('/health', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const period = (req.query.period as string) || '30d';
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period] || 30;
    const since = new Date(Date.now() - days * 86400000);

    // 并行查询各维度数据
    const [contentCount, publishedCount, monitorTasks, reports, notifications] = await Promise.all([
      prisma.content.count({ where: { userId } }),
      prisma.content.count({ where: { userId, status: 'published' } }),
      prisma.monitorTask.count({ where: { userId, isActive: true } }),
      prisma.geoReport.count({ where: { userId, createdAt: { gte: since } } }),
      prisma.notification.count({ where: { userId, isRead: false, createdAt: { gte: since } } }),
    ]);

    // 获取最近一次 GEO 检查和监测时间
    const lastReport = await prisma.geoReport.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, overallScore: true },
    });

    const lastMonitor = await prisma.monitorTask.findFirst({
      where: { userId, isActive: true },
      orderBy: { lastRunAt: 'desc' },
      select: { lastRunAt: true },
    });

    // 计算整体评分（基于最近报告）
    const overallScore = lastReport?.overallScore ?? 0;

    res.json({
      overallScore,
      geoScore: overallScore,
      contentGenerated: contentCount,
      contentCount,
      publishedCount,
      alerts: notifications,
      monitorQueries: monitorTasks,
      mentionRate: contentCount > 0 ? Math.round((publishedCount / contentCount) * 100) : 0,
      lastCheckAt: lastReport?.createdAt ?? null,
      lastMonitorAt: lastMonitor?.lastRunAt ?? null,
    });
  } catch (error) {
    console.error('Dashboard health error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

export default router;
