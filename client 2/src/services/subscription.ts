// 订阅和支付 API 服务层

import { tokenStore } from './auth.js';

const API_BASE = '/api';

// 带认证的请求
async function requestWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = tokenStore.getAccessToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// 套餐数据接口
export interface Plan {
  id: string;
  planId: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  isActive: boolean;
  sortOrder: number;
}

export interface PlanLimits {
  keywordLimit: number;
  aiAnalysisLimit: number;
  hotspotDays: number;
  devices: number;
  sources: number;
  emailNotify: boolean;
  dailyDigest: boolean;
  priorityQueue: boolean;
}

// 订阅数据接口
export interface Subscription {
  id: string;
  status: string;
  billingCycle: string;
  planId: string;
  planName: string;
  autoRenew: boolean;
  startsAt: string;
  currentPeriodEnd: string;
}

export interface QuotaUsage {
  used: number;
  limit: number;
  unlimited: boolean;
  remaining?: number;
  periodEnd?: string;
}

export interface SubscriptionStatus {
  subscription: Subscription | null;
  usage: {
    keywords: QuotaUsage;
    aiAnalysis: QuotaUsage;
  };
}

// 支付数据接口
export interface Payment {
  id: string;
  orderNo: string;
  planId: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: string;
  payChannel: string | null;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
}

// 订阅 API
export const subscriptionApi = {
  // 获取所有套餐列表
  getPlans: () => requestWithAuth<Plan[]>('/subscription/plans'),

  // 获取当前订阅状态
  getStatus: () => requestWithAuth<SubscriptionStatus>('/subscription'),

  // 获取配额使用情况
  getUsage: () => requestWithAuth<{
    keywords: QuotaUsage;
    aiAnalysis: QuotaUsage;
  }>('/subscription/usage'),

  // 取消订阅
  cancel: () => requestWithAuth<{ message: string }>('/subscription/cancel', {
    method: 'POST'
  }),

  // 恢复订阅
  resume: () => requestWithAuth<{ message: string }>('/subscription/resume', {
    method: 'POST'
  }),

  // 获取支付历史
  getPayments: (page = 1, limit = 10) => requestWithAuth<{
    data: Payment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(`/subscription/payments?page=${page}&limit=${limit}`),

  // 管理员：手动续费
  adminRenew: (subscriptionId: string) =>
    requestWithAuth<{ message: string }>(`/admin/subscriptions/${subscriptionId}/renew`, {
      method: 'POST'
    }),

  // 管理员：取消订阅
  adminCancel: (subscriptionId: string) =>
    requestWithAuth<{ message: string }>(`/admin/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST'
    })
};

// 支付 API
export const paymentApi = {
  // 创建支付订单
  create: (planId: string, billingCycle: string, payChannel: string) =>
    requestWithAuth<{
      orderNo: string;
      payUrl: string;
      qrCode?: string;
      amount: number;
      expiresAt: string;
      success?: boolean;
      message?: string;
      isFree?: boolean;
    }>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle, payChannel })
    }),

  // 查询订单状态
  getOrder: (orderNo: string) =>
    requestWithAuth<Payment>(`/payments/order/${orderNo}`),

  // 沙箱模式测试支付
  sandboxCallback: (orderNo: string) =>
    requestWithAuth<{ success: boolean; message: string }>('/payments/callback/sandbox', {
      method: 'POST',
      body: JSON.stringify({ orderNo })
    })
};

// 格式化价格
export function formatPrice(cents: number): string {
  if (cents === 0) return '免费';
  return `¥${(cents / 100).toFixed(0)}`;
}

// 获取套餐限制文本
export function getPlanLimitText(plan: Plan): {
  keywords: string;
  ai: string;
  hotspotDays: string;
  devices: string;
} {
  const l = plan.limits;
  return {
    keywords: l.keywordLimit >= 999999 ? '无限制' : `${l.keywordLimit} 个`,
    ai: l.aiAnalysisLimit >= 999999 ? '无限制' : `${l.aiAnalysisLimit} 次/月`,
    hotspotDays: l.hotspotDays >= 180 ? '180 天' : `${l.hotspotDays} 天`,
    devices: l.devices === 0 ? '不支持' : `${l.devices} 台`
  };
}
