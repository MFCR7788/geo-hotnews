/**
 * 发布管理 - 占位页面
 */
import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'

export default function VideoPublishView() {
  const navigate = useNavigate()
  return (
    <div className="p-6">
      <PageHeader title="发布管理" subtitle="多平台视频发布管理" onBack={() => navigate('/geo/video')} />
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-16 text-center">
        <div className="text-4xl mb-4">🚀</div>
        <h3 className="text-lg font-semibold text-white mb-2">发布管理</h3>
        <p className="text-sm text-slate-500 mb-6">多平台视频发布与排程管理</p>
        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-6 text-left max-w-md mx-auto">
          <div className="space-y-3">
            {['📱 抖音', '📕 小红书', '📺 B站', '💬 微信', '🌐 微博'].map(item => (
              <div key={item} className="flex items-center gap-3 text-sm text-gray-400">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-6">功能开发中，即将上线</p>
      </div>
    </div>
  )
}
