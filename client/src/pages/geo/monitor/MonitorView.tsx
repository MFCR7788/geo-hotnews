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
      // 创建临时监测任务并触发
      const task = await monitorApi.createTask({
        name: `${form.brandName} - ${PLATFORMS.find(p => p.value === form.platform)?.label}`,
        keywords: [form.brandName],
        platforms: [form.platform],
      })
      await monitorApi.triggerTask(task.id)
      // 刷新数据
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">运行AI监测</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">品牌名</label>
            <input
              type="text"
              value={form.brandName}
              onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))}
              placeholder="如：超人户外"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">监测平台</label>
            <select
              value={form.platform}
              onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Questions */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">监测问题</label>
          <div className="space-y-2">
            {form.questions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={e => updateQuestion(i, e.target.value)}
                  placeholder={`问题 ${i + 1}`}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {form.questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(i)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addQuestion}
            className="mt-2 text-sm text-blue-500 hover:underline"
          >
            + 添加问题
          </button>
        </div>

        <button
          onClick={runMonitor}
          disabled={running || !form.brandName.trim()}
          className="px-6 py-2.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {running ? '监测中...' : '开始监测'}
        </button>
      </div>

      {/* History table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">监测历史</h3>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无监测记录</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">关键词</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">平台</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">被提及</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">推荐次数</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">排名</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">监测时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map(record => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.keyword}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {PLATFORMS.find(p => p.value === record.platform)?.label || record.platform}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${record.isMentioned ? 'text-green-600' : 'text-red-500'}`}>
                      {record.isMentioned ? '是' : '否'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.recommendCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.rankPosition ?? '--'}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{formatDate(record.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
