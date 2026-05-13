/**
 * 策略库 - 营销策略管理
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { strategyApi } from '../../../services/geoApi'
import type { Strategy } from '../../../services/geoApi'
import GuideTabs from '../../../components/ui/GuideTabs'

const APPLE_BLUE = '#007AFF'
const APPLE_GREEN = '#34C759'
const GRAY_900 = '#1C1C1E'
const GRAY_600 = '#636366'
const GRAY_500 = '#8E8E93'
const GRAY_200 = '#E8E8ED'
const WHITE = '#FFFFFF'
const CARD_SHADOW = '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }

export default function StrategyView() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list')
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newStrategy, setNewStrategy] = useState({ name: '', category: '', priority: 'medium', description: '' })

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
      const created = await strategyApi.create({ name: newStrategy.name, category: newStrategy.category, priority: newStrategy.priority, description: newStrategy.description })
      setStrategies(prev => [...prev, created])
      setShowCreate(false)
      setNewStrategy({ name: '', category: '', priority: 'medium', description: '' })
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

  const cardStyle: React.CSSProperties = {
    background: WHITE,
    borderRadius: '16px',
    boxShadow: CARD_SHADOW,
    border: '1px solid rgba(0,0,0,0.04)'
  }

  return (
    <div style={{ padding: '24px', background: '#F5F5F7', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: GRAY_900, margin: 0 }}>策略库</h3>
          <p style={{ fontSize: '13px', color: GRAY_500, margin: '2px 0 0 0' }}>营销策略管理与执行跟踪</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            color: WHITE,
            background: APPLE_BLUE,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease'
          }}
        >
          + 创建策略
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${GRAY_200}`, marginBottom: '24px' }}>
        {(['list', 'calendar'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? GRAY_900 : GRAY_500,
              borderBottom: `2px solid ${activeTab === tab ? APPLE_BLUE : 'transparent'}`,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
          >
            {tab === 'list' ? '策略列表' : '策略日历'}
          </button>
        ))}
      </div>

      {/* List Tab */}
      {activeTab === 'list' && (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: GRAY_500, fontSize: '14px' }}>加载中...</div>
          ) : strategies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: GRAY_500 }}>
              <p style={{ marginBottom: '12px', fontSize: '15px' }}>暂无策略</p>
              <button onClick={() => setShowCreate(true)} style={{ color: APPLE_BLUE, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>创建第一个策略 →</button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${GRAY_200}` }}>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>策略标题</th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', width: '96px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>分类</th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', width: '90px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>状态</th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', width: '160px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>创建时间</th>
                  <th style={{ textAlign: 'right', padding: '12px 20px', width: '80px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${GRAY_200}`, transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 500, color: GRAY_900 }}>{s.name}</td>
                    <td style={{ padding: '12px 20px', fontSize: '14px', color: GRAY_600 }}>{s.category || '--'}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '6px',
                        fontSize: '11px', fontWeight: 600,
                        backgroundColor: s.status === 'active' ? 'rgba(52,199,89,0.10)' :
                          s.status === 'paused' ? 'rgba(255,149,0,0.10)' :
                          s.status === 'completed' ? 'rgba(0,122,255,0.10)' : 'rgba(142,142,147,0.10)',
                        color: s.status === 'active' ? APPLE_GREEN :
                          s.status === 'paused' ? '#FF9500' :
                          s.status === 'completed' ? APPLE_BLUE : GRAY_500
                      }}>
                        {s.status === 'active' ? '启用' : s.status === 'paused' ? '暂停' : s.status === 'completed' ? '完成' : '草稿'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: '13px', color: GRAY_500 }}>{formatDate(s.createdAt)}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <button onClick={() => navigate(`/geo/strategy/${s.id}`)} style={{
                        fontSize: '13px', color: APPLE_BLUE, cursor: 'pointer',
                        fontFamily: 'inherit', background: 'none', border: 'none'
                      }}>详情</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${GRAY_200}` }}>
            <button onClick={prevMonth} style={{
              padding: '6px 12px', borderRadius: '8px', border: `1px solid ${GRAY_200}`,
              fontSize: '13px', color: GRAY_600, background: WHITE, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s ease'
            }}>← 上月</button>
            <span style={{ fontSize: '15px', fontWeight: 600, color: GRAY_900 }}>{currentYear}年 {MONTHS[currentMonth]}</span>
            <button onClick={nextMonth} style={{
              padding: '6px 12px', borderRadius: '8px', border: `1px solid ${GRAY_200}`,
              fontSize: '13px', color: GRAY_600, background: WHITE, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s ease'
            }}>下月 →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${GRAY_200}` }}>
            {WEEKDAYS.map(d => <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: GRAY_500 }}>星期{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: '80px', borderBottom: `1px solid ${GRAY_200}`, borderRight: `1px solid ${GRAY_200}`, padding: '4px', background: '#FAFAFA' }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const events = getEventsForDay(day)
              const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day
              return (
                <div key={day} style={{
                  minHeight: '80px', borderBottom: `1px solid ${GRAY_200}`, borderRight: `1px solid ${GRAY_200}`,
                  padding: '4px', background: isToday ? 'rgba(0,122,255,0.06)' : WHITE
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', paddingLeft: '4px', color: isToday ? APPLE_BLUE : GRAY_600 }}>
                    {isToday ? `● ${day}` : day}
                  </div>
                  {events.slice(0, 2).map(e => (
                    <div key={e.id} onClick={() => navigate(`/geo/strategy/${e.id}`)} style={{
                      fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                      background: 'rgba(0,122,255,0.08)', color: APPLE_BLUE,
                      cursor: 'pointer', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      📋 {e.name?.slice(0, 10)}
                    </div>
                  ))}
                  {events.length > 2 && <div style={{ fontSize: '11px', color: GRAY_500, paddingLeft: '4px' }}>+{events.length - 2}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{
            background: WHITE, borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: `1px solid ${GRAY_200}`, width: '100%', maxWidth: '480px', margin: '16px'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${GRAY_200}` }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: GRAY_900, margin: 0 }}>创建策略</h3>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_600, marginBottom: '8px' }}>
                  策略名称 <span style={{ color: '#FF3B30' }}>*</span>
                </label>
                <input
                  value={newStrategy.name}
                  onChange={e => setNewStrategy(s => ({ ...s, name: e.target.value }))}
                  placeholder="如：冲锋衣旺季抢占策略"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    border: `1px solid ${GRAY_200}`, fontSize: '14px', color: GRAY_900,
                    outline: 'none', fontFamily: 'inherit', background: '#F5F5F7',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
                  onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_600, marginBottom: '8px' }}>分类</label>
                <input
                  value={newStrategy.category}
                  onChange={e => setNewStrategy(s => ({ ...s, category: e.target.value }))}
                  placeholder="如：seasonal/product/competitor/platform"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    border: `1px solid ${GRAY_200}`, fontSize: '14px', color: GRAY_900,
                    outline: 'none', fontFamily: 'inherit', background: '#F5F5F7',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
                  onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_600, marginBottom: '8px' }}>优先级</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'high', label: '高', color: '#FF3B30' },
                    { value: 'medium', label: '中', color: '#FF9500' },
                    { value: 'low', label: '低', color: APPLE_GREEN }
                  ].map(p => (
                    <button
                      key={p.value}
                      onClick={() => setNewStrategy(s => ({ ...s, priority: p.value }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '10px',
                        border: `2px solid ${newStrategy.priority === p.value ? p.color : GRAY_200}`,
                        background: newStrategy.priority === p.value ? `${p.color}10` : '#F5F5F7',
                        color: newStrategy.priority === p.value ? p.color : GRAY_500,
                        fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.2s ease'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_600, marginBottom: '8px' }}>描述</label>
                <textarea
                  value={newStrategy.description}
                  onChange={e => setNewStrategy(s => ({ ...s, description: e.target.value }))}
                  rows={3}
                  placeholder="策略详细描述（可选）"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    border: `1px solid ${GRAY_200}`, fontSize: '14px', color: GRAY_900,
                    outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#F5F5F7',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
                  onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${GRAY_200}`, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowCreate(false)} style={{
                padding: '8px 16px', fontSize: '14px', borderRadius: '8px',
                border: `1px solid ${GRAY_200}`, color: GRAY_600, background: '#F5F5F7',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease'
              }}>取消</button>
              <button
                onClick={createStrategy}
                disabled={submitting || !newStrategy.name.trim()}
                style={{
                  padding: '8px 16px', fontSize: '14px', borderRadius: '8px',
                  border: 'none', color: WHITE, background: APPLE_BLUE,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: (!newStrategy.name.trim()) ? 0.4 : 1,
                  fontFamily: 'inherit', transition: 'all 0.2s ease'
                }}
              >
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
      <GuideTabs />
    </div>
  )
}
