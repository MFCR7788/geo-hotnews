import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { subscriptionApi } from '../services/subscription.ts';

interface SubscriptionPageProps {
  onBack?: () => void;
}

export default function SubscriptionPage({ onBack }: SubscriptionPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 检查支付结果
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setError(null);
      // 清除 URL 参数
      navigate('/subscription', { replace: true });
    }
  }, [searchParams, navigate]);

  // 加载订阅状态
  useEffect(() => {
    async function loadData() {
      try {
        const statusData = await subscriptionApi.getStatus();
        setStatus(statusData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // 取消订阅
  const handleCancel = async () => {
    if (!confirm('确定要取消自动续费吗？取消后您仍可使用当前套餐至到期日。')) {
      return;
    }

    setActionLoading(true);
    try {
      await subscriptionApi.cancel();
      // 重新加载状态
      const newStatus = await subscriptionApi.getStatus();
      setStatus(newStatus);
      alert('已取消自动续费');
    } catch (err: any) {
      alert('操作失败：' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 恢复订阅
  const handleResume = async () => {
    setActionLoading(true);
    try {
      await subscriptionApi.resume();
      // 重新加载状态
      const newStatus = await subscriptionApi.getStatus();
      setStatus(newStatus);
      alert('订阅已恢复');
    } catch (err: any) {
      alert('操作失败：' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const subscription = status?.subscription;
  const usage = status?.usage;

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-bold">会员中心</h1>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm"
          >
            升级方案
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* 当前方案卡片 */}
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">当前方案</div>
              <div className="text-2xl font-bold">{subscription?.planName || '免费版'}</div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${
              subscription?.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : subscription?.status === 'cancelled'
                ? 'bg-yellow-500/20 text-yellow-400'
                : subscription?.status === 'past_due'
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {subscription?.status === 'active' ? '有效' :
               subscription?.status === 'cancelled' ? '已取消' :
               subscription?.status === 'past_due' ? '待续费' : '已过期'}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">计费周期</div>
              <div className="text-lg">
                {subscription?.billingCycle === 'yearly' ? '年付' : '月付'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">到期时间</div>
              <div className="text-lg">
                {subscription?.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-CN')
                  : '永久'}
              </div>
            </div>
          </div>

          {/* 自动续费状态 */}
          {subscription?.billingCycle !== 'monthly' || subscription?.planId !== 'free' ? (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    subscription?.autoRenew ? 'bg-green-400' : 'bg-gray-500'
                  }`} />
                  <span className="text-sm">
                    {subscription?.autoRenew ? '自动续费已开启' : '自动续费已关闭'}
                  </span>
                </div>
                {subscription?.status === 'active' && subscription?.autoRenew ? (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="text-sm text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    {actionLoading ? '处理中...' : '取消自动续费'}
                  </button>
                ) : (subscription?.status === 'cancelled' || subscription?.status === 'expired') ? (
                  <button
                    onClick={handleResume}
                    disabled={actionLoading}
                    className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  >
                    {actionLoading ? '处理中...' : '恢复订阅'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* 配额使用情况 */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">配额使用</h2>

          {/* 监控词 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📡</span>
                <span className="font-medium">监控词</span>
              </div>
              <span className="text-sm text-gray-400">
                {usage?.keywords.used || 0} / {usage?.keywords.unlimited ? '∞' : usage?.keywords.limit}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{
                  width: usage?.keywords.unlimited
                    ? '100%'
                    : `${Math.min(100, ((usage?.keywords.used || 0) / (usage?.keywords.limit || 1)) * 100)}%`
                }}
              />
            </div>
            {usage?.keywords.remaining !== undefined && usage?.keywords.remaining >= 0 && !usage?.keywords.unlimited && (
              <div className="mt-1 text-xs text-gray-400">
                剩余 {usage.keywords.remaining} 个
              </div>
            )}
          </div>

          {/* AI 分析 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <span className="font-medium">AI 分析次数</span>
              </div>
              <span className="text-sm text-gray-400">
                {usage?.aiAnalysis.used || 0} / {usage?.aiAnalysis.unlimited ? '∞' : usage?.aiAnalysis.limit}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  (usage?.aiAnalysis.used || 0) >= (usage?.aiAnalysis.limit || 1)
                    ? 'bg-red-500'
                    : 'bg-gradient-to-r from-orange-500 to-red-500'
                }`}
                style={{
                  width: usage?.aiAnalysis.unlimited
                    ? '100%'
                    : `${Math.min(100, ((usage?.aiAnalysis.used || 0) / (usage?.aiAnalysis.limit || 1)) * 100)}%`
                }}
              />
            </div>
            {usage?.aiAnalysis.remaining !== undefined && usage?.aiAnalysis.remaining >= 0 && !usage?.aiAnalysis.unlimited && (
              <div className="mt-1 text-xs text-gray-400">
                剩余 {usage.aiAnalysis.remaining} 次
                {usage.aiAnalysis.periodEnd && (
                  <span className="ml-2">
                    （{new Date(usage.aiAnalysis.periodEnd).toLocaleDateString('zh-CN')} 重置）
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 升级提示 */}
        {subscription?.planId === 'free' && (
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6">
            <h3 className="font-bold mb-2">解锁更多能力</h3>
            <p className="text-sm text-gray-400 mb-4">
              升级到专业版，解锁 20 个监控词、500 次 AI 分析、邮件通知等更多功能
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium hover:opacity-90"
            >
              查看套餐方案
            </button>
          </div>
        )}

        {/* 功能对比 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/pricing')}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            查看完整功能对比 →
          </button>
        </div>
      </div>
    </div>
  );
}
