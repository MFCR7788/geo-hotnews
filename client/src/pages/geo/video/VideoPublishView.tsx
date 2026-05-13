import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'
import GuideTabs from '../../../components/ui/GuideTabs'

export default function VideoPublishView() {
  const navigate = useNavigate()
  return (
    <div className="p-6">
      <PageHeader title="发布管理" subtitle="多平台视频发布管理" onBack={() => navigate('/geo/video')} />
      <div className="rounded-2xl bg-white border border-gray-200 p-16 text-center shadow-sm">
        <div className="text-4xl mb-4">🚀</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">发布管理</h3>
        <p className="text-sm text-gray-500 mb-6">多平台视频发布与排程管理</p>
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-left max-w-md mx-auto">
          <div className="space-y-3">
            {['📱 抖音', '📕 小红书', '📺 B站', '💬 微信', '🌐 微博'].map(item => (
              <div key={item} className="flex items-center gap-3 text-sm text-gray-700">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-6">功能开发中，即将上线</p>
      </div>
      <GuideTabs />
    </div>
  )
}
