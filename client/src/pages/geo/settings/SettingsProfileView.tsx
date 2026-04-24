/**
 * 个人设置
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'

export default function SettingsProfileView() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', role: 'member' })

  useEffect(() => {
    // Mock load from auth context
    setForm({ name: '张三', phone: '138****8888', role: 'admin' })
  }, [])

  async function saveProfile() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="个人设置" subtitle="管理您的个人资料和账户信息" onBack={() => navigate('/geo/dashboard')} />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
            <input
              value={form.phone}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">手机号不可修改，如需变更请联系管理员</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="输入您的姓名"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
            <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-600">
              {form.role === 'admin' ? '👑 管理员' : '👤 成员'}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
