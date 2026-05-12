import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Trash2, Eye, AlertCircle,
  CheckCircle2, Clock, XCircle, Loader2,
  BarChart3, Sparkles
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader'
import TagInput from '../../../components/ui/TagInput'
import { geoCheckApi } from '../../../services/geoApi'
import { INDUSTRIES, PLATFORMS, GEO_LEVEL_CONFIG } from '../../../lib/constants'
import type { GeoReportItem } from '../../../services/geoApi'
import { cn } from '../../../lib/utils'
import GuideTabs from '../../../components/ui/GuideTabs'

function getGeoLevel(score: number) {
  return GEO_LEVEL_CONFIG.find(c => score >= c.min) ?? GEO_LEVEL_CONFIG[GEO_LEVEL_CONFIG.length - 1]
}

function getGeoBadge(score: number) {
  const level = getGeoLevel(score)
  const colorMap: Record<string, string> = {
    'geo-excellent': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'geo-good': 'bg-blue-50 text-blue-700 border border-blue-200',
    'geo-fair': 'bg-amber-50 text-amber-700 border border-amber-200',
    'geo-poor': 'bg-red-50 text-red-700 border border-red-200',
  }
  return { color: level.color, className: colorMap[level.className] ?? '' }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; className: string }> = {
    completed: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700' },
    running: { icon: Loader2, className: 'bg-blue-50 text-blue-600 animate-spin' },
    pending: { icon: Clock, className: 'bg-gray-100 text-gray-500' },
    failed: { icon: XCircle, className: 'bg-red-50 text-red-700' },
  }
  const cfg = map[status] ?? map.pending
  const Icon = cfg.icon
  const labels: Record<string, string> = { completed: '已完成', running: '检测中', pending: '等待中', failed: '失败' }
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg', cfg.className)}>
      <Icon className="w-3 h-3" />
      {labels[status] ?? status}
    </span>
  )
}

export default function GeoCheckView() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<GeoReportItem[]>([])
  const [formError, setFormError] = useState('')

  // 表单
  const [brandName, setBrandName] = useState('')
  const [industry, setIndustry] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [competitors, setCompetitors] = useState<string[]>([])

  useEffect(() => {
    geoCheckApi.getReports()
      .then(res => setReports(res.reports || []))
      .catch(() => setReports([]))
  }, [])

  async function handleRun() {
    setFormError('')
    if (!brandName.trim()) { setFormError('请输入品牌名'); return }
    if (!industry) { setFormError('请选择行业'); return }
    if (platforms.length === 0) { setFormError('请选择至少一个检测平台'); return }
    if (keywords.length === 0) { setFormError('请添加至少一个关键词'); return }

    setLoading(true)
    try {
      const accessToken = localStorage.getItem('mfcr_access_token')
      console.log('[GeoCheck] Access token exists:', !!accessToken)
      if (!accessToken) {
        setFormError('未检测到登录状态，请重新登录')
        setLoading(false)
        return
      }
      const report = await geoCheckApi.runCheck({ brand: brandName, industry, platforms, keywords })
      console.log('[GeoCheck] Report created successfully:', report.id)
      setLoading(false)
      await new Promise(resolve => setTimeout(resolve, 300))
      navigate(`/geo/geo-check/reports/${report.id}`)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('[GeoCheck] Request failed with details:', {
        message: errMsg,
        error: error,
        timestamp: new Date().toISOString(),
        hasToken: !!localStorage.getItem('mfcr_access_token')
      })

      if (errMsg.includes('已过期') || errMsg.includes('expired') || errMsg.includes('Authentication failed')) {
        setFormError('登录已过期，请重新登录')
        window.dispatchEvent(new CustomEvent('auth:failure', { detail: { reason: 'token_expired' } }));
      } else if (errMsg.includes('无GEO功能访问权限') || errMsg.includes('403')) {
        setFormError('您的账号没有访问GEO功能的权限，请联系管理员开通')
      } else if (errMsg.includes('Failed to create check task') || errMsg.includes('500')) {
        setFormError('服务器内部错误，请稍后重试或联系技术支持')
      } else if (errMsg.includes('network') || errMsg.includes('Network') || errMsg.includes('Failed to fetch') || errMsg.includes('fetch')) {
        setFormError('网络连接失败，请检查网络设置后重试')
      } else if (errMsg.includes('Request failed')) {
        setFormError('请求失败，可能是服务器无响应，请检查：1) 网络连接 2) 服务器状态 3) 登录状态')
      } else if (errMsg.includes('Invalid response format')) {
        setFormError('服务器响应格式错误，请稍后重试')
      } else {
        setFormError(`体检启动失败: ${errMsg}`)
      }
      setLoading(false)
    }
  }

  function LoadingOverlay() {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
        >
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </motion.div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              正在生成体检报告
            </h3>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              系统正在对「{brandName}」进行全方位GEO检测分析...
            </p>

            <div className="w-full space-y-3 mb-6">
              {[
                { label: '初始化检测引擎', delay: 0 },
                { label: '采集AI平台数据', delay: 500 },
                { label: '分析关键词覆盖', delay: 1000 },
                { label: '生成优化建议', delay: 1500 }
              ].map((step, index) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: step.delay / 2000, duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                    index <= 1 ? 'bg-blue-500' : 'bg-gray-200'
                  )}>
                    {(index <= 1) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: step.delay / 2000 + 0.2 }}
                      >
                        <Sparkles className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <span className={cn(
                    'text-xs',
                    index <= 1 ? 'text-gray-900 font-medium' : 'text-gray-400'
                  )}>
                    {step.label}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>预计需要 10-30 秒，请耐心等待...</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这份报告吗？')) return
    try {
      await geoCheckApi.deleteReport(id)
      setReports(prev => prev.filter(r => r.id !== id))
    } catch {}
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 max-w-5xl"
      >
      {/* 发起体检表单 */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
        <PageHeader title="发起GEO体检" description="选择品牌和平台，获取AI可见度、内容覆盖等全方位GEO健康度报告" />

        <div className="space-y-4 mt-4">
          {/* 品牌名 */}
          <div>
            <label className="block text-base font-bold text-gray-900 mb-2">
              品牌名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="如：超人户外"
              className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm
                         placeholder-gray-400
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
            />
          </div>

          {/* 行业 */}
          <div>
            <label className="block text-base font-bold text-gray-900 mb-2">
              行业 <span className="text-red-500">*</span>
            </label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
            >
              <option value="">选择行业</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {/* 检测平台 */}
          <div>
            <label className="block text-base font-bold text-gray-900 mb-2">
              检测平台 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <label
                  key={p.value}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-all',
                    platforms.includes(p.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={platforms.includes(p.value)}
                    onChange={e => {
                      if (e.target.checked) setPlatforms([...platforms, p.value])
                      else setPlatforms(platforms.filter(x => x !== p.value))
                    }}
                    className="sr-only"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {/* 核心关键词 */}
          <div>
            <label className="block text-base font-bold text-gray-900 mb-2">
              核心关键词 <span className="text-red-500">*</span>
            </label>
            <TagInput
              tags={keywords}
              onChange={setKeywords}
              placeholder="+ 添加关键词"
            />
            <p className="text-xs text-slate-600 mt-1">输入后按回车添加，每个关键词将单独检测AI可见度</p>
          </div>

          {/* 网站URL */}
          <div>
            <label className="block text-base font-bold text-gray-900 mb-2">
              网站URL <span className="text-gray-400 font-normal">(可选)</span>
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbrand.com"
              className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm
                         placeholder-gray-400
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
            />
          </div>

          {/* 竞品品牌 */}
          <div>
            <label className="block text-base font-bold text-gray-900 mb-2">
              竞品品牌 <span className="text-gray-400 font-normal">(可选)</span>
            </label>
            <TagInput
              tags={competitors}
              onChange={setCompetitors}
              placeholder="+ 添加竞品"
              variant="warning"
            />
          </div>

          {/* 错误提示 */}
          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          {/* 提交 */}
          <div className="pt-2">
            <button
              onClick={handleRun}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl text-sm font-medium transition-all active:scale-95"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? '检测中...' : '开始体检'}
            </button>
          </div>
        </div>
      </div>

      {/* 最近体检报告 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
        <PageHeader title="最近体检报告" />

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400">
            <Search className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无体检报告</p>
            <p className="text-xs mt-1">发起体检后将在此显示</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">品牌</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">行业</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">综合得分</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">AI可见度</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">内容覆盖</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">结构化数据</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">体检时间</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
                  const badge = getGeoBadge(r.overallScore ?? 0)
                  let dimensions: Record<string, any> = {}
                  try { if (r.dimensions) dimensions = JSON.parse(r.dimensions) } catch (e) {}
                  const aiVis = dimensions?.aiVisibility ?? dimensions?.aiVis ?? '-'
                  const contentCov = dimensions?.contentCoverage ?? dimensions?.contentCov ?? '-'
                  const structScore = dimensions?.structuredDataScore ?? dimensions?.structScore ?? '-'

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-gray-900">{r.brand}</td>
                      <td className="py-2.5 px-3 text-gray-600">{r.industry ?? '-'}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold" style={{ color: badge.color }}>{r.overallScore}</span>
                          <span className={cn('text-xs px-1.5 py-0.5 rounded-lg', badge.className)}>
                            {getGeoLevel(r.overallScore ?? 0).label}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{typeof aiVis === 'number' ? `${aiVis}%` : aiVis}</td>
                      <td className="py-2.5 px-3 text-gray-600">{typeof contentCov === 'number' ? `${contentCov}%` : contentCov}</td>
                      <td className="py-2.5 px-3 text-gray-600">{typeof structScore === 'number' ? `${structScore}%` : structScore}</td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/geo/geo-check/reports/${r.id}`)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            查看
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 text-xs transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <GuideTabs />
    </motion.div>

      <AnimatePresence>
        {loading && <LoadingOverlay />}
      </AnimatePresence>
    </>
  )
}
