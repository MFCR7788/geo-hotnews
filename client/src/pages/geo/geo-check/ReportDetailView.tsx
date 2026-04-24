import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Download, CheckCircle2, XCircle,
  TrendingUp, FileText
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader'
import StatCard from '../../../components/ui/StatCard'
import { geoCheckApi, type GeoReportItem } from '../../../services/geoApi'
import { GEO_LEVEL_CONFIG } from '../../../lib/constants'
import { cn } from '../../../lib/utils'

const PLATFORM_NAMES: Record<string, string> = {
  doubao: '豆包', deepseek: 'DeepSeek', wenxin: '文心一言', kimi: 'Kimi',
  zhipu: '智谱', douyin: '抖音', xiaohongshu: '小红书', bilibili: 'B站',
  weibo: '微博', kuaishou: '快手', wechat: '微信公众号',
}

function getGeoLevel(score: number) {
  return GEO_LEVEL_CONFIG.find(c => score >= c.min) ?? GEO_LEVEL_CONFIG[GEO_LEVEL_CONFIG.length - 1]
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-blue-500'
  return 'text-amber-500'
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; className: string }> = {
    high: { label: '高优先级', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    medium: { label: '中优先级', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    low: { label: '低优先级', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  }
  const cfg = map[priority] ?? { label: priority, className: 'bg-gray-100 text-gray-600' }
  return <span className={cn('text-xs px-2 py-0.5 rounded-full', cfg.className)}>{cfg.label}</span>
}

export default function ReportDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<(GeoReportItem & {
    platformScores?: Record<string, number>
    keywordCoverage?: Array<{ keyword: string; platform: string; covered: boolean; rank: number }>
    recommendations?: Array<{ priority: string; category: string; title: string; description: string; impact: string }>
  }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!id) return
    geoCheckApi.getReportById(id)
      .then(report => setReport(report))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [id])

  function getAiVisibility(): number {
    if (!report?.platformScores) return 0
    const scores = Object.values(report.platformScores) as number[]
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  function getContentCoverage(): number {
    if (!report?.keywordCoverage || report.keywordCoverage.length === 0) return 0
    const covered = report.keywordCoverage.filter(k => k.covered).length
    return Math.round((covered / report.keywordCoverage.length) * 100)
  }

  function getStructuredDataScore(): number {
    if (!report?.platformScores) return 0
    const scores = Object.values(report.platformScores) as number[]
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch(`/api/geo/geo-check/reports/${id}/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `GEO报告_${report?.brand}_${report?.createdAt?.slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {} finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!report) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">报告不存在或加载失败</p>
        <button onClick={() => navigate('/geo/geo-check/reports')} className="mt-4 text-blue-500 hover:underline">
          返回报告列表
        </button>
      </motion.div>
    )
  }

  const level = getGeoLevel(report.overallScore ?? 0)
  const aiVis = getAiVisibility()
  const contentCov = getContentCoverage()
  const structScore = getStructuredDataScore()

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-5xl">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => navigate('/geo/geo-check/reports')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {report.brand} — GEO体检报告
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {report.industry} · {report.createdAt ? new Date(report.createdAt).toLocaleString('zh-CN') : '-'}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg text-sm"
          >
            <Download className="w-4 h-4" />
            {exporting ? '导出中...' : '导出PDF'}
          </button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={report.overallScore ?? '--'}
          label="综合评分"
          color={level.color}
        />
        <StatCard
          value={aiVis}
          label="AI可见度"
          color="#8b5cf6"
        />
        <StatCard
          value={`${contentCov}%`}
          label="内容覆盖"
          color="#10b981"
        />
        <StatCard
          value={structScore}
          label="结构化数据"
          color="#f59e0b"
        />
      </div>

      {/* 平台得分 */}
      {report.platformScores && Object.keys(report.platformScores).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <PageHeader title="📊 AI平台可见度" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            {Object.entries(report.platformScores).map(([platform, score]) => {
              const s = score as number
              const l = getGeoLevel(s)
              return (
                <div key={platform} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 truncate">{PLATFORM_NAMES[platform] ?? platform}</div>
                    <div className={cn('text-xl font-bold', getScoreClass(s))}>{s}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${l.color}15` }}>
                    <span className="text-xs font-bold" style={{ color: l.color }}>{l.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 优化建议 */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <PageHeader title="💡 优化建议" />
          <div className="space-y-3 mt-4">
            {report.recommendations.map((r, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <PriorityBadge priority={r.priority} />
                  <span className="font-medium text-gray-900 dark:text-white">{r.title}</span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{r.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  预期提升：{r.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 关键词详情 */}
      {report.keywordCoverage && report.keywordCoverage.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <PageHeader title="🔍 关键词检测详情" />
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">关键词</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">平台</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">是否提及</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">排名</th>
                </tr>
              </thead>
              <tbody>
                {report.keywordCoverage.map((k, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{k.keyword}</td>
                    <td className="py-2.5 px-3 text-gray-500">{PLATFORM_NAMES[k.platform] ?? k.platform}</td>
                    <td className="py-2.5 px-3">
                      {k.covered ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" /> 提及
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500">
                          <XCircle className="w-4 h-4" /> 未提及
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{k.rank || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  )
}
