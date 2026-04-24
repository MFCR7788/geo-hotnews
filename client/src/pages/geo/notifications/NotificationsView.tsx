/**
 * 通知中心 - 系统通知列表
 */
import { useState, useEffect } from 'react'
import { notificationApi } from '../../../services/geoApi'
import type { NotificationItem } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'

const TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  alert: { label: '告警', color: 'bg-red-100 text-red-700', icon: '🚨' },
  info: { label: '通知', color: 'bg-blue-100 text-blue-700', icon: 'ℹ️' },
  success: { label: '成功', color: 'bg-green-100 text-green-700', icon: '✅' },
  warning: { label: '警告', color: 'bg-yellow-100 text-yellow-700', icon: '⚠️' },
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
      .then((res: NotificationItem[]) => {
        const items = Array.isArray(res) ? res : []
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
    <div className="p-6">
      <PageHeader
        title="通知中心"
        subtitle={unreadCount > 0 ? `共 ${unreadCount} 条未读通知` : '暂无未读通知'}
        action={
          unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              全部已读
            </button>
          )
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">加载中...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔔</div>
            <p>暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map(item => {
              const typeInfo = TYPE_MAP[item.type] || TYPE_MAP.info
              return (
                <div
                  key={item.id}
                  onClick={() => markRead(item)}
                  className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    !item.isRead ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Unread dot */}
                  {!item.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  )}
                  {item.isRead && <div className="w-2 mt-2 flex-shrink-0" />}

                  {/* Icon */}
                  <div className="text-xl flex-shrink-0">{typeInfo.icon}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{item.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    {item.content && item.content !== item.title && (
                      <p className="text-sm text-gray-500 mb-1">{item.content}</p>
                    )}
                    <div className="text-xs text-gray-400">{formatDate(item.createdAt)}</div>
                  </div>

                  {/* Hotspot link */}
                  {item.hotspotId && (
                    <button
                      className="text-xs text-blue-500 hover:underline flex-shrink-0"
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
    </div>
  )
}
