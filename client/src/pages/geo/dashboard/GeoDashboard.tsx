import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as echarts from 'echarts/core'
import { LineChart, RadarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, RadarComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  Search, Edit, View, ArrowRight, Bell, Video
} from 'lucide-react'
import StatCard from '../../../components/ui/StatCard'
import PageHeader from '../../../components/ui/PageHeader'
import { dashboardApi, notificationApi, type HealthData, type TrendPoint } from '../../../services/geoApi'

interface AlertItem {
  id: string
  level: string
  message: string
  time: string
}

echarts.use([LineChart, RadarChart, TooltipComponent, GridComponent, RadarComponent, CanvasRenderer])

// GEO等级配置
const GEO_LEVELS = [
  { min: 80, label: '优秀', color: '#67C23A', className: 'geo-excellent' },
  { min: 60, label: '良好', color: '#409EFF', className: 'geo-good' },
  { min: 40, label: '一般', color: '#E6A23C', className: 'geo-fair' },
  { min: 0, label: '较差', color: '#F56C6C', className: 'geo-poor' },
]

function getGeoLevel(score: number) {
  return GEO_LEVELS.find(l => score >= l.min) ?? GEO_LEVELS[GEO_LEVELS.length - 1]
}

function alertTagType(level: string) {
  if (level === 'high') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (level === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
}

function alertLabel(level: string) {
  return level === 'high' ? '严重' : level === 'medium' ? '警告' : '提示'
}

const quickActions = [
  { label: '发起体检', icon: Search, path: '/geo/geo-check', color: 'bg-blue-500 hover:bg-blue-600' },
  { label: '生成内容', icon: Edit, path: '/geo/content/generate', color: 'bg-emerald-500 hover:bg-emerald-600' },
  { label: '运行监测', icon: View, path: '/geo/monitor', color: 'bg-amber-500 hover:bg-amber-600' },
  { label: '创建视频', icon: Video, path: '/geo/video/create', color: 'bg-purple-500 hover:bg-purple-600' },
]

export default function GeoDashboard() {
  const navigate = useNavigate()
  const trendRef = useRef<HTMLDivElement>(null)
  const radarRef = useRef<HTMLDivElement>(null)
  const trendChart = useRef<echarts.ECharts | null>(null)
  const radarChart = useRef<echarts.ECharts | null>(null)

  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)

  // 加载数据
  async function loadData() {
    try {
      const res = await dashboardApi.getHealth('30d')
      if (res) setHealthData(res)
    } catch {
      // 后端未实现时用空数据
      setHealthData({
        overallScore: 0, geoScore: 0, contentGenerated: 0,
        contentCount: 0, publishedCount: 0, alerts: 0,
        monitorQueries: 0, mentionRate: 0,
        lastCheckAt: null, lastMonitorAt: null,
      })
    }
    try {
      const res = await notificationApi.getList({ limit: 5 })
      if (Array.isArray(res)) {
        setAlerts(res.slice(0, 5).map((n: any) => ({
          id: n.id,
          level: n.type === 'alert' ? 'high' : n.type === 'warning' ? 'medium' : 'low',
          message: n.title || n.content || '-',
          time: n.createdAt?.slice(5, 16) || '-',
        })))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 渲染趋势图
  useEffect(() => {
    if (!trendRef.current) return
    trendChart.current = echarts.init(trendRef.current)

    const trend = healthData?.trend
    if (trend && trend.length > 0) {
      const dates = trend.map((t: TrendPoint) => t.date)
      const scores = trend.map((t: TrendPoint) => t.score)

      trendChart.current.setOption({
        tooltip: { trigger: 'axis', formatter: (params: any[]) => {
          const p = params[0]
          return p.value != null ? `${p.name}: ${p.value}分` : `${p.name}: 暂无数据`
        }},
        grid: { top: 16, bottom: 28, left: 48, right: 16 },
        xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11, color: '#9ca3af' } },
        yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 11, color: '#9ca3af' } },
        series: [{
          data: scores,
          type: 'line', smooth: true, connectNulls: true,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59,130,246,0.25)' },
              { offset: 1, color: 'rgba(59,130,246,0.02)' },
            ]),
          },
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          symbol: 'circle', symbolSize: 4,
        }],
      })
    } else {
      // 空数据：生成最近30天日期
      const dates = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 29 + i)
        return `${d.getMonth() + 1}/${d.getDate()}`
      })
      trendChart.current.setOption({
        tooltip: { trigger: 'axis' },
        grid: { top: 16, bottom: 28, left: 48, right: 16 },
        xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11, color: '#9ca3af' } },
        yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 11, color: '#9ca3af' } },
        series: [{ data: Array(30).fill(null), type: 'line', smooth: true }],
      })
    }

    const observer = new ResizeObserver(() => trendChart.current?.resize())
    observer.observe(trendRef.current)
    return () => { observer.disconnect(); trendChart.current?.dispose() }
  }, [healthData?.trend])

  // 渲染雷达图
  useEffect(() => {
    if (!radarRef.current) return
    radarChart.current = echarts.init(radarRef.current)

    const radar = healthData?.radar
    const data = radar
      ? [radar.aiVisibility ?? 0, radar.contentCoverage ?? 0, radar.structuredData ?? 0, radar.competitorCompare ?? 50, radar.overallScore ?? 0]
      : [0, 0, 0, 0, 0]

    radarChart.current.setOption({
      tooltip: {},
      radar: {
        indicator: [
          { name: 'AI可见度', max: 100 },
          { name: '内容覆盖', max: 100 },
          { name: '结构化数据', max: 100 },
          { name: '竞品对比', max: 100 },
          { name: '综合评分', max: 100 },
        ],
        radius: '62%',
        splitNumber: 4,
        axisName: { color: '#6b7280', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: data,
          areaStyle: { color: 'rgba(59,130,246,0.18)' },
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          symbol: 'circle', symbolSize: 4,
        }],
      }],
    })

    const observer = new ResizeObserver(() => radarChart.current?.resize())
    observer.observe(radarRef.current)
    return () => { observer.disconnect(); radarChart.current?.dispose() }
  }, [healthData?.radar])

  const geoLevel = healthData ? getGeoLevel(healthData.overallScore) : null
  const loadingBars = Array(4).fill(0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? loadingBars.map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 h-24 animate-pulse" />
        )) : (
          <>
            <StatCard
              value={healthData?.overallScore ?? '--'}
              label="品牌健康度"
              color={geoLevel?.color}
            />
            <StatCard
              value={healthData?.geoScore ?? '--'}
              label="GEO得分"
              color="#3b82f6"
            />
            <StatCard
              value={healthData?.contentGenerated ?? 0}
              label="本周生成内容"
              color="#10b981"
            />
            <StatCard
              value={healthData?.alerts ?? 0}
              label="监测告警"
              color="#f59e0b"
            />
          </>
        )}
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 趋势图 */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <PageHeader title="GEO得分趋势" />
          <div ref={trendRef} style={{ height: 280 }} />
        </div>

        {/* 雷达图 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <PageHeader title="GEO维度雷达" />
          <div ref={radarRef} style={{ height: 280 }} />
        </div>
      </div>

      {/* 下方快捷入口+告警 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 快捷入口 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <PageHeader title="快捷入口" />
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-medium transition-all ${action.color} active:scale-95`}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-70" />
              </button>
            ))}
          </div>
        </div>

        {/* 最新告警 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <PageHeader
            title="最新告警"
            action={
              <button
                onClick={() => navigate('/geo/notifications')}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                查看全部 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Bell className="w-10 h-10 mb-2 opacity-40" />
              <span className="text-sm">暂无告警</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map(a => (
                <div key={a.id} className="flex items-center gap-2.5 text-sm">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${alertTagType(a.level)}`}>
                    {alertLabel(a.level)}
                  </span>
                  <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{a.message}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
