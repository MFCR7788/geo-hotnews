import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Eye, Trash2, FileText, Plus } from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader'
import { geoCheckApi, type GeoReportItem } from '../../../services/geoApi'
import { GEO_LEVEL_CONFIG } from '../../../lib/constants'
import { cn } from '../../../lib/utils'

function getGeoLevel(score: number) {
  return GEO_LEVEL_CONFIG.find(c => score >= c.min) ?? GEO_LEVEL_CONFIG[GEO_LEVEL_CONFIG.length - 1]
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    running: { label: '检测中', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    pending: { label: '等待中', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
    failed: { label: '失败', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }
  const cfg = map[status] ?? map.pending
  return (
    <span className={cn('inline-flex items-center text-xs px-2 py-0.5 rounded-full', cfg.className)}>
      {cfg.label}
    </span>
  )
}

export default function ReportsView() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<GeoReportItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    geoCheckApi.getReports()
      .then(res => setReports(res.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [])

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
      className="space-y-5"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <PageHeader
          title="报告管理"
          description="查看和管理所有GEO体检报告"
          action={
            <button
              onClick={() => navigate('/geo/geo-check')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建体检
            </button>
          }
        />

        {loading ? (
          <div className="animate-pulse space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="w-14 h-14 mb-3 opacity-25" />
            <p className="text-sm font-medium">暂无报告</p>
            <p className="text-xs mt-1">发起体检后将在此显示</p>
            <button
              onClick={() => navigate('/geo/geo-check')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
            >
              <Search className="w-4 h-4" />
              发起体检
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => {
              const level = getGeoLevel(r.overallScore ?? 0)
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all cursor-pointer"
                  onClick={() => navigate(`/geo/geo-check/reports/${r.id}`)}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center"
                    style={{ background: `${level.color}20` }}
                  >
                    <span className="text-2xl font-black" style={{ color: level.color }}>{r.overallScore}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900 dark:text-white">{r.brand}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-gray-400">
                      {r.industry ?? '未分类'} · {r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN') : '-'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/geo/geo-check/reports/${r.id}`) }}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
