/**
 * 内容管理列表
 * 支持状态/平台筛选，查看/编辑/复制/发布操作
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { contentApi, type ContentItem } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'

const PLATFORM_MAP: Record<string, string> = {
  zhihu: '知乎',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  wechat: '微信公众号',
  douyin: '抖音',
  weibo: '微博',
  website: '网站/博客',
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  published: { label: '已发布', color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  draft: { label: '草稿', color: 'bg-white/10 text-gray-400 border border-white/10' },
  scheduled: { label: '待发布', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  archived: { label: '已归档', color: 'bg-orange-500/15 text-orange-400 border border-orange-500/20' },
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
      .then(data => setList(data))
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
    <div className="p-6">
      <PageHeader
        title="内容管理"
        subtitle="多平台内容创作与发布"
        action={
          <button
            onClick={() => navigate('/geo/content/generate')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-all"
          >
            + 新建内容
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="搜索标题或内容..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                     placeholder-slate-600 w-48
                     focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                     transition-all"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                     focus:outline-none focus:border-blue-500/50 transition-all"
        >
          <option value="">全部状态</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                     focus:outline-none focus:border-blue-500/50 transition-all"
        >
          <option value="">全部平台</option>
          {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">暂无内容</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">标题</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">平台</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">状态</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-40">创建时间</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-48">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(row => {
                const statusInfo = STATUS_MAP[row.status || 'draft'] || { label: row.status || 'draft', color: 'bg-white/10 text-gray-400 border border-white/10' }
                return (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white truncate max-w-xs">{row.title || '(无标题)'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {PLATFORM_MAP[row.platform || ''] || row.platform || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{formatDate(row.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/geo/content/${row.id}`)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all text-xs"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => handleCopy(row)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-gray-300 hover:bg-white/5 transition-all text-xs"
                        >
                          复制
                        </button>
                        {row.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(row)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs"
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
    </div>
  )
}
