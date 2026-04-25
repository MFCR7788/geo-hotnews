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
import { cn } from '../../../lib/utils'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }

const STATUS_COLOR: Record<string, { label: string; className: string }> = {
  active: { label: '启用', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  draft: { label: '草稿', className: 'bg-white/10 text-gray-400 border border-white/10' },
  paused: { label: '暂停', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  completed: { label: '完成', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
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
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition-all"
          >
            + 创建策略
          </button>
        }
      />

      <div className="flex gap-4 border-b border-white/5 mb-6">
        {(['list', 'calendar'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            )}
          >
            {tab === 'list' ? '策略列表' : '策略日历'}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-slate-500">加载中...</div>
          ) : strategies.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="mb-2">暂无策略</p>
              <button onClick={() => setShowCreate(true)} className="text-blue-400 hover:text-blue-300 text-sm transition-colors">创建第一个策略 →</button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">策略标题</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">分类</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">状态</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-40">创建时间</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-20">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {strategies.map(s => {
                  const statusInfo = STATUS_COLOR[s.status || 'draft'] || STATUS_COLOR.draft
                  return (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white">{s.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{s.category || '--'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(s.createdAt)}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => navigate(`/geo/strategy/${s.id}`)} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">详情</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <button onClick={prevMonth} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 transition-all">← 上月</button>
            <h3 className="text-base font-semibold text-white">{currentYear}年 {MONTHS[currentMonth]}</h3>
            <button onClick={nextMonth} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 transition-all">下月 →</button>
          </div>
          <div className="grid grid-cols-7 border-b border-white/5">
            {WEEKDAYS.map(d => <div key={d} className="text-center py-2 text-xs font-medium text-slate-600">星期{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-20 border-b border-r border-white/[0.03] p-1 bg-white/[0.01]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const events = getEventsForDay(day)
              const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day
              return (
                <div key={day} className={`min-h-20 border-b border-r border-white/[0.03] p-1 ${isToday ? 'bg-blue-500/5' : ''}`}>
                  <div className={`text-xs font-medium mb-1 px-1 ${isToday ? 'text-blue-400' : 'text-slate-600'}`}>
                    {isToday ? `● ${day}` : day}
                  </div>
                  {events.slice(0, 2).map(e => (
                    <div key={e.id} onClick={() => navigate(`/geo/strategy/${e.id}`)} className="text-[10px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate cursor-pointer mb-0.5">
                      📋 {e.name?.slice(0, 10)}
                    </div>
                  ))}
                  {events.length > 2 && <div className="text-[10px] text-slate-600 px-1">+{events.length - 2}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="rounded-2xl bg-[#0c0c20] border border-white/10 shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="text-lg font-semibold text-white">创建策略</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">策略名称 <span className="text-red-400">*</span></label>
                <input
                  value={newStrategy.name}
                  onChange={e => setNewStrategy(s => ({ ...s, name: e.target.value }))}
                  placeholder="如：冲锋衣旺季抢占策略"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                             placeholder-slate-600
                             focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                             transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">分类</label>
                <input
                  value={newStrategy.category}
                  onChange={e => setNewStrategy(s => ({ ...s, category: e.target.value }))}
                  placeholder="如：seasonal/product/competitor/platform"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                             placeholder-slate-600
                             focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                             transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">描述</label>
                <textarea
                  value={newStrategy.description}
                  onChange={e => setNewStrategy(s => ({ ...s, description: e.target.value }))}
                  rows={3}
                  placeholder="策略详细描述（可选）"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                             placeholder-slate-600 resize-none
                             focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                             transition-all"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">取消</button>
              <button
                onClick={createStrategy}
                disabled={submitting || !newStrategy.name.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-500 rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-all"
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
