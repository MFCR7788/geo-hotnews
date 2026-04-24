/**
 * 订阅管理
 */
import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'

const PLAN_FEATURES = [
  { name: '免费版', price: '¥0', features: ['GEO体检 5次/月', '内容生成 10篇/月', 'AI监测 3次/天', '视频生成 2个/月'] },
  { name: '专业版', price: '¥999/月', features: ['GEO体检 无限制', '内容生成 无限制', 'AI监测 无限制', '视频生成 无限制', '优先客服支持'] },
  { name: '企业版', price: '¥2999/月', features: ['全部专业版功能', '多品牌管理', 'API调用', '专属客户成功经理', '定制化报告'] },
]

export default function SettingsSubscriptionView() {
  const navigate = useNavigate()
  return (
    <div className="p-6">
      <PageHeader title="订阅管理" subtitle="查看和升级您的订阅计划" onBack={() => navigate('/geo/dashboard')} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {PLAN_FEATURES.map((plan, i) => (
          <div key={plan.name} className={`bg-white rounded-xl border p-6 ${i === 1 ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'}`}>
            {i === 1 && <div className="text-xs text-blue-600 font-medium mb-2">推荐</div>}
            <div className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</div>
            <div className="text-2xl font-bold text-gray-900 mb-4">{plan.price}</div>
            <ul className="space-y-2 mb-6">
              {plan.features.map(f => (
                <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                i === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                i === 1 ? 'bg-blue-500 text-white hover:bg-blue-600' :
                'bg-gray-800 text-white hover:bg-gray-900'
              }`}
              disabled={i === 0}
            >
              {i === 0 ? '当前方案' : i === 1 ? '立即升级' : '联系我们'}
            </button>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
        当前方案：免费版 · 已用：GEO体检 2/5次，内容生成 5/10篇
      </div>
    </div>
  )
}
