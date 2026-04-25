/**
 * 内容日历视图
 * 按日期展示内容发布计划
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { contentApi } from '../../../services/geoApi'
import type { ContentItem } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'

const PLATFORM_ICON: Record<string, string> = {
  zhihu: '📝',
  xiaohongshu: '📕',
  bilibili: '📺',
  wechat: '💬',
  website: '🌐',
  douyin: '🎵',
  weibo: '📱',
}

const STATUS_COLOR: Record<string, string> = {
  published: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  draft: 'bg-white/10 text-gray-300 border border-white/10',
  scheduled: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  archived: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function ContentCalendarView() {
  const navigate = useNavigate()
  const [contents, setContents] = useState<Pick<ContentItem, 'id' | 'title' | 'platform' | 'publishedAt' | 'status'>[]>([])
  const [, setLoading] = useState(false)
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  function loadMonth() {
    setLoading(true)
    contentApi.getCalendarMonth(currentYear, currentMonth + 1)
      .then(items => setContents(items))
      .catch(() => setContents([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadMonth() }, [currentYear, currentMonth])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  function getItemsForDay(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return contents.filter(c => {
      const published = c.publishedAt?.slice(0, 10)
      return published === dateStr
    })
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  function isToday(day: number) {
    return (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === day
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="内容日历"
        subtitle="按日期查看内容发布计划"
        onBack={() => navigate('/geo/content/list')}
      />

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
        >
          ← 上月
        </button>
        <h2 className="text-lg font-semibold text-white">
          {currentYear}年 {MONTHS[currentMonth]}
        </h2>
        <button
          onClick={nextMonth}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
        >
          下月 →
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-white/5">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center py-2 text-xs font-medium text-slate-500">
              星期{d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-24 border-b border-r border-white/[0.03] p-1 bg-white/[0.01]" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const items = getItemsForDay(day)
            const isWeekend = (firstDay + i) % 7 === 0 || (firstDay + i) % 7 === 6

            return (
              <div
                key={day}
                className={`min-h-24 border-b border-r border-white/[0.03] p-1 ${
                  isWeekend ? 'bg-white/[0.01]' : ''
                }`}
              >
                <div className={`text-xs font-medium mb-1 px-1 ${
                  isToday(day) ? 'text-blue-400' : 'text-slate-500'
                }`}>
                  {isToday(day) ? `● ${day}` : day}
                </div>
                <div className="space-y-0.5">
                  {items.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/geo/content/${item.id}`)}
                      className={`text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors ${
                        STATUS_COLOR[item.status] || 'bg-white/10 text-gray-300 border border-white/10'
                      }`}
                    >
                      {PLATFORM_ICON[item.platform || ''] || '📄'} {item.title?.slice(0, 8) || '(无标题)'}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="text-[10px] text-slate-600 px-1.5">+{items.length - 3} 更多</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${color}`} />
            <span className="text-xs text-slate-500">
              {status === 'published' ? '已发布' : status === 'draft' ? '草稿' : status === 'scheduled' ? '待发布' : '已归档'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
