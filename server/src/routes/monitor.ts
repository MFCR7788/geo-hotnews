import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/monitor/tasks
router.get('/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const where: any = { userId: req.user!.userId };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const tasks = await prisma.monitorTask.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { records: true } } },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/monitor/tasks/:id
router.get('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const task = await prisma.monitorTask.findFirst({
      where: { id: String(req.params.id), userId: req.user!.userId },
      include: { records: { orderBy: { createdAt: 'desc' }, take: 100 } },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/monitor/tasks
router.post('/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, keywords, platforms, competitors, interval } = req.body;
    const task = await prisma.monitorTask.create({
      data: {
        userId: req.user!.userId,
        name,
        keywords: JSON.stringify(keywords || []),
        platforms: JSON.stringify(platforms || []),
        competitors: competitors ? JSON.stringify(competitors) : null,
        interval: interval || 60,
      },
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/monitor/tasks/:id
router.put('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, keywords, platforms, competitors, interval, isActive } = req.body;
    const task = await prisma.monitorTask.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name && { name }),
        ...(keywords && { keywords: JSON.stringify(keywords) }),
        ...(platforms && { platforms: JSON.stringify(platforms) }),
        ...(competitors !== undefined && { competitors: competitors ? JSON.stringify(competitors) : null }),
        ...(interval && { interval }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/monitor/tasks/:id
router.delete('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.monitorTask.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/monitor/tasks/:id/trigger
router.post('/tasks/:id/trigger', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.monitorTask.update({
      where: { id: String(req.params.id) },
      data: { lastRunAt: new Date() },
    });
    res.json({ message: 'Monitor triggered', taskId: String(req.params.id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger monitor' });
  }
});

// GET /api/monitor/records
router.get('/records', requireAuth, async (req: Request, res: Response) => {
  try {
    const { taskId, platform, startDate, endDate } = req.query;
    const where: any = { task: { userId: req.user!.userId } };
    if (taskId) where.taskId = String(taskId);
    if (platform) where.platform = String(platform);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }
    const records = await prisma.monitorRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// GET /api/monitor/stats
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.query;
    const where: any = { task: { userId: req.user!.userId } };
    if (taskId) where.taskId = String(taskId);

    const records = await prisma.monitorRecord.findMany({ where, orderBy: { createdAt: 'asc' }, take: 30 });
    const dailyStats = records.reduce((acc: any, r) => {
      const date = r.createdAt.toISOString().slice(0, 10);
      if (!acc[date]) acc[date] = { date, totalMentions: 0, totalRecommends: 0, count: 0 };
      acc[date].totalMentions += r.mentionCount;
      acc[date].totalRecommends += r.recommendCount;
      acc[date].count += 1;
      return acc;
    }, {});
    res.json(Object.values(dailyStats));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;