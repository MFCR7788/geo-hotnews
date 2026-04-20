/**
 * 配额中间件
 * 检查用户配额，防止超限
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeUrl?: string;
  currentUsage?: number;
  limit?: number;
}

/**
 * 检查关键词配额
 */
export async function checkKeywordQuota(userId: string): Promise<QuotaCheckResult> {
  // 获取用户订阅和套餐
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true }
  });

  const planLimits = subscription ? JSON.parse(subscription.plan.limits) : { keywordLimit: 3 };

  // 无限配额
  if (planLimits.keywordLimit >= 999999) {
    return { allowed: true };
  }

  // 获取当前关键词数量（用户订阅的关键词数）
  const currentCount = await prisma.userKeyword.count({
    where: { userId }
  });

  if (currentCount >= planLimits.keywordLimit) {
    return {
      allowed: false,
      reason: `关键词数量已达上限（${currentCount}/${planLimits.keywordLimit}），请升级套餐`,
      upgradeUrl: '/pricing',
      currentUsage: currentCount,
      limit: planLimits.keywordLimit
    };
  }

  return { allowed: true };
}

/**
 * 检查 AI 分析配额
 */
export async function checkAIAnalysisQuota(userId: string): Promise<QuotaCheckResult> {
  // 获取用户订阅和套餐
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true }
  });

  const planLimits = subscription ? JSON.parse(subscription.plan.limits) : { aiAnalysisLimit: 50 };

  // 无限配额
  if (planLimits.aiAnalysisLimit >= 999999) {
    return { allowed: true };
  }

  // 获取当前使用量
  const usage = await prisma.usage.findFirst({
    where: { userId, type: 'ai_analysis' }
  });

  const currentCount = usage?.count || 0;

  // 检查是否需要重置配额（周期已过）
  if (usage && new Date() > usage.periodEnd) {
    return { allowed: true }; // 配额将在定时任务中重置
  }

  if (currentCount >= planLimits.aiAnalysisLimit) {
    return {
      allowed: false,
      reason: `本月 AI 分析次数已用完（${currentCount}/${planLimits.aiAnalysisLimit}），请升级套餐或等待次月重置`,
      upgradeUrl: '/pricing',
      currentUsage: currentCount,
      limit: planLimits.aiAnalysisLimit
    };
  }

  return { allowed: true };
}

/**
 * 增加 AI 分析使用次数
 */
export async function incrementAIAnalysisUsage(userId: string): Promise<void> {
  const now = new Date();

  // 获取订阅信息
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true }
  });

  const planLimits = subscription ? JSON.parse(subscription.plan.limits) : { aiAnalysisLimit: 50 };

  // 无限配额不记录
  if (planLimits.aiAnalysisLimit >= 999999) {
    return;
  }

  // 查找或创建使用记录
  const usage = await prisma.usage.findFirst({
    where: { userId, type: 'ai_analysis' }
  });

  if (usage) {
    // 检查是否需要重置
    if (new Date() > usage.periodEnd) {
      // 重置配额
      const nextPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await prisma.usage.update({
        where: { id: usage.id },
        data: { count: 1, periodStart: now, periodEnd: nextPeriodEnd }
      });
    } else {
      // 增加计数
      await prisma.usage.update({
        where: { id: usage.id },
        data: { count: { increment: 1 } }
      });
    }
  } else {
    // 创建新记录
    const nextPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await prisma.usage.create({
      data: {
        userId,
        type: 'ai_analysis',
        count: 1,
        periodStart: now,
        periodEnd: nextPeriodEnd
      }
    });
  }
}

/**
 * Express 中间件：检查关键词配额
 */
export function requireKeywordQuota() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 仅 POST 请求需要检查（创建关键词）
    if (req.method !== 'POST') {
      return next();
    }

    const userId = (req as any).userId;
    if (!userId) {
      return next();
    }

    const result = await checkKeywordQuota(userId);

    if (!result.allowed) {
      return res.status(402).json({
        error: 'QUOTA_EXCEEDED',
        message: result.reason,
        upgradeUrl: result.upgradeUrl,
        currentUsage: result.currentUsage,
        limit: result.limit
      });
    }

    next();
  };
}

/**
 * Express 中间件：检查 AI 分析配额
 */
export function requireAIAnalysisQuota() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    if (!userId) {
      return next();
    }

    const result = await checkAIAnalysisQuota(userId);

    if (!result.allowed) {
      return res.status(402).json({
        error: 'QUOTA_EXCEEDED',
        message: result.reason,
        upgradeUrl: result.upgradeUrl,
        currentUsage: result.currentUsage,
        limit: result.limit
      });
    }

    // 记录使用（仅在响应成功后才记录）
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        incrementAIAnalysisUsage(userId).catch(console.error);
      }
      return originalJson(data);
    };

    next();
  };
}
