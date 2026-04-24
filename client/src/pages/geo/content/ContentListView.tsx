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
  published: { label: '已发布', color: 'bg-green-100 text-green-700' },
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
  scheduled: { label: '待发布', color: 'bg-yellow-100 text-yellow-700' },
  archived: { label: '已归档', color: 'bg-orange-100 text-orange-700' },
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
]

const PLATFORM_OPTIONS = [
  { value: 'zhihu', label: '知乎' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'bilibili', label: 'B站' },
  { value: 'wechat', label: '微信公众号' },
  { value: 'douyin', label: '抖音' },
  { value: 'weibo', label: '微博' },
  { value: 'website', label: '网站/博客' },
]

export default function ContentListView() {
  const navigate = useNavigate()
  const [contents, setContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', platform: '' })

  async function loadData() {
    setLoading(true)
    try {
      const res = await contentApi.getList({
        page: 1,
        limit: 50,
        status: filter.status || undefined,
        platform: filter.platform || undefined,
      })
      setContents(res.contents || [])
    } catch {
      setContents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [filter])

  async function handleCopy(row: ContentItem) {
    try {
      await navigator.clipboard.writeText(row.body || row.formattedBody || '')
    } catch {}
  }

  async function handlePublish(row: ContentItem) {
    try {
      await contentApi.publish(row.id)
      loadData()
    } catch {}
  }

  // handleDelete available for future use
  void (async (_row: ContentItem) => {
    if (!confirm(`确定删除内容「${_row.title}」？`)) return
    try {
      await contentApi.delete(_row.id)
      loadData()
    } catch {}
  })

  function formatDate(dateStr: string) {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="p-6">
      <PageHeader
        title="内容管理"
        subtitle={`共 ${contents.length} 条内容`}
        onBack={() => navigate('/geo/dashboard')}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <select
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={filter.platform}
            onChange={e => setFilter(f => ({ ...f, platform: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部平台</option>
            {PLATFORM_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <button
          onClick={() => navigate('/geo/content/generate')}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
        >
          + 生成内容
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">加载中...</div>
        ) : contents.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="mb-4">暂无内容</p>
            <button
              onClick={() => navigate('/geo/content/generate')}
              className="text-blue-500 hover:underline text-sm"
            >
              去生成内容 →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">平台</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">合规分</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">状态</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">创建时间</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-52">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contents.map(row => {
                const statusInfo = STATUS_MAP[row.status] || { label: row.status, color: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{row.title || '(无标题)'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {PLATFORM_MAP[row.platform || ''] || row.platform || '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        (row.complianceScore ?? 0) >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {row.complianceScore ?? '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(row.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/geo/content/${row.id}`)}
                          className="text-sm text-blue-500 hover:underline"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => navigate(`/geo/content/${row.id}/edit`)}
                          className="text-sm text-blue-500 hover:underline"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleCopy(row)}
                          className="text-sm text-gray-500 hover:underline"
                        >
                          复制
                        </button>
                        {row.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(row)}
                            className="text-sm text-green-600 hover:underline"
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
