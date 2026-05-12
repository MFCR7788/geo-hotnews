/**
 * 内容管理列表
 * 支持状态/平台筛选，查看/编辑/复制/发布操作
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { contentApi, type ContentItem } from '../../../services/geoApi'
import GuideTabs from '../../../components/ui/GuideTabs'

/* ===== Apple Design Colors ===== */
const APPLE_BLUE = '#007AFF'
const APPLE_GREEN = '#34C759'
const APPLE_ORANGE = '#FF9500'
const GRAY_900 = '#1C1C1E'
const GRAY_600 = '#636366'
const GRAY_500 = '#8E8E93'
const GRAY_200 = '#E8E8ED'
const GRAY_100 = '#F5F5F7'
const WHITE = '#FFFFFF'
const CARD_SHADOW = '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'

const PLATFORM_MAP: Record<string, string> = {
  zhihu: '知乎',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  wechat: '微信公众号',
  douyin: '抖音',
  weibo: '微博',
  website: '网站/博客',
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: '已发布', color: APPLE_GREEN, bg: 'rgba(52,199,89,0.10)' },
  draft: { label: '草稿', color: GRAY_500, bg: 'rgba(142,142,147,0.10)' },
  scheduled: { label: '待发布', color: APPLE_ORANGE, bg: 'rgba(255,149,0,0.10)' },
  archived: { label: '已归档', color: GRAY_500, bg: 'rgba(142,142,147,0.10)' },
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
]

const PLATFORM_OPTIONS = Object.entries(PLATFORM_MAP).map(([v, l]) => ({ value: v, label: l }))

export default function ContentListView() {
  const navigate = useNavigate()
  const [list, setList] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    contentApi.getList({ status: filterStatus || undefined, platform: filterPlatform || undefined })
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [filterStatus, filterPlatform])

  function formatDate(d?: string) {
    if (!d) return '-'
    return new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  async function handleCopy(row: ContentItem) {
    const text = row.body || row.formattedBody || ''
    await navigator.clipboard.writeText(text)
  }

  async function handlePublish(row: ContentItem) {
    try {
      const updated = await contentApi.publish(row.id)
      setList(prev => prev.map(c => c.id === row.id ? updated : c))
    } catch {}
  }

  const filtered = list.filter(r =>
    !search || r.title?.includes(search) || r.body?.includes(search)
  )

  return (
    <div style={{ padding: '24px', background: GRAY_100, minHeight: '100%' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: GRAY_900, margin: 0 }}>内容管理</h3>
          <p style={{ fontSize: '13px', color: GRAY_500, margin: '2px 0 0 0' }}>多平台内容创作与发布</p>
        </div>
        <button
          onClick={() => navigate('/geo/content/generate')}
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
          + 新建内容
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: WHITE,
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: CARD_SHADOW,
        border: '1px solid rgba(0,0,0,0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px'
      }}>
        <input
          type="text"
          placeholder="搜索标题或内容..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: `1px solid ${GRAY_200}`,
            fontSize: '14px',
            color: GRAY_900,
            outline: 'none',
            width: '192px',
            flexShrink: 0,
            fontFamily: 'inherit',
            background: WHITE
          }}
          onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
          onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: `1px solid ${GRAY_200}`,
            fontSize: '14px',
            color: GRAY_900,
            outline: 'none',
            background: WHITE,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          <option value="">全部状态</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: `1px solid ${GRAY_200}`,
            fontSize: '14px',
            color: GRAY_900,
            outline: 'none',
            background: WHITE,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          <option value="">全部平台</option>
          {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: WHITE,
        borderRadius: '16px',
        boxShadow: CARD_SHADOW,
        border: '1px solid rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: GRAY_500, fontSize: '14px' }}>加载中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: GRAY_500, fontSize: '14px' }}>暂无内容</div>
        ) : (
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${GRAY_200}` }}>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  标题
                </th>
                <th style={{ textAlign: 'left', padding: '12px 20px', width: '96px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  平台
                </th>
                <th style={{ textAlign: 'left', padding: '12px 20px', width: '90px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  状态
                </th>
                <th style={{ textAlign: 'left', padding: '12px 20px', width: '160px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  创建时间
                </th>
                <th style={{ textAlign: 'right', padding: '12px 20px', width: '192px', fontSize: '11px', fontWeight: 600, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const statusInfo = STATUS_MAP[row.status || 'draft'] || { label: row.status || 'draft', color: GRAY_500, bg: 'rgba(142,142,147,0.10)' }
                return (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${GRAY_200}`, transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = GRAY_100}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: GRAY_900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                        {row.title || '(无标题)'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', color: GRAY_600, fontSize: '14px' }}>
                      {PLATFORM_MAP[row.platform || ''] || row.platform || '-'}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: statusInfo.color,
                        backgroundColor: statusInfo.bg
                      }}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', color: GRAY_500, fontSize: '13px' }}>
                      {formatDate(row.createdAt)}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <button
                          onClick={() => navigate(`/geo/content/${row.id}`)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            color: APPLE_BLUE,
                            background: 'transparent',
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                          }}
                        >
                          查看
                        </button>
                        <button
                          onClick={() => handleCopy(row)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            color: GRAY_600,
                            background: 'transparent',
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                          }}
                        >
                          复制
                        </button>
                        {row.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(row)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '12px',
                              color: APPLE_GREEN,
                              background: 'transparent',
                              cursor: 'pointer',
                              fontFamily: 'inherit'
                            }}
                          >
                            发布
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <GuideTabs />
    </div>
  )
}
