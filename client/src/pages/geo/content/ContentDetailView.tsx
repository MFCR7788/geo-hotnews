/**
 * 内容详情 / 编辑
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { contentApi } from '../../../services/geoApi'
import type { ContentItem } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'

const PLATFORM_MAP: Record<string, string> = {
  zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站',
  wechat: '微信公众号', douyin: '抖音', weibo: '微博', website: '网站/博客',
}

export default function ContentDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', body: '' })

  useEffect(() => {
    if (!id) return
    contentApi.getById(id)
      .then(c => {
        setContent(c)
        setEditForm({ title: c.title || '', body: c.body || '' })
      })
      .catch(() => setContent(null))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    if (!id) return
    setSaving(true)
    try {
      await contentApi.update(id, { title: editForm.title, body: editForm.body })
      setEditing(false)
      const c = await contentApi.getById(id)
      setContent(c)
    } catch {}
    setSaving(false)
  }

  async function handlePublish() {
    if (!id) return
    try {
      const c = await contentApi.publish(id)
      setContent(c)
    } catch {}
  }

  async function handleArchive() {
    if (!id) return
    try {
      const c = await contentApi.archive(id)
      setContent(c)
    } catch {}
  }

  if (loading) return <div className="p-6 text-center text-gray-400">加载中...</div>
  if (!content) return <div className="p-6 text-center text-gray-400">内容不存在</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="内容详情"
        onBack={() => navigate('/geo/content/list')}
        action={
          editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-60">
                {saving ? '保存中...' : '保存'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">编辑</button>
              {content.status === 'draft' && (
                <button onClick={handlePublish} className="px-4 py-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600">发布</button>
              )}
              {content.status === 'published' && (
                <button onClick={handleArchive} className="px-4 py-2 text-sm text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100">归档</button>
              )}
            </>
          )
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {/* Meta info */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <span className="text-sm text-gray-500">{PLATFORM_MAP[content.platform || ''] || content.platform}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            content.status === 'published' ? 'bg-green-100 text-green-700' :
            content.status === 'archived' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {content.status === 'published' ? '已发布' : content.status === 'archived' ? '已归档' : '草稿'}
          </span>
          {content.complianceScore != null && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              content.complianceScore >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              合规 {content.complianceScore}
            </span>
          )}
          <span className="text-sm text-gray-400">
            {new Date(content.createdAt).toLocaleString('zh-CN')}
          </span>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">正文</label>
              <textarea
                value={editForm.body}
                onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
                rows={16}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
              />
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-4">{content.title}</h1>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {content.body || content.formattedBody}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
