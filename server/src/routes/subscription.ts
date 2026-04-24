/**
 * 订阅管理路由
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// 获取所有套餐列表（公开）
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    // 解析 limits JSON
    const plansWithParsedLimits = plans.map(plan => ({
      ...plan,
      limits: JSON.parse(plan.limits)
    }));

    res.json(plansWithParsedLimits);
  } catch (error) {
    console.error('获取套餐列表失败:', error);
    res.status(500).json({ error: '获取套餐列表失败' });
  }
});

// 获取当前用户订阅状态
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // 获取订阅信息
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    // 获取配额使用情况
    const usages = await prisma.usage.findMany({
      where: { userId }
    });

    // 获取关键词数量（用户订阅的关键词数）
    const keywordCount = await prisma.userKeyword.count({
      where: { userId }
    });

    // 如果没有订阅，创建一个 Free 订阅
    if (!subscription) {
      const freePlan = await prisma.plan.findUnique({ where: { planId: 'free' } });
      if (freePlan) {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        subscription = await prisma.subscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: 'active',
            billingCycle: 'monthly',
            startsAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: nextMonth,
            autoRenew: false
          },
          include: { plan: true }
        });

        // 初始化配额使用记录（检查是否存在）
        const existingUsage = await prisma.usage.findFirst({
          where: { userId, type: 'ai_analysis' }
        });
        if (!existingUsage) {
          await prisma.usage.create({
            data: {
              userId,
              type: 'ai_analysis',
              count: 0,
              periodStart: now,
              periodEnd: nextMonth
            }
          });
        }
      }
    }

    // 计算配额
    const planLimits = subscription ? JSON.parse(subscription.plan.limits) : { keywordLimit: 3, aiAnalysisLimit: 50 };
    const aiUsage = usages.find(u => u.type === 'ai_analysis');

    res.json({
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        planId: subscription.plan.planId,
        planName: subscription.plan.name,
        autoRenew: subscription.autoRenew,
        startsAt: subscription.startsAt,
        currentPeriodEnd: subscription.currentPeriodEnd
      } : null,
      usage: {
        keywords: {
          used: keywordCount,
          limit: planLimits.keywordLimit,
          unlimited: planLimits.keywordLimit >= 999999
        },
        aiAnalysis: {
          used: aiUsage?.count || 0,
          limit: planLimits.aiAnalysisLimit,
          unlimited: planLimits.aiAnalysisLimit >= 999999,
          periodEnd: aiUsage?.periodEnd
        }
      }
    });
  } catch (error) {
    console.error('获取订阅状态失败:', error);
    res.status(500).json({ error: '获取订阅状态失败' });
  }
});

// 取消订阅（取消自动续费）
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      return res.status(404).json({ error: '订阅不存在' });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({ error: '订阅已取消' });
    }

    const updated = await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'cancelled',
        autoRenew: false,
        cancelledAt: new Date()
      }
    });

    res.json({ message: '订阅已取消，到期后将降级为免费版', subscription: updated });
  } catch (error) {
    console.error('取消订阅失败:', error);
    res.status(500).json({ error: '取消订阅失败' });
  }
});

// 恢复订阅
router.post('/resume', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      return res.status(404).json({ error: '订阅不存在' });
    }

    if (subscription.status !== 'cancelled' && subscription.status !== 'expired') {
      return res.status(400).json({ error: '订阅无需恢复' });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: subscription.planId }
    });

    const now = new Date();
    const periodEnd = subscription.billingCycle === 'yearly'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const updated = await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'active',
        autoRenew: true,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd
      },
      include: { plan: true }
    });

    res.json({ message: '订阅已恢复', subscription: updated });
  } catch (error) {
    console.error('恢复订阅失败:', error);
    res.status(500).json({ error: '恢复订阅失败' });
  }
});

// 获取配额使用情况
router.get('/usage', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // 获取订阅和配额限制
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    const planLimits = subscription ? JSON.parse(subscription.plan.limits) : { keywordLimit: 3, aiAnalysisLimit: 50 };

    // 获取关键词数量（用户订阅的关键词数）
    const keywordCount = await prisma.userKeyword.count({
      where: { userId }
    });

    // 获取 AI 分析使用量
    const aiUsage = await prisma.usage.findFirst({
      where: { userId, type: 'ai_analysis' }
    });

    res.json({
      keywords: {
        used: keywordCount,
        limit: planLimits.keywordLimit,
        unlimited: planLimits.keywordLimit >= 999999,
        remaining: planLimits.keywordLimit >= 999999 ? -1 : Math.max(0, planLimits.keywordLimit - keywordCount)
      },
      aiAnalysis: {
        used: aiUsage?.count || 0,
        limit: planLimits.aiAnalysisLimit,
        unlimited: planLimits.aiAnalysisLimit >= 999999,
        remaining: planLimits.aiAnalysisLimit >= 999999 ? -1 : Math.max(0, planLimits.aiAnalysisLimit - (aiUsage?.count || 0)),
        periodEnd: aiUsage?.periodEnd
      }
    });
  } catch (error) {
    console.error('获取配额失败:', error);
    res.status(500).json({ error: '获取配额失败' });
  }
});

// 获取支付历史
router.get('/payments', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const total = await prisma.payment.count({ where: { userId } });

    res.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取支付历史失败:', error);
    res.status(500).json({ error: '获取支付历史失败' });
  }
});

export default router;
