import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search, Trash2, Eye, AlertCircle,
  CheckCircle2, Clock, XCircle, Loader2
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader'
import TagInput from '../../../components/ui/TagInput'
import { geoCheckApi } from '../../../services/geoApi'
import { INDUSTRIES, PLATFORMS, GEO_LEVEL_CONFIG } from '../../../lib/constants'
import type { GeoReportItem } from '../../../services/geoApi'
import { cn } from '../../../lib/utils'

function getGeoLevel(score: number) {
  return GEO_LEVEL_CONFIG.find(c => score >= c.min) ?? GEO_LEVEL_CONFIG[GEO_LEVEL_CONFIG.length - 1]
}

function getGeoBadge(score: number) {
  const level = getGeoLevel(score)
  const colorMap: Record<string, string> = {
    'geo-excellent': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'geo-good': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'geo-fair': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'geo-poor': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return { color: level.color, className: colorMap[level.className] ?? '' }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; className: string }> = {
    completed: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
    running: { icon: Loader2, className: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 animate-spin' },
    pending: { icon: Clock, className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
    failed: { icon: XCircle, className: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
  }
  const cfg = map[status] ?? map.pending
  const Icon = cfg.icon
  const labels: Record<string, string> = { completed: '已完成', running: '检测中', pending: '等待中', failed: '失败' }
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', cfg.className)}>
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
      const report = await geoCheckApi.runCheck({ brand: brandName, industry, platforms, keywords })
      navigate(`/geo/geo-check/reports/${report.id}`)
    } catch {
      setFormError('体检启动失败，请检查网络或稍后重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这份报告吗？')) return
    try {
      await geoCheckApi.deleteReport(id)
      setReports(prev => prev.filter(r => r.id !== id))
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-5xl"
    >
      {/* 发起体检表单 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <PageHeader title="发起GEO体检" description="选择品牌和平台，获取AI可见度、内容覆盖等全方位GEO健康度报告" />

        <div className="space-y-4 mt-4">
          {/* 品牌名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              品牌名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="如：超人户外"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 行业 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              行业 <span className="text-red-500">*</span>
            </label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择行业</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {/* 检测平台 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              检测平台 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <label
                  key={p.value}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                    platforms.includes(p.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              核心关键词 <span className="text-red-500">*</span>
            </label>
            <TagInput
              tags={keywords}
              onChange={setKeywords}
              placeholder="+ 添加关键词"
            />
            <p className="text-xs text-gray-400 mt-1">输入后按回车添加，每个关键词将单独检测AI可见度</p>
          </div>

          {/* 网站URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              网站URL <span className="text-gray-400 font-normal">(可选)</span>
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbrand.com"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 竞品品牌 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          {/* 提交 */}
          <div className="pt-2">
            <button
              onClick={handleRun}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors active:scale-95"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? '检测中...' : '开始体检'}
            </button>
          </div>
        </div>
      </div>

      {/* 最近体检报告 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
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
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">品牌</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">行业</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">综合得分</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">状态</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">体检时间</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
                  const badge = getGeoBadge(r.overallScore ?? 0)
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    >
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{r.brand}</td>
                      <td className="py-2.5 px-3 text-gray-500">{r.industry ?? '-'}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold" style={{ color: badge.color }}>{r.overallScore}</span>
                          <span className={cn('text-xs px-1.5 py-0.5 rounded', badge.className)}>
                            {getGeoLevel(r.overallScore ?? 0).label}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                      <td className="py-2.5 px-3 text-gray-400 text-xs">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/geo/geo-check/reports/${r.id}`)}
                            className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            查看
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 text-xs"
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
    </motion.div>
  )
}
