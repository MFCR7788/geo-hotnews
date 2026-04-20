import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionApi, formatPrice } from '../services/subscription.ts';

interface BillingPageProps {
  onBack?: () => void;
}

export default function BillingPage({ onBack }: BillingPageProps) {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // 加载支付历史
  useEffect(() => {
    async function loadPayments() {
      try {
        const result = await subscriptionApi.getPayments(page, 10);
        setPayments(result.data);
        setPagination(result.pagination);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, [page]);

  // 获取状态文本和样式
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { text: '已支付', className: 'bg-green-500/20 text-green-400' };
      case 'pending':
        return { text: '待支付', className: 'bg-yellow-500/20 text-yellow-400' };
      case 'failed':
        return { text: '失败', className: 'bg-red-500/20 text-red-400' };
      case 'expired':
        return { text: '已过期', className: 'bg-gray-500/20 text-gray-400' };
      case 'refunded':
        return { text: '已退款', className: 'bg-orange-500/20 text-orange-400' };
      default:
        return { text: status, className: 'bg-gray-500/20 text-gray-400' };
    }
  };

  // 获取支付方式文本
  const getChannelText = (channel: string | null) => {
    switch (channel) {
      case 'wechat':
        return '微信支付';
      case 'alipay':
        return '支付宝';
      default:
        return channel || '-';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold">账单与续费</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* 快速操作 */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold mb-1">管理订阅</h2>
              <p className="text-sm text-gray-400">查看和续费您的订阅</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/subscription')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
              >
                会员中心
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm"
              >
                升级方案
              </button>
            </div>
          </div>
        </div>

        {/* 支付历史 */}
        <div className="bg-white/5 rounded-2xl p-6">
          <h2 className="font-bold mb-4">支付记录</h2>

          {payments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>暂无支付记录</p>
              <p className="text-sm mt-1">购买套餐后将显示在这里</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                      <th className="pb-3 font-medium">订单号</th>
                      <th className="pb-3 font-medium">套餐</th>
                      <th className="pb-3 font-medium">金额</th>
                      <th className="pb-3 font-medium">支付方式</th>
                      <th className="pb-3 font-medium">状态</th>
                      <th className="pb-3 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const statusInfo = getStatusInfo(payment.status);
                      return (
                        <tr key={payment.id} className="border-b border-white/5">
                          <td className="py-4 text-sm font-mono">
                            {payment.orderNo.slice(0, 12)}...
                          </td>
                          <td className="py-4 text-sm">
                            {payment.billingCycle === 'yearly' ? '年付' : '月付'}
                          </td>
                          <td className="py-4 text-sm font-medium">
                            {formatPrice(payment.amount)}
                          </td>
                          <td className="py-4 text-sm">
                            {getChannelText(payment.payChannel)}
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.className}`}>
                              {statusInfo.text}
                            </span>
                          </td>
                          <td className="py-4 text-sm text-gray-400">
                            {payment.paidAt
                              ? new Date(payment.paidAt).toLocaleDateString('zh-CN')
                              : new Date(payment.createdAt).toLocaleDateString('zh-CN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    共 {pagination.total} 条记录
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1 text-sm">
                      {page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 发票说明 */}
        <div className="mt-6 p-4 bg-white/5 rounded-xl text-sm text-gray-400">
          <p>如需发票，请联系客服：support@mfcr.cn</p>
        </div>
      </div>
    </div>
  );
}
