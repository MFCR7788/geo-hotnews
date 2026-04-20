import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionApi, paymentApi, formatPrice, getPlanLimitText } from '../services/subscription.ts';
import type { Plan } from '../services/subscription.ts';
import { authApi } from '../services/auth.ts';

interface PricingPageProps {
  onBack?: () => void;
}

export default function PricingPage({ onBack }: PricingPageProps) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载套餐列表和当前订阅状态
  useEffect(() => {
    async function loadData() {
      try {
        const [plansData, statusData] = await Promise.all([
          subscriptionApi.getPlans(),
          authApi.isLoggedIn() ? subscriptionApi.getStatus().catch(() => null) : Promise.resolve(null)
        ]);

        setPlans(plansData);
        if (statusData?.subscription) {
          setCurrentPlanId(statusData.subscription.planId);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // 购买套餐
  const handlePurchase = async (plan: Plan) => {
    if (!authApi.isLoggedIn()) {
      // 未登录，跳转到登录页
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    setPurchasing(plan.planId);
    setError(null);

    try {
      // 免费套餐直接激活
      if (plan.priceMonthly === 0 && plan.priceYearly === 0) {
        const result = await paymentApi.create(plan.planId, billingCycle, 'free');
        if (result.isFree) {
          alert('免费套餐已激活！');
          navigate('/');
          return;
        }
      }

      // 显示支付方式选择
      const channel = prompt('请选择支付方式（输入数字）：\n1. 微信支付\n2. 支付宝\n（当前为沙箱模式，输入任意内容测试）') || 'sandbox';

      // 创建订单
      const result = await paymentApi.create(plan.planId, billingCycle, channel.includes('1') ? 'wechat' : 'alipay');

      if (result.payUrl) {
        // 沙箱模式：直接测试支付
        if (result.payUrl.includes('sandbox-success')) {
          await paymentApi.sandboxCallback(result.orderNo);
          alert(`恭喜！${plan.name}已成功开通！`);
          navigate('/subscription');
        } else {
          // 跳转到支付页面
          window.location.href = result.payUrl;
        }
      }
    } catch (err: any) {
      setError(err.message);
      alert('购买失败：' + err.message);
    } finally {
      setPurchasing(null);
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-bold">选择您的方案</h1>
          </div>
          <div className="text-sm text-gray-400">
            {authApi.isLoggedIn() ? '已登录' : '未登录'}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-12 text-center">
        <h2 className="text-3xl font-bold mb-4">解锁全部能力，监测热点快人一步</h2>
        <p className="text-gray-400 mb-8">选择最适合您的方案，开启高效热点监测之旅</p>

        {/* 计费周期切换 */}
        <div className="inline-flex items-center gap-2 bg-white/5 rounded-full p-1 mb-8">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-full text-sm transition ${
              billingCycle === 'monthly'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            月付
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-full text-sm transition ${
              billingCycle === 'yearly'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            年付 <span className="text-green-400 ml-1">省20%+</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const limits = getPlanLimitText(plan);
            const isCurrent = currentPlanId === plan.planId;
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const monthlyPrice = billingCycle === 'yearly' ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;

            return (
              <div
                key={plan.planId}
                className={`relative rounded-2xl p-6 ${
                  plan.planId === 'pro'
                    ? 'bg-gradient-to-b from-blue-500/20 to-purple-500/20 border-2 border-blue-500/50'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                {/* 当前方案标签 */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 rounded-full text-xs font-medium">
                    当前方案
                  </div>
                )}

                {/* 推荐标签 */}
                {plan.planId === 'pro' && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-xs font-medium">
                    推荐
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>

                {/* 价格 */}
                <div className="text-center mb-6">
                  {price === 0 ? (
                    <div className="text-3xl font-bold">免费</div>
                  ) : (
                    <>
                      <div className="text-4xl font-bold">
                        {formatPrice(price)}
                        <span className="text-base text-gray-400 font-normal">
                          /{billingCycle === 'yearly' ? '年' : '月'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && monthlyPrice > 0 && (
                        <div className="text-sm text-gray-400 mt-1">
                          每月仅需 {formatPrice(monthlyPrice)}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 功能列表 */}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{limits.keywords} 监控词</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{limits.ai} AI 分析</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>热点保留 {limits.hotspotDays}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg className={`w-5 h-5 ${plan.limits.emailNotify ? 'text-green-400' : 'text-gray-500'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={plan.limits.emailNotify ? '' : 'text-gray-500'}>
                      邮件通知 {plan.limits.emailNotify ? (plan.limits.dailyDigest ? '+ 定时日报' : '') : '❌'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg className={`w-5 h-5 ${plan.limits.devices > 0 ? 'text-green-400' : 'text-gray-500'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={plan.limits.devices > 0 ? '' : 'text-gray-500'}>
                      多设备登录 {limits.devices}
                    </span>
                  </li>
                  {plan.planId !== 'free' && (
                    <li className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>全部数据源</span>
                    </li>
                  )}
                  {plan.planId === 'enterprise' && (
                    <li className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>优先队列</span>
                    </li>
                  )}
                </ul>

                {/* 购买按钮 */}
                <button
                  onClick={() => handlePurchase(plan)}
                  disabled={isCurrent || purchasing === plan.planId}
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    isCurrent
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : purchasing === plan.planId
                      ? 'bg-blue-500/50 text-white cursor-wait'
                      : plan.planId === 'pro'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {isCurrent
                    ? '当前方案'
                    : purchasing === plan.planId
                    ? '处理中...'
                    : '选择方案'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-400">
          <p>所有套餐均支持随时取消 • 7天无理由退款</p>
          <p className="mt-2">支付方式：微信支付、支付宝（由虎皮椒提供）</p>
        </div>
      </div>
    </div>
  );
}
