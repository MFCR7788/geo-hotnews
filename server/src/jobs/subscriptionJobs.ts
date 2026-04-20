/**
 * 订阅相关定时任务
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 重置所有用户的 AI 分析配额
 * 每月1日执行
 */
export async function resetUsageQuotas(): Promise<void> {
  const now = new Date();
  const nextPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  console.log(`[定时任务] 开始重置配额，当前时间: ${now.toISOString()}`);

  // 重置所有活跃订阅用户的 AI 分析配额
  const result = await prisma.usage.updateMany({
    where: {
      type: 'ai_analysis',
      periodEnd: { lt: now }
    },
    data: {
      count: 0,
      periodStart: now,
      periodEnd: nextPeriodEnd
    }
  });

  console.log(`[定时任务] 已重置 ${result.count} 条配额记录`);
}

/**
 * 检查并处理过期的订阅
 * 将 past_due 超过7天的订阅标记为 expired
 * 将 cancelled 订阅在到期后标记为 expired
 */
export async function checkExpiredSubscriptions(): Promise<void> {
  const now = new Date();
  const pastDueThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7天前

  console.log(`[定时任务] 检查过期订阅，当前时间: ${now.toISOString()}`);

  // 1. 处理 past_due 超过7天的订阅
  const pastDueResult = await prisma.subscription.updateMany({
    where: {
      status: 'past_due',
      updatedAt: { lt: pastDueThreshold }
    },
    data: {
      status: 'expired'
    }
  });

  if (pastDueResult.count > 0) {
    console.log(`[定时任务] ${pastDueResult.count} 个 past_due 订阅已过期`);
  }

  // 2. 处理 cancelled 订阅（已到周期结束）
  const cancelledSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'cancelled',
      currentPeriodEnd: { lt: now }
    }
  });

  for (const sub of cancelledSubscriptions) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'expired' }
    });
  }

  if (cancelledSubscriptions.length > 0) {
    console.log(`[定时任务] ${cancelledSubscriptions.length} 个 cancelled 订阅已到期`);
  }

  // 3. 处理 active 但已到期的订阅（未开启自动续费）
  const expiredActive = await prisma.subscription.updateMany({
    where: {
      status: 'active',
      autoRenew: false,
      currentPeriodEnd: { lt: now }
    },
    data: {
      status: 'expired'
    }
  });

  if (expiredActive.count > 0) {
    console.log(`[定时任务] ${expiredActive.count} 个未续费订阅已过期`);
  }

  // 4. 尝试自动续费（自动续费的订阅）
  const dueForRenewal = await prisma.subscription.findMany({
    where: {
      status: 'active',
      autoRenew: true,
      currentPeriodEnd: { lt: now }
    },
    take: 10 // 每次最多处理10个
  });

  for (const sub of dueForRenewal) {
    try {
      // 查找用户的最新成功订单
      const lastPayment = await prisma.payment.findFirst({
        where: {
          userId: sub.userId,
          status: 'paid',
          billingCycle: sub.billingCycle
        },
        orderBy: { paidAt: 'desc' }
      });

      if (lastPayment && lastPayment.transactionId) {
        // 有支付记录，创建新周期（这里简化处理，实际应调用支付网关）
        const newPeriodEnd = sub.billingCycle === 'yearly'
          ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
          : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            currentPeriodStart: now,
            currentPeriodEnd: newPeriodEnd
          }
        });

        console.log(`[定时任务] 已续期订阅 ${sub.id}，到期日: ${newPeriodEnd.toISOString()}`);
      } else {
        // 无支付记录，标记为 past_due
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'past_due' }
        });
        console.log(`[定时任务] 订阅 ${sub.id} 续费失败，标记为 past_due`);
      }
    } catch (error) {
      console.error(`[定时任务] 续费订阅 ${sub.id} 失败:`, error);
    }
  }
}

/**
 * 清理过期的待支付订单
 * 删除30分钟前仍未支付的 pending 订单
 */
export async function cleanupExpiredOrders(): Promise<void> {
  const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前

  const result = await prisma.payment.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: threshold }
    },
    data: {
      status: 'expired'
    }
  });

  if (result.count > 0) {
    console.log(`[定时任务] 已过期 ${result.count} 个待支付订单`);
  }
}

/**
 * 清理长期未活跃的设备记录
 */
export async function cleanupInactiveDevices(): Promise<void> {
  const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30天前

  const result = await prisma.device.deleteMany({
    where: {
      lastActiveAt: { lt: threshold }
    }
  });

  if (result.count > 0) {
    console.log(`[定时任务] 已清理 ${result.count} 个长期未活跃设备`);
  }
}

/**
 * 清理过期热点数据
 * 根据套餐的 hotspotDays 设置自动清理
 */
export async function cleanupExpiredHotspots(): Promise<void> {
  const now = new Date();

  // 获取各套餐的热点保留天数
  const plans = await prisma.plan.findMany({
    where: { isActive: true }
  });

  for (const plan of plans) {
    const limits = JSON.parse(plan.limits);
    const hotspotDays = limits.hotspotDays || 7;

    // 跳过无限保留
    if (hotspotDays >= 180) continue;

    const threshold = new Date(now.getTime() - hotspotDays * 24 * 60 * 60 * 1000);

    // 只清理该套餐用户的热点（需要关联查询）
    const usersWithPlan = await prisma.subscription.findMany({
      where: { planId: plan.id, status: 'active' },
      select: { userId: true }
    });

    if (usersWithPlan.length === 0) continue;

    const userIds = usersWithPlan.map(s => s.userId);

    // 获取这些用户订阅的关键词 ID
    const userKeywords = await prisma.userKeyword.findMany({
      where: { userId: { in: userIds } },
      select: { keywordId: true }
    });
    const keywordIds = userKeywords.map(uk => uk.keywordId);

    if (keywordIds.length === 0) continue;

    // 清理这些用户的过期热点
    const result = await prisma.hotspot.deleteMany({
      where: {
        keywordId: { in: keywordIds },
        createdAt: { lt: threshold }
      }
    });

    if (result.count > 0) {
      console.log(`[定时任务] 套餐 ${plan.name} 已清理 ${result.count} 条过期热点`);
    }
  }
}
