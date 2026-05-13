import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { contentApi } from '../../../services/geoApi'
import type { ContentItem } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'
import GuideTabs from '../../../components/ui/GuideTabs'

const PLATFORM_ICON: Record<string, string> = {
  zhihu: '📝',
  xiaohongshu: '📕',
  bilibili: '📺',
  wechat: '💬',
  website: '🌐',
  douyin: '🎵',
  weibo: '📱',
}

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-green-50 text-green-600 border border-green-200',
  draft: 'bg-gray-50 text-gray-500 border border-gray-200',
  scheduled: 'bg-amber-50 text-amber-600 border border-amber-200',
  archived: 'bg-orange-50 text-orange-500 border border-orange-200',
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

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          ← 上月
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {currentYear}年 {MONTHS[currentMonth]}
        </h2>
        <button
          onClick={nextMonth}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          下月 →
        </button>
      </div>

      <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center py-3 text-xs font-medium text-gray-500 bg-gray-50">
              星期{d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-gray-100 p-2 bg-gray-50/50" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const items = getItemsForDay(day)
            const isWeekend = (firstDay + i) % 7 === 0 || (firstDay + i) % 7 === 6

            return (
              <div
                key={day}
                className={`min-h-[100px] border-b border-r border-gray-100 p-2 ${
                  isWeekend ? 'bg-gray-50/30' : ''
                } ${isToday(day) ? 'bg-blue-50/40' : ''}`}
              >
                <div className={`text-xs font-medium mb-1.5 px-1 ${
                  isToday(day) ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {isToday(day) ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs">
                      {day}
                    </span>
                  ) : day}
                </div>
                <div className="space-y-1">
                  {items.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/geo/content/${item.id}`)}
                      className={`text-[11px] px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors ${
                        STATUS_STYLE[item.status] || 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}
                    >
                      {PLATFORM_ICON[item.platform || ''] || '📄'} {item.title?.slice(0, 8) || '(无标题)'}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1.5">+{items.length - 3} 更多</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4">
        {[
          { status: 'published', label: '已发布', style: 'bg-green-50 border-green-200 text-green-600' },
          { status: 'draft', label: '草稿', style: 'bg-gray-50 border-gray-200 text-gray-500' },
          { status: 'scheduled', label: '待发布', style: 'bg-amber-50 border-amber-200 text-amber-600' },
          { status: 'archived', label: '已归档', style: 'bg-orange-50 border-orange-200 text-orange-500' },
        ].map(({ status, label, style }) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${style}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
      <GuideTabs />
    </div>
  )
}
