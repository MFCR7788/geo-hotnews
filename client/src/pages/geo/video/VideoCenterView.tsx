/**
 * 短视频中心 - 视频项目管理
 * 统计卡片 + 视频列表 + 状态/平台筛选
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { videoApi } from '../../../services/geoApi'
import type { VideoAsset, VideoStats } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'
import StatCard from '../../../components/ui/StatCard'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  uploading: { label: '上传中', color: 'bg-amber-500/15 text-amber-400' },
  ready: { label: '已完成', color: 'bg-blue-500/15 text-blue-400' },
  published: { label: '已发布', color: 'bg-emerald-500/15 text-emerald-400' },
  failed: { label: '失败', color: 'bg-red-500/15 text-red-400' },
}

const PLATFORM_MAP: Record<string, string> = {
  douyin: '抖音', xiaohongshu: '小红书', bilibili: 'B站',
  weibo: '微博', zhihu: '知乎', wechat: '微信', local: '本地',
}

const STATUS_OPTIONS = ['uploading', 'ready', 'published', 'failed']
const PLATFORM_OPTIONS = ['douyin', 'xiaohongshu', 'bilibili', 'weibo', 'zhihu', 'wechat', 'local']

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function VideoCenterView() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<VideoAsset[]>([])
  const [stats, setStats] = useState<VideoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', platform: '' })

  useEffect(() => {
    Promise.all([
      videoApi.getList().catch(() => ({ contents: [], total: 0, page: 1, limit: 20 })),
      videoApi.getStats().catch(() => null),
    ]).then(([listRes, statsRes]) => {
      setVideos(listRes.contents || [])
      setStats(statsRes)
      setLoading(false)
    })
  }, [])

  const filtered = videos.filter(v => {
    if (filter.status && v.status !== filter.status) return false
    if (filter.platform && v.platform !== filter.platform) return false
    return true
  })

  const computedStats = stats ? {
    total: stats.total,
    completed: stats.byStatus.find(s => s.status === 'ready')?.count || 0,
    published: stats.byStatus.find(s => s.status === 'published')?.count || 0,
    generating: stats.byStatus.find(s => s.status === 'uploading')?.count || 0,
  } : { total: 0, completed: 0, published: 0, generating: 0 }

  return (
    <div>
      <PageHeader
        title="短视频中心"
        subtitle="AI视频创作与多平台发布管理"
        onBack={() => navigate('/geo/dashboard')}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="视频总数" value={String(computedStats.total)} trend={null} icon="🎬" color="blue" loading={loading} />
        <StatCard title="已完成" value={String(computedStats.completed)} trend={null} icon="✅" color="green" loading={loading} />
        <StatCard title="已发布" value={String(computedStats.published)} trend={null} icon="🌐" color="purple" loading={loading} />
        <StatCard title="上传中" value={String(computedStats.generating)} trend={null} icon="⏳" color="yellow" loading={loading} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <select
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
          >
            <option value="" className="bg-[#0a0a1a]">全部状态</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s} className="bg-[#0a0a1a]">{STATUS_MAP[s]?.label || s}</option>)}
          </select>
          <select
            value={filter.platform}
            onChange={e => setFilter(f => ({ ...f, platform: e.target.value }))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
          >
            <option value="" className="bg-[#0a0a1a]">全部平台</option>
            {PLATFORM_OPTIONS.map(p => <option key={p} value={p} className="bg-[#0a0a1a]">{PLATFORM_MAP[p] || p}</option>)}
          </select>
        </div>
        <button
          onClick={() => navigate('/geo/video/create')}
          className="px-4 py-2 bg-blue-500/20 text-blue-400 text-sm rounded-lg border border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/50 transition-all"
        >
          + 创建视频
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-500">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="mb-2">暂无视频</p>
            <button onClick={() => navigate('/geo/video/create')} className="text-blue-400 hover:text-blue-300 transition-colors text-sm">创建第一个视频 →</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">缩略图</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">平台</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">状态</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">创建时间</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(video => {
                const statusInfo = STATUS_MAP[video.status] || { label: video.status, color: 'bg-white/10 text-gray-400' }
                return (
                  <tr key={video.id} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="px-6 py-4">
                      {video.coverUrl ? (
                        <img src={video.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-xl">🎬</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">{video.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{PLATFORM_MAP[video.platform] || video.platform}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(video.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {video.status === 'ready' && (
                          <button onClick={() => navigate(`/geo/video/${video.id}/preview`)} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">预览</button>
                        )}
                        {video.status === 'ready' && (
                          <button onClick={() => navigate('/geo/video/publish')} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">发布</button>
                        )}
                        <button onClick={() => navigate(`/geo/video/${video.id}/edit`)} className="text-sm text-gray-400 hover:text-gray-200 transition-colors">编辑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { label: '素材管理', path: '/geo/video/assets', icon: '📁' },
          { label: '发布管理', path: '/geo/video/publish', icon: '🚀' },
          { label: '创建视频', path: '/geo/video/create', icon: '➕' },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 hover:border-white/20 transition-all duration-200"
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-sm text-gray-300">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
