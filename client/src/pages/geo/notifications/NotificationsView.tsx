/**
 * 通知中心 - 系统通知列表
 */
import { useState, useEffect } from 'react'
import { notificationApi } from '../../../services/geoApi'
import type { NotificationItem } from '../../../services/geoApi'
import GuideTabs from '../../../components/ui/GuideTabs'

/* ===== Apple Design Colors ===== */
const APPLE_BLUE = '#007AFF'
const APPLE_GREEN = '#34C759'
const APPLE_ORANGE = '#FF9500'
const APPLE_RED = '#FF3B30'
const GRAY_900 = '#1C1C1E'
const GRAY_600 = '#636366'
const GRAY_500 = '#8E8E93'
const GRAY_200 = '#E8E8ED'
const GRAY_100 = '#F5F5F7'
const WHITE = '#FFFFFF'
const CARD_SHADOW = '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'

const TYPE_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  alert: { label: '告警', color: APPLE_RED, bgColor: 'rgba(255,59,48,0.10)' },
  info: { label: '通知', color: APPLE_BLUE, bgColor: 'rgba(0,122,255,0.08)' },
  success: { label: '成功', color: APPLE_GREEN, bgColor: 'rgba(52,199,89,0.10)' },
  warning: { label: '警告', color: APPLE_ORANGE, bgColor: 'rgba(255,149,0,0.10)' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationApi.getList({ limit: 50 })
      .then((res: any) => {
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setNotifications(items)
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }, [])

  async function markRead(item: NotificationItem) {
    if (item.isRead) return
    try {
      await notificationApi.markRead(item.id)
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n))
    } catch {}
  }

  async function markAllRead() {
    try {
      await notificationApi.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div style={{ padding: '24px', background: GRAY_100, minHeight: '100%' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: GRAY_900, margin: 0 }}>通知中心</h3>
          <p style={{ fontSize: '13px', color: GRAY_500, margin: '2px 0 0 0' }}>
            {unreadCount > 0 ? `共 ${unreadCount} 条未读通知` : '暂无未读通知'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${APPLE_BLUE}`,
              fontSize: '14px',
              color: APPLE_BLUE,
              background: WHITE,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
          >
            全部已读
          </button>
        )}
      </div>

      {/* 通知列表 */}
      <div style={{
        background: WHITE,
        borderRadius: '16px',
        boxShadow: CARD_SHADOW,
        border: '1px solid rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: GRAY_500, fontSize: '14px' }}>
            加载中...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: GRAY_500 }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
            <p style={{ fontSize: '14px' }}>暂无通知</p>
          </div>
        ) : (
          <div>
            {notifications.map((item, index) => {
              const typeInfo = TYPE_MAP[item.type] || TYPE_MAP.info
              return (
                <div
                  key={item.id}
                  onClick={() => markRead(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    borderBottom: index < notifications.length - 1 ? `1px solid ${GRAY_200}` : 'none',
                    backgroundColor: !item.isRead ? 'rgba(0,122,255,0.04)' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = !item.isRead ? 'rgba(0,122,255,0.08)' : GRAY_100}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = !item.isRead ? 'rgba(0,122,255,0.04)' : 'transparent'}
                >
                  {/* Unread dot */}
                  {!item.isRead && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: APPLE_BLUE,
                      marginTop: '6px',
                      flexShrink: 0
                    }} />
                  )}
                  {item.isRead && <div style={{ width: '8px', marginTop: '6px', flexShrink: 0 }} />}

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: GRAY_900 }}>{item.title}</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: typeInfo.color,
                        backgroundColor: typeInfo.bgColor
                      }}>
                        {typeInfo.label}
                      </span>
                    </div>
                    {item.content && item.content !== item.title && (
                      <p style={{ fontSize: '13px', color: GRAY_600, margin: '0 0 4px 0' }}>{item.content}</p>
                    )}
                    <div style={{ fontSize: '12px', color: GRAY_500 }}>{formatDate(item.createdAt)}</div>
                  </div>

                  {/* Hotspot link */}
                  {item.hotspotUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(item.hotspotUrl, '_blank')
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        color: APPLE_BLUE,
                        background: 'transparent',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontFamily: 'inherit'
                      }}
                    >
                      查看详情 →
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <GuideTabs />
    </div>
  )
}
