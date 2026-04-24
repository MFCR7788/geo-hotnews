/**
 * 策略库 - 营销策略管理
 * Tab1: 策略列表 + 创建
 * Tab2: 策略日历
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { strategyApi } from '../../../services/geoApi'
import type { Strategy } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
}

export default function StrategyView() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list')
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newStrategy, setNewStrategy] = useState({ name: '', category: '', description: '' })

  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  useEffect(() => {
    strategyApi.getList()
      .then(setStrategies)
      .catch(() => setStrategies([]))
      .finally(() => setLoading(false))
  }, [])

  async function createStrategy() {
    if (!newStrategy.name.trim()) return
    setSubmitting(true)
    try {
      const created = await strategyApi.create({ name: newStrategy.name, category: newStrategy.category, description: newStrategy.description })
      setStrategies(prev => [...prev, created])
      setShowCreate(false)
      setNewStrategy({ name: '', category: '', description: '' })
      setActiveTab('list')
    } catch {} finally {
      setSubmitting(false)
    }
  }

  function getEventsForDay(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return strategies.filter(e => e.startDate?.slice(0, 10) === dateStr || e.endDate?.slice(0, 10) === dateStr)
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6">
      <PageHeader
        title="策略库"
        subtitle="营销策略管理与执行跟踪"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            + 创建策略
          </button>
        }
      />

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {(['list', 'calendar'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'list' ? '策略列表' : '策略日历'}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400">加载中...</div>
          ) : strategies.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="mb-2">暂无策略</p>
              <button onClick={() => setShowCreate(true)} className="text-blue-500 hover:underline text-sm">创建第一个策略 →</button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">策略标题</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">分类</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">状态</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">创建时间</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {strategies.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{s.category || '--'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[s.status] || STATUS_COLOR.draft}`}>
                        {s.status === 'active' ? '启用' : s.status === 'draft' ? '草稿' : s.status === 'paused' ? '暂停' : s.status === 'completed' ? '完成' : s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDate(s.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => navigate(`/geo/strategy/${s.id}`)} className="text-sm text-blue-500 hover:underline">详情</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <button onClick={prevMonth} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">← 上月</button>
            <h3 className="text-base font-semibold text-gray-900">{currentYear}年 {MONTHS[currentMonth]}</h3>
            <button onClick={nextMonth} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">下月 →</button>
          </div>
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {WEEKDAYS.map(d => <div key={d} className="text-center py-2 text-xs font-medium text-gray-500">星期{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-20 border-b border-r border-gray-50 p-1 bg-gray-50/30" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const events = getEventsForDay(day)
              const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day
              return (
                <div key={day} className={`min-h-20 border-b border-r border-gray-50 p-1 ${isToday ? 'bg-blue-50/30' : ''}`}>
                  <div className={`text-xs font-medium mb-1 px-1 ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                    {isToday ? `● ${day}` : day}
                  </div>
                  {events.slice(0, 2).map(e => (
                    <div key={e.id} onClick={() => navigate(`/geo/strategy/${e.id}`)} className="text-xs px-1 py-0.5 rounded bg-blue-50 text-blue-600 truncate cursor-pointer mb-0.5">
                      📋 {e.name?.slice(0, 10)}
                    </div>
                  ))}
                  {events.length > 2 && <div className="text-xs text-gray-400 px-1">+{events.length - 2}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">创建策略</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">策略名称 <span className="text-red-500">*</span></label>
                <input
                  value={newStrategy.name}
                  onChange={e => setNewStrategy(s => ({ ...s, name: e.target.value }))}
                  placeholder="如：冲锋衣旺季抢占策略"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                <input
                  value={newStrategy.category}
                  onChange={e => setNewStrategy(s => ({ ...s, category: e.target.value }))}
                  placeholder="如：seasonal/product/competitor/platform"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                <textarea
                  value={newStrategy.description}
                  onChange={e => setNewStrategy(s => ({ ...s, description: e.target.value }))}
                  rows={3}
                  placeholder="策略详细描述（可选）"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
              <button
                onClick={createStrategy}
                disabled={submitting || !newStrategy.name.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
