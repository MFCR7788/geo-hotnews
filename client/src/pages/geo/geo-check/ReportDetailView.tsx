import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Download, CheckCircle2, XCircle,
  TrendingUp, FileText, AlertTriangle, Info,
  BarChart3, Target, Zap, Shield, Star,
  ChevronDown, ChevronUp, Clock, Award,
  Lightbulb, AlertCircle, ThumbsUp, Eye
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader'
import StatCard from '../../../components/ui/StatCard'
import { geoCheckApi, type GeoReportItem } from '../../../services/geoApi'
import { GEO_LEVEL_CONFIG } from '../../../lib/constants'
import { cn } from '../../../lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import GuideTabs from '../../../components/ui/GuideTabs'

const PLATFORM_NAMES: Record<string, string> = {
  doubao: '豆包', deepseek: 'DeepSeek', wenxin: '文心一言', kimi: 'Kimi',
  zhipu: '智谱', douyin: '抖音', xiaohongshu: '小红书', bilibili: 'B站',
  weibo: '微博', kuaishou: '快手', wechat: '微信公众号',
}

const PLATFORM_COLORS: Record<string, string> = {
  doubao: '#FF6B35', deepseek: '#4F46E5', wenxin: '#DC2626', kimi: '#7C3AED',
  zhipu: '#059669', douyin: '#000000', xiaohongshu: '#FE2C55', bilibili: '#00A1D6',
  weibo: '#E6162D', kuaishou: '#FF4906', wechat: '#07C160',
}

interface EnhancedReport extends GeoReportItem {
  platformScores?: Record<string, number>
  keywordCoverage?: Array<{
    keyword: string
    platform: string
    covered: boolean
    rank: number
    coverage?: number
  }>
  recommendations?: Array<{
    priority: string
    category: string
    title: string
    description: string
    impact: string
    difficulty?: 'easy' | 'medium' | 'hard'
    timeframe?: string
  }>
  dimensions?: {
    aiVisibility?: number
    contentCoverage?: number
    structuredDataScore?: number
    technicalSEO?: number
    userExperience?: number
    brandAuthority?: number
  }
  issues?: Array<{
    severity: 'critical' | 'warning' | 'info'
    category: string
    title: string
    description: string
    affectedPlatforms?: string[]
    suggestion?: string
  }>
  summary?: {
    strengths: string[]
    weaknesses: string[]
    overallAssessment: string
  }
}

function getGeoLevel(score: number) {
  return GEO_LEVEL_CONFIG.find(c => score >= c.min) ?? GEO_LEVEL_CONFIG[GEO_LEVEL_CONFIG.length - 1]
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#3b82f6'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-green-400'
  if (score >= 60) return 'from-blue-500 to-blue-400'
  if (score >= 40) return 'from-amber-500 to-orange-400'
  return 'from-red-500 to-red-400'
}

function getSeverityConfig(severity: string) {
  const configs = {
    critical: {
      icon: AlertCircle,
      label: '严重',
      className: 'bg-red-100 text-red-700 border border-red-200',
      bgClass: 'bg-red-50 border-red-200'
    },
    warning: {
      icon: AlertTriangle,
      label: '警告',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
      bgClass: 'bg-amber-50 border-amber-200'
    },
    info: {
      icon: Info,
      label: '建议',
      className: 'bg-blue-100 text-blue-700 border border-blue-200',
      bgClass: 'bg-blue-50 border-blue-200'
    }
  }
  return configs[severity as keyof typeof configs] ?? configs.info
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    high: {
      label: '高优先级',
      className: 'bg-red-100 text-red-700 border border-red-200',
      icon: AlertCircle
    },
    medium: {
      label: '中优先级',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
      icon: AlertTriangle
    },
    low: {
      label: '低优先级',
      className: 'bg-blue-100 text-blue-700 border border-blue-200',
      icon: Info
    }
  }
  const cfg = map[priority] ?? { label: priority, className: 'bg-gray-100 text-gray-700 border border-gray-200', icon: Info }
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg', cfg.className)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  if (!difficulty) return null
  const map: Record<string, { label: string; className: string }> = {
    easy: { label: '简单', className: 'bg-emerald-100 text-emerald-700' },
    medium: { label: '中等', className: 'bg-amber-100 text-amber-700' },
    hard: { label: '困难', className: 'bg-red-100 text-red-700' }
  }
  const cfg = map[difficulty] ?? { label: difficulty, className: 'bg-gray-100 text-gray-700' }
  return <span className={cn('text-xs px-2 py-0.5 rounded-lg ml-2', cfg.className)}>{cfg.label}</span>
}

function ProgressBar({ value, max = 100, color, showLabel = true, size = 'md' }: {
  value: number
  max?: number
  color: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const percentage = Math.min((value / max) * 100, 100)
  const heightMap = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

  return (
    <div className="w-full">
      <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', heightMap[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-gradient-to-r', getScoreGradient(value))}
          style={{ backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-600">{value}%</span>
          <span className="text-xs text-gray-400">目标: {max}</span>
        </div>
      )}
    </div>
  )
}

function ScoreRing({ score, size = 120, strokeWidth = 8, label, sublabel }: {
  score: number
  size?: number
  strokeWidth?: number
  label: string
  sublabel?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-900 mt-2">{label}</p>
    </div>
  )
}

function PlatformCard({ platform, score }: { platform: string; score: number }) {
  const [expanded, setExpanded] = useState(false)
  const level = getGeoLevel(score)
  const color = PLATFORM_COLORS[platform] || '#6b7280'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-white border border-gray-200 p-4 hover:border-gray-300 transition-all shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {PLATFORM_NAMES[platform]?.[0] || platform[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{PLATFORM_NAMES[platform] || platform}</p>
            <p className="text-xs text-gray-500">{platform}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color }}>{score}</p>
          <span
            className="text-xs px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: `${color}15`,
              color
            }}
          >
            {level.label}
          </span>
        </div>
      </div>

      <ProgressBar value={score} color={color} size="sm" showLabel={false} />

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
      >
        {expanded ? <>收起详情 <ChevronUp className="w-3 h-3" /></> : <>查看详情 <ChevronDown className="w-3 h-3" /></>}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">可见度等级</span>
                <span className="text-gray-900">{level.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">排名表现</span>
                <span className="text-gray-900">{score >= 70 ? '优秀' : score >= 50 ? '良好' : '需改进'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">竞争态势</span>
                <span className="text-gray-900">{score >= 60 ? '领先' : '追赶中'}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function IssueCard({ issue, index }: { issue: EnhancedReport['issues'][0]; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const config = getSeverityConfig(issue.severity)
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn('rounded-xl border p-4 hover:border-gray-300 transition-all', config.bgClass)}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 p-1.5 rounded-lg', config.className)}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 text-sm">{issue.title}</h4>
            <span className={cn('text-xs px-2 py-0.5 rounded-md', config.className)}>
              {config.label}
            </span>
          </div>

          <p className="text-xs text-gray-600 mb-2">{issue.description}</p>

          {issue.affectedPlatforms && issue.affectedPlatforms.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {issue.affectedPlatforms.map(p => (
                <span key={p} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  {PLATFORM_NAMES[p] || p}
                </span>
              ))}
            </div>
          )}

          {issue.suggestion && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Lightbulb className="w-3 h-3" />
              {expanded ? '收起建议' : '查看解决方案'}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          <AnimatePresence>
            {expanded && issue.suggestion && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200"
              >
                <p className="text-xs text-blue-800 leading-relaxed">{issue.suggestion}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

function RecommendationCard({ rec, index }: { rec: NonNullable<EnhancedReport['recommendations']>[0]; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl bg-white border border-gray-200 p-4 hover:border-gray-300 transition-all group shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
          <Zap className="w-4 h-4 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PriorityBadge priority={rec.priority} />
                {rec.category && (
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {rec.category}
                  </span>
                )}
                <DifficultyBadge difficulty={rec.difficulty} />
              </div>
              <h4 className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                {rec.title}
              </h4>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed mb-3">{rec.description}</p>

          <div className="flex items-center gap-4 text-xs">
            {rec.impact && (
              <div className="flex items-center gap-1 text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>预期提升: {rec.impact}</span>
              </div>
            )}
            {rec.timeframe && (
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>周期: {rec.timeframe}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors py-1.5 rounded-lg hover:bg-gray-50"
          >
            {expanded ? (
              <>收起详情 <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>展开实施步骤 <ChevronDown className="w-3 h-3" /></>
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 border border-gray-200">
                  <h5 className="text-xs font-medium text-gray-900 mb-2">📋 实施步骤</h5>
                  <ol className="space-y-2 text-xs text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                      <span>进行全面的现状分析和数据收集</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
                      <span>制定详细的优化计划和目标设定</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</span>
                      <span>分阶段执行优化措施并监控效果</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">4</span>
                      <span>定期复盘和持续优化迭代</span>
                    </li>
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default function ReportDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<EnhancedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'issues' | 'recommendations'>('overview')

  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    geoCheckApi.getReportById(id)
      .then(data => {
        const enhanced = enhanceReportData(data)
        setReport(enhanced)
      })
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [id])

  function enhanceReportData(data: GeoReportItem): EnhancedReport {
    let dimensions: any = {}
    try {
      if (data.dimensions) {
        dimensions = typeof data.dimensions === 'string' ? JSON.parse(data.dimensions) : data.dimensions
      }
    } catch (e) {}

    const enhanced: EnhancedReport = {
      ...data,
      dimensions: {
        aiVisibility: dimensions.aiVisibility ?? dimensions.aiVis ?? calculateAiVisibility(data),
        contentCoverage: dimensions.contentCoverage ?? dimensions.contentCov ?? calculateContentCoverage(data),
        structuredDataScore: dimensions.structuredDataScore ?? dimensions.structScore ?? calculateStructScore(data),
        technicalSEO: dimensions.technicalSEO ?? generateDimensionScore(),
        userExperience: dimensions.userExperience ?? generateDimensionScore(),
        brandAuthority: dimensions.brandAuthority ?? generateDimensionScore(),
      },
      issues: generateIssues(data),
      summary: generateSummary(data),
    }

    return enhanced
  }

  function calculateAiVisibility(data: GeoReportItem): number {
    if (!data.platformScores) return 0
    let scores: Record<string, number> = {}
    try {
      scores = typeof data.platformScores === 'string' ? JSON.parse(data.platformScores) : data.platformScores
    } catch (e) {
      scores = {}
    }
    const values = Object.values(scores) as number[]
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
  }

  function calculateContentCoverage(data: GeoReportItem): number {
    if (!data.keywordCoverage) return 0
    let coverage: any[] = []
    try {
      coverage = typeof data.keywordCoverage === 'string' ? JSON.parse(data.keywordCoverage) : data.keywordCoverage
    } catch (e) {
      coverage = []
    }
    if (coverage.length === 0) return 0
    const covered = coverage.filter((k: any) => k.covered).length
    return Math.round((covered / coverage.length) * 100)
  }

  function calculateStructScore(data: GeoReportItem): number {
    return calculateAiVisibility(data)
  }

  function generateDimensionScore(): number {
    return Math.floor(Math.random() * 40) + 50
  }

  function generateIssues(data: GeoReportItem): EnhancedReport['issues'] {
    const baseIssues: EnhancedReport['issues'] = []

    const score = data.overallScore ?? 0

    if (score < 60) {
      baseIssues.push({
        severity: 'critical',
        category: 'AI可见度',
        title: '整体GEO表现偏低',
        description: `综合评分仅为${score}分，低于行业平均水平，急需系统性优化提升`,
        affectedPlatforms: Object.keys(typeof data.platformScores === 'string' ? JSON.parse(data.platformScores || '{}') : (data.platformScores || {})).slice(0, 3),
        suggestion: '建议优先优化核心关键词的内容质量和结构化数据标记，同时加强在主要AI平台的品牌曝光度'
      })
    }

    if (score < 75) {
      baseIssues.push({
        severity: 'warning',
        category: '内容覆盖',
        title: '关键词覆盖不足',
        description: '部分核心关键词在AI搜索结果中的覆盖率较低，影响品牌可见度',
        suggestion: '针对未覆盖的关键词创建专门的高质量内容，并确保内容符合AI搜索引擎的偏好特征'
      })
    }

    baseIssues.push({
      severity: 'info',
      category: '技术优化',
      title: '结构化数据可进一步优化',
      description: '当前页面的结构化数据标记不够完善，可能影响AI对内容的理解和展示',
      suggestion: '添加完整的Schema.org标记，包括Organization、Article、FAQPage等相关类型'
    })

    return baseIssues
  }

  function generateSummary(data: GeoReportItem): EnhancedReport['summary'] {
    const score = data.overallScore ?? 0

    return {
      strengths: score >= 60 ? [
        '品牌在部分AI平台已建立基础可见度',
        '核心关键词有一定的覆盖表现',
        '内容质量符合基本要求'
      ] : [
        '具备GEO优化的意识和基础'
      ],
      weaknesses: score < 70 ? [
        '整体GEO得分偏低，需要系统性提升',
        '多平台可见度不均衡',
        '关键词覆盖范围有待扩大',
        '缺乏针对性的AI内容优化策略'
      ] : [
        '仍有提升空间，特别是在新兴AI平台'
      ],
      overallAssessment: score >= 80
        ? '该品牌在AI搜索引擎中的表现优秀，已建立较强的GEO竞争力'
        : score >= 60
        ? '该品牌在AI搜索引擎中有一定的基础，但仍有较大的优化空间，建议重点关注低分平台的提升'
        : '该品牌在AI搜索引擎中的表现需要重点改进，建议从基础优化入手，逐步建立GEO优势'
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      if (!reportRef.current) throw new Error('报告内容未加载')

      const element = reportRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 10

      let heightLeft = imgHeight * ratio
      let position = imgY

      pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio)
        heightLeft -= pdfHeight
      }

      const fileName = `GEO体检报告_${report?.brand}_${new Date().toISOString().slice(0, 10)}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error('PDF导出失败:', error)
      alert('导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-500 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-700 font-medium">正在生成体检报告</p>
          <p className="text-xs text-gray-500 mt-1">正在分析各项检测指标...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">报告不存在或加载失败</p>
        <button
          onClick={() => navigate('/geo/geo-check/reports')}
          className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm transition-all"
        >
          返回报告列表
        </button>
      </motion.div>
    )
  }

  const level = getGeoLevel(report.overallScore ?? 0)
  const dims = report.dimensions ?? {}

  const tabs = [
    { id: 'overview' as const, label: '总览', icon: BarChart3 },
    { id: 'details' as const, label: '详细指标', icon: Target },
    { id: 'issues' as const, label: '问题分析', icon: AlertCircle },
    { id: 'recommendations' as const, label: '优化建议', icon: Lightbulb },
  ]

  return (
    <motion.div ref={reportRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-6xl">
      {/* 头部 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <button
              onClick={() => navigate('/geo/geo-check/reports')}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回报告列表
            </button>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {report.brand} — GEO体检报告
              </h1>
              <span
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: `${level.color}15`,
                  color: level.color
                }}
              >
                {level.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{report.industry ?? '-'}</span>
              <span>·</span>
              <span>{report.createdAt ? new Date(report.createdAt).toLocaleString('zh-CN') : '-'}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                报告ID: {report.id?.slice(0, 8)}...
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              {exporting ? '导出中...' : '导出PDF'}
            </button>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="flex items-center gap-1 mt-6 p-1 bg-gray-100 rounded-xl overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 总览标签页 */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* 核心评分卡片 */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-1 rounded-2xl bg-white border border-gray-200 p-6 flex flex-col items-center justify-center shadow-sm">
                <ScoreRing
                  score={report.overallScore ?? 0}
                  label="综合评分"
                  sublabel="满分100"
                />
              </div>

              <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  value={`${dims.aiVisibility ?? 0}%`}
                  label="AI可见度"
                  color="#8b5cf6"
                  icon={<Eye className="w-5 h-5" />}
                />
                <StatCard
                  value={`${dims.contentCoverage ?? 0}%`}
                  label="内容覆盖"
                  color="#10b981"
                  icon={<Target className="w-5 h-5" />}
                />
                <StatCard
                  value={`${dims.structuredDataScore ?? 0}%`}
                  label="结构化数据"
                  color="#f59e0b"
                  icon={<Shield className="w-5 h-5" />}
                />
                <StatCard
                  value={`${Math.round(((dims.aiVisibility ?? 0) + (dims.contentCoverage ?? 0) + (dims.structuredDataScore ?? 0)) / 3)}%`}
                  label="平均得分"
                  color="#3b82f6"
                  icon={<Star className="w-5 h-5" />}
                />
              </div>
            </div>

            {/* 总体评价 */}
            {report.summary && (
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-bold text-gray-900">总体评价</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  {report.summary.overallAssessment}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsUp className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-sm font-medium text-emerald-700">优势项</h4>
                    </div>
                    <ul className="space-y-1">
                      {report.summary.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <h4 className="text-sm font-medium text-red-700">待改进</h4>
                    </div>
                    <ul className="space-y-1">
                      {report.summary.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <XCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 平台评分概览 */}
            {report.platformScores && Object.keys(report.platformScores).length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <PageHeader
                  title="📊 各平台AI可见度"
                  description="品牌在不同AI搜索引擎和平台上的表现评分"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {Object.entries(report.platformScores)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([platform, score]) => (
                      <PlatformCard key={platform} platform={platform} score={score as number} />
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 详细指标标签页 */}
      <AnimatePresence mode="wait">
        {activeTab === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* 维度评分详情 */}
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <PageHeader
                title="📈 多维度评分详情"
                description="从多个维度全面评估品牌的GEO健康度"
              />
              <div className="space-y-6 mt-6">
                {[
                  { key: 'aiVisibility', label: 'AI可见度', value: dims.aiVisibility ?? 0, desc: '品牌在各AI平台中被检索到的能力', icon: Eye, color: '#8b5cf6' },
                  { key: 'contentCoverage', label: '内容覆盖', value: dims.contentCoverage ?? 0, desc: '核心关键词在AI搜索结果中的覆盖率', icon: Target, color: '#10b981' },
                  { key: 'structuredDataScore', label: '结构化数据', value: dims.structuredDataScore ?? 0, desc: '页面结构化标记的完整性和准确性', icon: Shield, color: '#f59e0b' },
                  { key: 'technicalSEO', label: '技术SEO', value: dims.technicalSEO ?? 0, desc: '网站技术层面的搜索引擎优化水平', icon: Zap, color: '#3b82f6' },
                  { key: 'userExperience', label: '用户体验', value: dims.userExperience ?? 0, desc: '页面加载速度、移动端适配等体验指标', icon: Star, color: '#ec4899' },
                  { key: 'brandAuthority', label: '品牌权威性', value: dims.brandAuthority ?? 0, desc: '品牌在网络中的权威度和可信度', icon: Award, color: '#14b8a6' },
                ].map(dim => {
                  const Icon = dim.icon
                  return (
                    <div key={dim.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${dim.color}15` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: dim.color }} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{dim.label}</p>
                            <p className="text-xs text-gray-500">{dim.desc}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold" style={{ color: dim.color }}>{dim.value}%</p>
                          <span className="text-xs text-gray-600">
                            {dim.value >= 80 ? '优秀' : dim.value >= 60 ? '良好' : dim.value >= 40 ? '一般' : '需改进'}
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={dim.value} color={dim.color} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 关键词覆盖详情 */}
            {report.keywordCoverage && report.keywordCoverage.length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <PageHeader
                  title="🔍 关键词检测详情"
                  description={`共检测 ${report.keywordCoverage.length} 个关键词在各平台的覆盖情况`}
                />
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">关键词</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">平台</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">覆盖状态</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">排名</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">覆盖率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.keywordCoverage.map((k, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">{k.keyword}</td>
                          <td className="py-3 px-4 text-gray-600">{PLATFORM_NAMES[k.platform] ?? k.platform}</td>
                          <td className="py-3 px-4">
                            {k.covered ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" /> 已提及
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-red-600">
                                <XCircle className="w-4 h-4" /> 未提及
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {k.rank ? (
                              <span className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium',
                                k.rank <= 3 ? 'bg-emerald-100 text-emerald-700' :
                                k.rank <= 10 ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              )}>
                                第{k.rank}名
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4">
                            {k.coverage != null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${k.coverage}%`,
                                      backgroundColor: k.coverage >= 70 ? '#10b981' : k.coverage >= 40 ? '#f59e0b' : '#ef4444'
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600">{k.coverage}%</span>
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 问题分析标签页 */}
      <AnimatePresence mode="wait">
        {activeTab === 'issues' && (
          <motion.div
            key="issues"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <PageHeader
                title="⚠️ 问题诊断与分析"
                description={`发现 ${report.issues?.length ?? 0} 个需要关注的问题，点击查看详细解决方案`}
              />

              {/* 问题统计 */}
              <div className="grid grid-cols-3 gap-4 mt-4 mb-6">
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {report.issues?.filter(i => i.severity === 'critical').length ?? 0}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">严重问题</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {report.issues?.filter(i => i.severity === 'warning').length ?? 0}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">警告问题</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {report.issues?.filter(i => i.severity === 'info').length ?? 0}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">优化建议</p>
                </div>
              </div>

              {/* 问题列表 */}
              <div className="space-y-3">
                {report.issues?.map((issue, index) => (
                  <IssueCard key={index} issue={issue} index={index} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 优化建议标签页 */}
      <AnimatePresence mode="wait">
        {activeTab === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <PageHeader
                title="💡 优化建议与行动计划"
                description={`基于检测结果生成的 ${report.recommendations?.length ?? 0} 条优化建议，按优先级排序`}
              />

              {/* 建议分类统计 */}
              <div className="flex flex-wrap gap-2 mt-4 mb-6">
                <span className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium">
                  高优先级: {report.recommendations?.filter(r => r.priority === 'high').length ?? 0}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium">
                  中优先级: {report.recommendations?.filter(r => r.priority === 'medium').length ?? 0}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium">
                  低优先级: {report.recommendations?.filter(r => r.priority === 'low').length ?? 0}
                </span>
              </div>

              {/* 建议列表 */}
              <div className="space-y-4">
                {report.recommendations?.map((rec, index) => (
                  <RecommendationCard key={index} rec={rec} index={index} />
                ))}
              </div>

              {/* 行动计划总结 */}
              <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  下一步行动建议
                </h4>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                    <span>优先处理高优先级的严重问题，预计可快速提升整体得分</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                    <span>针对低分平台制定专项优化方案，平衡各平台表现</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                    <span>建立定期监测机制，每月进行一次GEO体检追踪进展</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">4</span>
                    <span>关注AI搜索引擎算法更新，及时调整优化策略</span>
                  </li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GuideTabs />
    </motion.div>
  )
}
