import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { strategyApi } from '../../../services/geoApi'
import type { Strategy } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'
import { cn } from '../../../lib/utils'

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

  if (loading) return <div className="p-6 text-center text-slate-500">加载中...</div>
  if (!strategy) return <div className="p-6 text-center text-slate-500">策略不存在</div>

  const keywords = parseJsonArray(strategy.keywords)
  const contentPillars = parseJsonArray(strategy.contentPillars)
  void parseJsonArray(strategy.platforms)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={strategy.name}
        subtitle={id ? `策略ID: ${id}` : '策略详情'}
        onBack={() => navigate('/geo/strategy')}
        action={
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all">
              编辑策略
            </button>
            {strategy.status === 'draft' && (
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-all">
                启动策略
              </button>
            )}
          </div>
        }
      />

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span className={cn('px-3 py-1 text-xs font-medium rounded-full', {
          'bg-emerald-500/15 text-emerald-400': strategy.status === 'active',
          'bg-white/10 text-gray-400 border border-white/10': strategy.status === 'draft',
          'bg-amber-500/15 text-amber-400': strategy.status === 'paused' || strategy.status === 'completed',
        })}>
          {STATUS_LABELS[strategy.status] || strategy.status}
        </span>
        {strategy.startDate && (
          <span className="text-sm text-slate-600">
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
          <div key={stat.label} className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
            <p className="text-xs text-slate-600 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <nav className="flex gap-6">
          {[
            { key: 'overview', label: '策略概览' },
            { key: 'phases', label: '执行阶段' },
            { key: 'kols', label: 'KOL合作' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-6">
            <h3 className="text-sm font-semibold text-white mb-3">策略描述</h3>
            <p className="text-sm text-gray-300 leading-relaxed">{strategy.description || '暂无描述'}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-3">监测关键词</h3>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span key={kw} className="px-2.5 py-1 text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full">{kw}</span>
                ))}
                {keywords.length === 0 && <span className="text-xs text-slate-600">暂无关键词</span>}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-3">内容支柱</h3>
              <div className="flex flex-wrap gap-2">
                {contentPillars.map((pillar) => (
                  <span key={pillar} className="px-2.5 py-1 text-xs bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded-full">{pillar}</span>
                ))}
                {contentPillars.length === 0 && <span className="text-xs text-slate-600">暂无内容支柱</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Phases */}
      {activeTab === 'phases' && (
        <div className="space-y-4">
          {strategy.phases?.map((phase, i) => (
            <div key={phase.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold">
                  {i + 1}
                </div>
                <h3 className="text-sm font-semibold text-white">{phase.name}</h3>
                {phase.platforms && (
                  <div className="flex gap-1 ml-auto">
                    {JSON.parse(phase.platforms).map((p: string) => (
                      <span key={p} className="px-2 py-0.5 text-xs bg-white/5 text-slate-400 border border-white/10 rounded-lg">{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-500">{phase.content || '暂无描述'}</p>
            </div>
          ))}
          {(!strategy.phases || strategy.phases.length === 0) && (
            <div className="text-center py-12 text-slate-600">暂无执行阶段</div>
          )}
        </div>
      )}

      {/* Tab: KOLs */}
      {activeTab === 'kols' && (
        <div className="space-y-3">
          {strategy.kols?.map((kol) => (
            <div key={kol.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                {kol.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{kol.name}</p>
                <p className="text-xs text-slate-600">{kol.platform} · {kol.followers}万粉丝</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">预算</p>
                <p className="text-sm font-medium text-white">¥{kol.cost.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">预估触达</p>
                <p className="text-sm font-medium text-white">{(kol.estimatedReach / 10000).toFixed(0)}万</p>
              </div>
              <span className={cn('px-2 py-0.5 text-xs rounded-full', {
                'bg-emerald-500/15 text-emerald-400': kol.status === 'completed',
                'bg-blue-500/15 text-blue-400': kol.status === 'cooperating',
                'bg-white/10 text-slate-500': kol.status === 'pending' || !kol.status,
              })}>
                {kol.status === 'completed' ? '已完成' : kol.status === 'cooperating' ? '合作中' : '待合作'}
              </span>
            </div>
          ))}
          {(!strategy.kols || strategy.kols.length === 0) && (
            <div className="text-center py-12 text-slate-600">暂无KOL合作记录</div>
          )}
        </div>
      )}
    </div>
  )
}
