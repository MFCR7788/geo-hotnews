/**
 * 订阅管理
 */
import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'
import GuideTabs from '../../../components/ui/GuideTabs'

const PLAN_FEATURES = [
  { name: '免费版', price: '¥0', period: '', features: ['GEO体检 5次/月', '内容生成 5篇/月', 'AI监测 1个任务', '知识库 20条', '视频生成 2个/月'] },
  { name: '专业版', price: '¥99', period: '/月', features: ['GEO体检 50次/月', '内容生成 100篇/月', 'AI监测 10个任务', '知识库 500条', '视频生成 50个/月', '优先客服支持'], yearly: '¥795/年' },
  { name: '企业版', price: '¥299', period: '/月', features: ['GEO体检 无限制', '内容生成 无限制', 'AI监测 无限制', '知识库 无限制', '视频生成 无限制', '多品牌管理', 'API调用', '专属客户成功经理', '定制化报告'], yearly: '¥2,390/年' },
]

export default function SettingsSubscriptionView() {
  const navigate = useNavigate()
  return (
    <div className="p-6">
      <PageHeader title="订阅管理" subtitle="查看和升级您的订阅计划" onBack={() => navigate('/geo/dashboard')} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {PLAN_FEATURES.map((plan, i) => (
          <div key={plan.name} className={`bg-white/5 backdrop-blur-sm rounded-2xl border p-6 ${i === 1 ? 'border-blue-400/50 ring-2 ring-blue-500/20' : 'border-white/10'}`}>
            {i === 1 && <div className="text-xs text-blue-400 font-medium mb-2">推荐</div>}
            <div className="text-lg font-semibold text-white mb-1">{plan.name}</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold text-white">{plan.price}</span>
              <span className="text-sm text-gray-400">{plan.period}</span>
            </div>
            {plan.yearly && <div className="text-xs text-gray-500 mb-4">年付 {plan.yearly}</div>}
            {!plan.yearly && <div className="mb-4" />}
            <ul className="space-y-2 mb-6">
              {plan.features.map(f => (
                <li key={f} className="text-sm text-gray-400 flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                i === 0 ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10' :
                i === 1 ? 'bg-blue-500 text-white hover:bg-blue-600' :
                'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
              disabled={i === 0}
            >
              {i === 0 ? '当前方案' : i === 1 ? '立即升级' : '联系我们'}
            </button>
          </div>
        ))}
      </div>
      <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-4 text-sm text-gray-500">
        当前方案：免费版 · 已用：GEO体检 2/5次，内容生成 5/10篇
      </div>
      <GuideTabs />
    </div>
  )
}
