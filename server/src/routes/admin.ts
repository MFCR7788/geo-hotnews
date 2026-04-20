import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// 所有管理员路由都需要管理员权限
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * 获取用户列表
 */
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = (req.query.page as string) || '1'; const limit = (req.query.limit as string) || '20'; const search = (req.query.search as string) || undefined; const isBanned = (req.query.isBanned as string) || undefined;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search as string } },
        { name: { contains: search as string } }
      ];
    }
    if (isBanned !== undefined && isBanned !== '') {
      where.isBanned = isBanned === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isBanned: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              userKeywords: true,
              notifications: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

/**
 * GET /api/admin/users/:id
 * 获取单个用户详情
 */
router.get('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
        _count: {
          select: {
            userKeywords: true,
            notifications: true,
            refreshTokens: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ error: '获取用户详情失败' });
  }
});

/**
 * PATCH /api/admin/users/:id/ban
 * 封禁用户
 */
router.patch('/users/:id/ban', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // 不允许封禁自己
    if (id === req.user!.userId) {
      res.status(400).json({ error: '不能封禁自己的账号' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    // 不允许封禁其他管理员
    if (user.role === 'admin') {
      res.status(403).json({ error: '不能封禁管理员账号' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: true },
      select: { id: true, email: true, isBanned: true }
    });

    // 使该用户所有 Token 失效
    await prisma.refreshToken.deleteMany({ where: { userId: id } });

    res.json({ message: '用户已封禁', user: updated });
  } catch (error) {
    console.error('Admin ban user error:', error);
    res.status(500).json({ error: '封禁用户失败' });
  }
});

/**
 * PATCH /api/admin/users/:id/unban
 * 解封用户
 */
router.patch('/users/:id/unban', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: false },
      select: { id: true, email: true, isBanned: true }
    });

    res.json({ message: '用户已解封', user: updated });
  } catch (error) {
    console.error('Admin unban user error:', error);
    res.status(500).json({ error: '解封用户失败' });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * 修改用户角色
 */
router.patch('/users/:id/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const role = req.body.role as string;

    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ error: '角色只能是 user 或 admin' });
      return;
    }

    if (id === req.user!.userId && role !== 'admin') {
      res.status(400).json({ error: '不能降低自己的权限' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true }
    });

    res.json({ message: '角色已修改', user: updated });
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({ error: '修改角色失败' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * 删除用户（及其所有数据）
 */
router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (id === req.user!.userId) {
      res.status(400).json({ error: '不能删除自己的账号' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: '用户已删除' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

/**
 * GET /api/admin/stats
 * 平台统计数据
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      bannedUsers,
      totalKeywords,
      totalHotspots,
      todayHotspots,
      totalNotifications,
      activeTokens
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.keywordLibrary.count(),
      prisma.hotspot.count(),
      prisma.hotspot.count({ where: { createdAt: { gte: today } } }),
      prisma.notification.count(),
      prisma.refreshToken.count({ where: { expiresAt: { gt: new Date() } } })
    ]);

    // 最近7天新注册用户趋势
    const registrationTrend = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m-%d', createdAt) as date,
        COUNT(*) as count
      FROM User
      WHERE createdAt >= ${thisWeek.toISOString()}
      GROUP BY strftime('%Y-%m-%d', createdAt)
      ORDER BY date ASC
    ` as Array<{ date: string; count: number }>;

    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek,
        banned: bannedUsers,
        activeOnline: activeTokens // 活跃 Token 数作为近似在线估计
      },
      content: {
        keywords: totalKeywords,
        hotspots: totalHotspots,
        hotspotToday: todayHotspots,
        notifications: totalNotifications
      },
      trends: {
        registrations: registrationTrend
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

/**
 * GET /api/admin/subscriptions
 * 获取订阅列表
 */
router.get('/subscriptions', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const search = (req.query.search as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const skip = (page - 1) * limit;

    // 构建用户搜索条件
    const userWhere: any = {};
    if (search) {
      userWhere.OR = [
        { email: { contains: search } },
        { name: { contains: search } }
      ];
    }

    // 获取用户 ID 列表
    const matchingUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true }
    });
    const userIds = matchingUsers.map(u => u.id);

    // 构建订阅查询条件
    const where: any = {};
    if (userIds.length > 0) {
      where.userId = { in: userIds };
    }
    if (status) {
      where.status = status;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: { select: { planId: true, name: true } },
          user: { select: { email: true, name: true } }
        }
      }),
      prisma.subscription.count({ where })
    ]);

    const data = subscriptions.map(s => ({
      id: s.id,
      userId: s.userId,
      userEmail: s.user.email,
      userName: s.user.name,
      planId: s.plan.planId,
      planName: s.plan.name,
      status: s.status,
      billingCycle: s.billingCycle,
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      autoRenew: s.autoRenew,
      createdAt: s.createdAt.toISOString()
    }));

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get subscriptions error:', error);
    res.status(500).json({ error: '获取订阅列表失败' });
  }
});

/**
 * GET /api/admin/payments
 * 获取支付订单流水
 */
router.get('/payments', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const search = (req.query.search as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const skip = (page - 1) * limit;

    // 构建用户搜索条件
    const userWhere: any = {};
    if (search) {
      userWhere.OR = [
        { email: { contains: search } },
        { name: { contains: search } }
      ];
    }

    // 获取用户 ID 列表
    const matchingUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true }
    });
    const userIds = matchingUsers.map(u => u.id);

    // 构建订单查询条件
    const where: any = {};
    if (userIds.length > 0) {
      where.userId = { in: userIds };
    }
    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    // 获取关联的用户和套餐信息
    const paymentUserIds = [...new Set(payments.map(p => p.userId))];
    const paymentPlanIds = [...new Set(payments.map(p => p.planId))];
    const [paymentUsers, paymentPlans] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: paymentUserIds } },
        select: { id: true, email: true, name: true }
      }),
      prisma.plan.findMany({
        where: { id: { in: paymentPlanIds } },
        select: { id: true, name: true }
      })
    ]);

    const userMap = new Map(paymentUsers.map(u => [u.id, u]));
    const planMap = new Map(paymentPlans.map(p => [p.id, p]));

    const data = payments.map(p => {
      const user = userMap.get(p.userId);
      const plan = planMap.get(p.planId);
      return {
        id: p.id,
        orderNo: p.orderNo,
        userId: p.userId,
        userEmail: user?.email || '',
        userName: user?.name || null,
        planName: plan?.name || '',
        billingCycle: p.billingCycle,
        amount: p.amount,
        status: p.status,
        payChannel: p.payChannel,
        paidAt: p.paidAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString()
      };
    });

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get payments error:', error);
    res.status(500).json({ error: '获取订单流水失败' });
  }
});

/**
 * POST /api/admin/subscriptions/:id/renew
 * 手动续费（管理员操作）
 */
router.post('/subscriptions/:id/renew', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      res.status(404).json({ error: '订阅不存在' });
      return;
    }

    const plan = await prisma.plan.findUnique({ where: { id: subscription.planId } });
    if (!plan) {
      res.status(404).json({ error: '套餐不存在' });
      return;
    }

    // 计算新的订阅周期
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    let newPeriodStart = periodEnd > now ? periodEnd : now;
    let newPeriodEnd: Date;

    if (subscription.billingCycle === 'yearly') {
      newPeriodEnd = new Date(newPeriodStart);
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
    } else {
      newPeriodEnd = new Date(newPeriodStart);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    }

    // 更新订阅
    await prisma.subscription.update({
      where: { id },
      data: {
        status: 'active',
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        autoRenew: true,
        cancelledAt: null
      }
    });

    res.json({ message: '续费成功' });
  } catch (error) {
    console.error('Admin renew subscription error:', error);
    res.status(500).json({ error: '续费失败' });
  }
});

/**
 * POST /api/admin/subscriptions/:id/cancel
 * 管理员取消订阅
 */
router.post('/subscriptions/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    await prisma.subscription.update({
      where: { id },
      data: {
        status: 'cancelled',
        autoRenew: false,
        cancelledAt: new Date()
      }
    });

    res.json({ message: '订阅已取消' });
  } catch (error) {
    console.error('Admin cancel subscription error:', error);
    res.status(500).json({ error: '取消订阅失败' });
  }
});

export default router;
