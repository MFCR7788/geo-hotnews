/**
 * 支付路由
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { createXorPayOrder, verifyXorPayCallback } from '../services/xorPay.js';

const router = Router();

// 创建支付订单
router.post('/create', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { planId, billingCycle, payChannel } = req.body;

    // 验证参数
    if (!planId || !billingCycle || !payChannel) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ error: '无效的计费周期' });
    }

    if (!['wechat', 'alipay'].includes(payChannel)) {
      return res.status(400).json({ error: '无效的支付渠道' });
    }

    // 获取套餐信息
    const plan = await prisma.plan.findUnique({
      where: { planId }
    });

    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: '套餐不存在或已下线' });
    }

    // 计算金额
    const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

    // 免费套餐直接激活
    if (amount === 0) {
      const now = new Date();
      const periodEnd = billingCycle === 'yearly'
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          planId: plan.id,
          status: 'active',
          billingCycle,
          startsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: false,
          cancelledAt: null
        },
        create: {
          userId,
          planId: plan.id,
          status: 'active',
          billingCycle,
          startsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: false
        }
      });

      // 重置配额周期
      await prisma.usage.upsert({
        where: { userId_type: { userId, type: 'ai_analysis' } },
        update: { count: 0, periodStart: now, periodEnd },
        create: {
          userId,
          type: 'ai_analysis',
          count: 0,
          periodStart: now,
          periodEnd
        }
      });

      return res.json({
        success: true,
        message: '免费套餐已激活',
        isFree: true
      });
    }

    // 生成订单号
    const orderNo = `MF${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 计算订单过期时间（30分钟后）
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 创建订单记录
    const payment = await prisma.payment.create({
      data: {
        orderNo,
        userId,
        planId: plan.id,
        billingCycle,
        amount,
        status: 'pending',
        payChannel,
        expiresAt
      }
    });

    // 调用虎皮椒创建支付订单
    try {
      const xorPayResult = await createXorPayOrder({
        orderNo,
        amount,
        title: `GEO星擎 ${plan.name} ${billingCycle === 'yearly' ? '年付' : '月付'}`,
        payChannel,
        returnUrl: `${process.env.CLIENT_URL}/subscription?payment=success`
      });

      res.json({
        orderNo,
        payUrl: xorPayResult.payUrl,
        qrCode: xorPayResult.qrCode,
        amount: amount / 100,
        expiresAt
      });
    } catch (payError: any) {
      // 更新订单状态为失败
      await prisma.payment.update({
        where: { orderNo },
        data: { status: 'failed' }
      });

      throw payError;
    }
  } catch (error: any) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({ error: error.message || '创建订单失败' });
  }
});

// 查询订单状态
router.get('/order/:orderNo', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderNo = req.params.orderNo as string;

    const payment = await prisma.payment.findUnique({
      where: { orderNo }
    });

    if (!payment) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 验证订单属于当前用户
    if (payment.userId !== userId) {
      return res.status(403).json({ error: '无权访问此订单' });
    }

    res.json(payment);
  } catch (error) {
    console.error('查询订单失败:', error);
    res.status(500).json({ error: '查询订单失败' });
  }
});

// 虎皮椒支付回调
router.post('/callback/xorpay', async (req, res) => {
  try {
    const params = req.body;

    console.log('[支付回调] 收到回调:', JSON.stringify(params));

    // 验证签名
    if (!verifyXorPayCallback(params)) {
      console.error('[支付回调] 签名验证失败');
      return res.status(400).send('sign fail');
    }

    const { out_trade_no, trade_status, total_fee, pay_type, trade_no } = params;

    // 查询订单
    const payment = await prisma.payment.findUnique({
      where: { orderNo: out_trade_no }
    });

    if (!payment) {
      console.error('[支付回调] 订单不存在:', out_trade_no);
      return res.status(404).send('order not found');
    }

    // 检查是否已处理（防重复）
    if (payment.status === 'paid' && payment.transactionId) {
      console.log('[支付回调] 订单已处理，跳过:', out_trade_no);
      return res.send('success');
    }

    // 检查订单是否过期
    if (payment.status === 'pending' && new Date() > payment.expiresAt) {
      await prisma.payment.update({
        where: { orderNo: out_trade_no },
        data: { status: 'expired' }
      });
      console.log('[支付回调] 订单已过期:', out_trade_no);
      return res.send('success');
    }

    // 处理支付成功
    if (trade_status === 'TRADE_SUCCESS') {
      const now = new Date();

      // 获取套餐信息
      const plan = await prisma.plan.findUnique({
        where: { id: payment.planId }
      });

      // 计算订阅周期
      const periodEnd = payment.billingCycle === 'yearly'
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      // 更新订单状态
      await prisma.payment.update({
        where: { orderNo: out_trade_no },
        data: {
          status: 'paid',
          payChannel: pay_type,
          transactionId: trade_no,
          paidAt: now,
          callbackRaw: JSON.stringify(params)
        }
      });

      // 创建或更新订阅
      await prisma.subscription.upsert({
        where: { userId: payment.userId },
        update: {
          planId: payment.planId,
          status: 'active',
          billingCycle: payment.billingCycle,
          startsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
          cancelledAt: null
        },
        create: {
          userId: payment.userId,
          planId: payment.planId,
          status: 'active',
          billingCycle: payment.billingCycle,
          startsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true
        }
      });

      // 重置配额使用量
      await prisma.usage.upsert({
        where: { userId_type: { userId: payment.userId, type: 'ai_analysis' } },
        update: { count: 0, periodStart: now, periodEnd },
        create: {
          userId: payment.userId,
          type: 'ai_analysis',
          count: 0,
          periodStart: now,
          periodEnd
        }
      });

      console.log('[支付回调] 支付成功，订阅已激活:', out_trade_no, '用户:', payment.userId);
    } else {
      // 支付失败
      await prisma.payment.update({
        where: { orderNo: out_trade_no },
        data: {
          status: 'failed',
          callbackRaw: JSON.stringify(params)
        }
      });
      console.log('[支付回调] 支付失败:', out_trade_no);
    }

    res.send('success');
  } catch (error) {
    console.error('[支付回调] 处理失败:', error);
    res.status(500).send('error');
  }
});

// 沙箱模式测试回调（用于本地测试）
router.post('/callback/sandbox', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { orderNo } = req.body;

    console.log('[沙箱回调] 模拟支付成功:', orderNo);

    const payment = await prisma.payment.findUnique({
      where: { orderNo }
    });

    if (!payment || payment.userId !== userId) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const now = new Date();
    const periodEnd = payment.billingCycle === 'yearly'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    // 更新订单
    await prisma.payment.update({
      where: { orderNo },
      data: {
        status: 'paid',
        paidAt: now
      }
    });

    // 创建订阅
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        planId: payment.planId,
        status: 'active',
        billingCycle: payment.billingCycle,
        startsAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
        cancelledAt: null
      },
      create: {
        userId,
        planId: payment.planId,
        status: 'active',
        billingCycle: payment.billingCycle,
        startsAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true
      }
    });

    // 重置配额
    await prisma.usage.upsert({
      where: { userId_type: { userId, type: 'ai_analysis' } },
      update: { count: 0, periodStart: now, periodEnd },
      create: {
        userId,
        type: 'ai_analysis',
        count: 0,
        periodStart: now,
        periodEnd
      }
    });

    res.json({ success: true, message: '沙箱支付成功' });
  } catch (error) {
    console.error('[沙箱回调] 失败:', error);
    res.status(500).json({ error: '处理失败' });
  }
});

export default router;
