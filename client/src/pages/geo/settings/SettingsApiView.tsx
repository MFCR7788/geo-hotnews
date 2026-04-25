/**
 * API设置
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'

export default function SettingsApiView() {
  const navigate = useNavigate()
  const [apiKey] = useState('sk-geo-••••••••••••••••••••••••••••••••')
  const [showKey, setShowKey] = useState(false)

  function copyKey() {
    navigator.clipboard.writeText(apiKey)
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="API设置" subtitle="管理API密钥和回调配置" onBack={() => navigate('/geo/dashboard')} />
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <h3 className="text-sm font-medium text-white mb-4">API密钥</h3>
          <div className="flex items-center gap-3 mb-4">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              readOnly
              className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl bg-white/5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setShowKey(s => !s)}
              className="px-4 py-2 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              {showKey ? '隐藏' : '显示'}
            </button>
            <button
              onClick={copyKey}
              className="px-4 py-2 text-sm text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors"
            >
              复制
            </button>
          </div>
          <p className="text-xs text-gray-500">请妥善保管您的API密钥，不要泄露给他人</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <h3 className="text-sm font-medium text-white mb-4">API使用统计</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '今日调用', value: '128 次' },
              { label: '本月调用', value: '3,842 次' },
              { label: '额度上限', value: '10,000 次' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-lg font-semibold text-white">{stat.value}</div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <h3 className="text-sm font-medium text-white mb-4">回调地址</h3>
          <input
            type="url"
            placeholder="https://your-domain.com/webhook"
            className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          <button className="px-4 py-2 text-sm text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors">
            保存回调地址
          </button>
        </div>
      </div>
    </div>
  )
}
