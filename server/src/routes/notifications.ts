import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// 所有通知路由都需要登录
router.use(requireAuth);

// 获取当前用户的通知
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', unreadOnly } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: req.user!.userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } })
    ]);

    // 批量查询关联热点的 URL
    const hotspotIds = notifications.map(n => n.hotspotId).filter((id): id is string => !!id);
    const hotspots = hotspotIds.length > 0
      ? await prisma.hotspot.findMany({
          where: { id: { in: hotspotIds } },
          select: { id: true, url: true }
        })
      : [];
    const urlMap = new Map(hotspots.map(h => [h.id, h.url]));

    const data = notifications.map(n => ({
      ...n,
      hotspotUrl: n.hotspotId ? (urlMap.get(n.hotspotId) || null) : null
    }));

    res.json({
      data,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// 标记为已读
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    // 确认是本用户的通知
    const existing = await prisma.notification.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = await prisma.notification.update({
      where: { id: req.params.id as string },
      data: { isRead: true }
    });

    res.json(notification);
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// 全部标记为已读
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// 删除通知
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.notification.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// 清空当前用户所有通知
router.delete('/', async (req: Request, res: Response) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.user!.userId } });
    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
