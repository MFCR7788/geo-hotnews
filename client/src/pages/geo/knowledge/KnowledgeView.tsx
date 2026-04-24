/**
 * 品牌知识库
 * 分类卡片 + 条目表格 + 添加/编辑弹窗
 */
import { useState, useEffect } from 'react'
import { knowledgeApi } from '../../../services/geoApi'
import type { KnowledgeEntry } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'

const CATEGORIES = [
  { key: '冲锋衣', name: '冲锋衣', icon: '🧥' },
  { key: '防晒衣', name: '防晒衣', icon: '☀️' },
  { key: '其他面料', name: '其他面料', icon: '🧵' },
  { key: '辅料', name: '辅料', icon: '🔩' },
  { key: '工艺', name: '工艺', icon: '⚙️' },
  { key: '品牌', name: '品牌', icon: '🏷️' },
]

function parseTags(tagsStr: string | undefined): string[] {
  if (!tagsStr) return []
  try { return JSON.parse(tagsStr) } catch { return [] }
}

function formatTags(tags: string[]): string {
  return tags.join(',')
}

export default function KnowledgeView() {
  const [selectedCat, setSelectedCat] = useState('冲锋衣')
  const [items, setItems] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    category: '冲锋衣',
    brand: '',
    name: '',
    description: '',
    tags: '',
    source: '',
  })

  function loadData() {
    setLoading(true)
    knowledgeApi.getList({ category: selectedCat })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [selectedCat])

  function getItemCount(cat: string) {
    return items.filter(i => i.category === cat).length
  }

  function openAddDialog() {
    setEditingId(null)
    setForm({ category: selectedCat, brand: '', name: '', description: '', tags: '', source: '' })
    setShowDialog(true)
  }

  function editItem(item: KnowledgeEntry) {
    setEditingId(item.id)
    setForm({
      category: item.category,
      brand: item.brand,
      name: item.name,
      description: item.description || '',
      tags: formatTags(parseTags(item.tags)),
      source: item.source || '',
    })
    setShowDialog(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      const data = {
        category: form.category,
        brand: form.brand,
        name: form.name,
        description: form.description,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        source: form.source,
      }
      if (editingId !== null) {
        const updated = await knowledgeApi.update(editingId, data)
        setItems(prev => prev.map(i => i.id === editingId ? updated : i))
      } else {
        const created = await knowledgeApi.create(data)
        setItems(prev => [created, ...prev])
      }
      setShowDialog(false)
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteItem(item: KnowledgeEntry) {
    if (!confirm(`确定删除「${item.name}」？`)) return
    try {
      await knowledgeApi.delete(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch {}
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="p-6">
      <PageHeader
        title="品牌知识库"
        subtitle={`共 ${items.length} 条知识条目`}
        action={
          <button
            onClick={openAddDialog}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            + 添加条目
          </button>
        }
      />

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {CATEGORIES.map(cat => (
          <div
            key={cat.key}
            onClick={() => setSelectedCat(cat.key)}
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
              selectedCat === cat.key
                ? 'border-blue-400 shadow-md ring-2 ring-blue-100'
                : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
            }`}
          >
            <div className="text-2xl mb-2">{cat.icon}</div>
            <div className="text-sm font-medium text-gray-800">{cat.name}</div>
            <div className="text-xs text-gray-400 mt-1">{getItemCount(cat.key)} 条</div>
          </div>
        ))}
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">加载中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="mb-2">暂无知识条目</p>
            <button onClick={openAddDialog} className="text-blue-500 hover:underline text-sm">点击添加 →</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">分类</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">品牌</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">描述</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">添加时间</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const tags = parseTags(item.tags)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm">
                        {CATEGORIES.find(c => c.key === item.category)?.icon} {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.brand || '--'}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="text-sm text-gray-500 truncate max-w-xs">{item.description || '--'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDate(item.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => editItem(item)} className="text-sm text-blue-500 hover:underline">编辑</button>
                        <button onClick={() => deleteItem(item)} className="text-sm text-red-500 hover:underline">删除</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={e => e.target === e.currentTarget && setShowDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{editingId !== null ? '编辑知识条目' : '添加知识条目'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">品牌</label>
                  <input
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    placeholder="品牌名称"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">名称 <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="如：GORE-TEX面料防水指数"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="详细描述..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">标签</label>
                <input
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="用逗号分隔多个标签"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">来源</label>
                <input
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="信息来源"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.name.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? '保存中...' : editingId !== null ? '更新' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}