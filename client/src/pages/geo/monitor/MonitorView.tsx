/**
 * AI监测 - 品牌在各AI平台的可见度监测
 * 统计卡片 + 监测表单 + 历史记录
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { monitorApi } from '../../../services/geoApi'
import type { MonitorStats, MonitorRecord } from '../../../services/geoApi'
import StatCard from '../../../components/ui/StatCard'
import PageHeader from '../../../components/ui/PageHeader'

const PLATFORMS = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'doubao', label: '豆包' },
  { value: 'wenxin', label: '文心一言' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'kimi', label: 'Kimi' },
]

const DEFAULT_QUESTIONS = ['推荐冲锋衣品牌', '冲锋衣哪个牌子好', '三合一冲锋衣怎么选']

export default function MonitorView() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<MonitorStats | null>(null)
  const [history, setHistory] = useState<MonitorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [form, setForm] = useState({
    brandName: '',
    platform: 'deepseek',
    questions: [...DEFAULT_QUESTIONS],
  })

  useEffect(() => {
    Promise.all([
      monitorApi.getTasks().catch(() => []),
      monitorApi.getRecords().catch(() => []),
    ]).then(([tasks, records]) => {
      setHistory(records.slice(0, 20))
      setStats({ averageScore: 0, anomalyCount: 0, totalChecks: tasks.length })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function runMonitor() {
    if (!form.brandName.trim()) return
    setRunning(true)
    try {
      const task = await monitorApi.createTask({
        name: `${form.brandName} - ${PLATFORMS.find(p => p.value === form.platform)?.label}`,
        keywords: [form.brandName],
        platforms: [form.platform],
      })
      await monitorApi.triggerTask(task.id)
      const [tasks, records] = await Promise.all([
        monitorApi.getTasks().catch(() => []),
        monitorApi.getRecords().catch(() => []),
      ])
      setHistory(records.slice(0, 20))
      setStats({ averageScore: 0, anomalyCount: 0, totalChecks: tasks.length })
    } catch {} finally {
      setRunning(false)
    }
  }

  function addQuestion() {
    setForm(f => ({ ...f, questions: [...f.questions, ''] }))
  }

  function removeQuestion(i: number) {
    setForm(f => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }))
  }

  function updateQuestion(i: number, value: string) {
    setForm(f => ({ ...f, questions: f.questions.map((q, idx) => idx === i ? value : q) }))
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="p-6">
      <PageHeader
        title="AI监测"
        subtitle="追踪品牌在各大AI平台的可见度"
        onBack={() => navigate('/geo/dashboard')}
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="平均GEO得分"
          value={stats?.averageScore ?? '--'}
          trend={null}
          icon="🎯"
          color="blue"
          loading={loading}
        />
        <StatCard
          title="异常监测数"
          value={String(stats?.anomalyCount ?? 0)}
          trend={null}
          icon="⚠️"
          color="red"
          loading={loading}
        />
        <StatCard
          title="总监测次数"
          value={String(stats?.totalChecks ?? 0)}
          trend={null}
          icon="📊"
          color="green"
          loading={loading}
        />
      </div>

      {/* Run monitor form */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 mb-6">
        <h3 className="text-base font-semibold text-white mb-4">运行AI监测</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">品牌名</label>
            <input
              type="text"
              value={form.brandName}
              onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))}
              placeholder="如：超人户外"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                         placeholder-slate-600
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">监测平台</label>
            <select
              value={form.platform}
              onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
            >
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Questions */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">监测问题</label>
          <div className="space-y-2">
            {form.questions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={e => updateQuestion(i, e.target.value)}
                  placeholder={`问题 ${i + 1}`}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                             placeholder-slate-600
                             focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                             transition-all"
                />
                {form.questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(i)}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addQuestion}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            + 添加问题
          </button>
        </div>

        <button
          onClick={runMonitor}
          disabled={running || !form.brandName.trim()}
          className="px-6 py-2.5 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {running ? '监测中...' : '开始监测'}
        </button>
      </div>

      {/* History table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">监测历史</h3>
        </div>
        {loading ? (
          <div className="text-center py-12 text-slate-500">加载中...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-slate-500">暂无监测记录</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">关键词</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">平台</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-20">被提及</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-20">推荐次数</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-20">排名</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-40">监测时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map(record => (
                <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-white">{record.keyword}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {PLATFORMS.find(p => p.value === record.platform)?.label || record.platform}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${record.isMentioned ? 'text-emerald-400' : 'text-red-400'}`}>
                      {record.isMentioned ? '是' : '否'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{record.recommendCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{record.rankPosition ?? '--'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(record.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
