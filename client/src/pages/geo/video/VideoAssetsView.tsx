/**
 * 素材管理 - 占位页面
 */
import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'

export default function VideoAssetsView() {
  const navigate = useNavigate()
  return (
    <div className="p-6">
      <PageHeader title="素材管理" subtitle="品牌视频、图片、音频素材管理" onBack={() => navigate('/geo/video')} />
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-16 text-center">
        <div className="text-4xl mb-4">📁</div>
        <h3 className="text-lg font-semibold text-white mb-2">素材管理</h3>
        <p className="text-sm text-gray-400 mb-6">品牌视频、图片、音频素材库管理</p>
        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-6 text-left max-w-md mx-auto">
          <div className="divide-y divide-white/5 space-y-3">
            {['🎬 视频素材', '🖼️ 图片素材', '🎵 音频素材', '📄 文档素材'].map(item => (
              <div key={item} className="flex items-center gap-3 text-sm text-gray-300 pt-3 first:pt-0">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-6">功能开发中，即将上线</p>
      </div>
    </div>
  )
}
