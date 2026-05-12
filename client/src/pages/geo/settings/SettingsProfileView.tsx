/**
 * 个人设置
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'
import GuideTabs from '../../../components/ui/GuideTabs'

export default function SettingsProfileView() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', role: 'member' })

  useEffect(() => {
    setForm({ name: '张三', phone: '138****8888', role: 'admin' })
  }, [])

  async function saveProfile() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="个人设置" subtitle="管理您的个人资料和账户信息" onBack={() => navigate('/geo/dashboard')} />

      {/* 个人资料 */}
      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#ebeef5',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)'
        }}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: '#303133' }}>基本信息</h3>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#606266' }}>
              手机号
            </label>
            <input
              value={form.phone}
              disabled
              className="w-full px-4 py-2.5 rounded cursor-not-allowed border"
              style={{ backgroundColor: '#f5f7fa', borderColor: '#dcdfe6', color: '#909399' }}
            />
            <p className="text-xs mt-1" style={{ color: '#909399' }}>
              手机号不可修改，如需变更请联系管理员
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#606266' }}>
              姓名
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="输入您的姓名"
              className="w-full px-4 py-2.5 rounded border focus:outline-none transition-all"
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#dcdfe6',
                color: '#303133'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#409EFF'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#dcdfe6'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#606266' }}>
              角色
            </label>
            <div
              className="px-4 py-2.5 rounded text-sm border"
              style={{ backgroundColor: '#f5f7fa', borderColor: '#dcdfe6', color: '#909399' }}
            >
              {form.role === 'admin' ? '👑 管理员' : '👤 成员'}
            </div>
          </div>
          <div className="pt-4 border-t" style={{ borderColor: '#ebeef5' }}>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-6 py-2.5 rounded hover:opacity-90 disabled:opacity-60 transition-opacity text-white text-sm font-medium"
              style={{ backgroundColor: '#409EFF' }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
      <GuideTabs />
    </div>
  )
}
