/**
 * 企业设置
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'

export default function SettingsTenantView() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form] = useState({ name: '超人户外科技', industry: '户外服装', website: 'https://example.com', brandName: '超人户外' })

  async function saveTenant() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="企业设置" subtitle="管理企业信息和品牌配置" onBack={() => navigate('/geo/dashboard')} />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-6">
          {[
            { label: '企业名称', key: 'name', placeholder: '输入企业名称' },
            { label: '所属行业', key: 'industry', placeholder: '输入所属行业' },
            { label: '官网地址', key: 'website', placeholder: 'https://www.example.com' },
            { label: '品牌名称', key: 'brandName', placeholder: '输入品牌名称' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
              <input
                value={(form as any)[field.key]}
                disabled={field.key === 'name'}
                placeholder={field.placeholder}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          ))}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={saveTenant}
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
