import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { strategyApi } from '../../../services/geoApi'
import type { Strategy } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'

function parseJsonArray(str: string | undefined): string[] {
  if (!str) return []
  try { return JSON.parse(str) } catch { return [] }
}

const STATUS_LABELS: Record<string, string> = {
  active: '运行中', draft: '草稿', paused: '暂停', completed: '已完成',
}

export default function StrategyDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'kols'>('overview')

  useEffect(() => {
    if (!id) return
    strategyApi.getById(id)
      .then(s => setStrategy(s))
      .catch(() => setStrategy(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-6 text-center text-gray-400">加载中...</div>
  if (!strategy) return <div className="p-6 text-center text-gray-400">策略不存在</div>

  const keywords = parseJsonArray(strategy.keywords)
  const contentPillars = parseJsonArray(strategy.contentPillars)
  // platforms available for future use
  void parseJsonArray(strategy.platforms)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={strategy.name}
        subtitle={id ? `策略ID: ${id}` : '策略详情'}
        onBack={() => navigate('/geo/strategy')}
        action={
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              编辑策略
            </button>
            {strategy.status === 'draft' && (
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                启动策略
              </button>
            )}
          </div>
        }
      />

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
          strategy.status === 'active' ? 'bg-green-100 text-green-700' :
          strategy.status === 'draft' ? 'bg-gray-100 text-gray-600' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {STATUS_LABELS[strategy.status] || strategy.status}
        </span>
        {strategy.startDate && (
          <span className="text-sm text-gray-500">
            生效期：{strategy.startDate.slice(0,10)} ~ {strategy.endDate?.slice(0,10) || '未设置'}
          </span>
        )}
      </div>

      {/* Core stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: '总曝光', value: strategy.views > 0 ? `${(strategy.views / 10000).toFixed(1)}万` : '--' },
          { label: '总点击', value: strategy.clicks > 0 ? `${(strategy.clicks / 10000).toFixed(1)}万` : '--' },
          { label: '转化数', value: String(strategy.conversions || 0) },
          { label: '互动率', value: strategy.engagement ? `${strategy.engagement}%` : '--' },
          { label: '投资回报', value: strategy.roi ? `${strategy.roi}x` : '--' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {[
            { key: 'overview', label: '策略概览' },
            { key: 'phases', label: '执行阶段' },
            { key: 'kols', label: 'KOL合作' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">策略描述</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{strategy.description || '暂无描述'}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">监测关键词</h3>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span key={kw} className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 rounded-full">{kw}</span>
                ))}
                {keywords.length === 0 && <span className="text-xs text-gray-400">暂无关键词</span>}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">内容支柱</h3>
              <div className="flex flex-wrap gap-2">
                {contentPillars.map((pillar) => (
                  <span key={pillar} className="px-2.5 py-1 text-xs bg-purple-50 text-purple-600 rounded-full">{pillar}</span>
                ))}
                {contentPillars.length === 0 && <span className="text-xs text-gray-400">暂无内容支柱</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Phases */}
      {activeTab === 'phases' && (
        <div className="space-y-4">
          {strategy.phases?.map((phase, i) => (
            <div key={phase.id} className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                  {i + 1}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{phase.name}</h3>
                {phase.platforms && (
                  <div className="flex gap-1 ml-auto">
                    {JSON.parse(phase.platforms).map((p: string) => (
                      <span key={p} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">{phase.content || '暂无描述'}</p>
            </div>
          ))}
          {(!strategy.phases || strategy.phases.length === 0) && (
            <div className="text-center py-12 text-gray-400">暂无执行阶段</div>
          )}
        </div>
      )}

      {/* Tab: KOLs */}
      {activeTab === 'kols' && (
        <div className="space-y-3">
          {strategy.kols?.map((kol) => (
            <div key={kol.id} className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                {kol.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{kol.name}</p>
                <p className="text-xs text-gray-500">{kol.platform} · {kol.followers}万粉丝</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">预算</p>
                <p className="text-sm font-medium text-gray-900">¥{kol.cost.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">预估触达</p>
                <p className="text-sm font-medium text-gray-900">{(kol.estimatedReach / 10000).toFixed(0)}万</p>
              </div>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                kol.status === 'completed' ? 'bg-green-100 text-green-700' :
                kol.status === 'cooperating' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {kol.status === 'completed' ? '已完成' : kol.status === 'cooperating' ? '合作中' : '待合作'}
              </span>
            </div>
          ))}
          {(!strategy.kols || strategy.kols.length === 0) && (
            <div className="text-center py-12 text-gray-400">暂无KOL合作记录</div>
          )}
        </div>
      )}
    </div>
  )
}