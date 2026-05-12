import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as echarts from 'echarts/core'
import { LineChart, RadarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, RadarComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  Search, Edit, View, Bell, Video
} from 'lucide-react'
import { dashboardApi, notificationApi, type HealthData, type TrendPoint } from '../../../services/geoApi'
import GuideTabs from '../../../components/ui/GuideTabs'

/* ===== Apple Design Colors ===== */
const APPLE_BLUE = '#007AFF'
const APPLE_GREEN = '#34C759'
const APPLE_ORANGE = '#FF9500'
const APPLE_RED = '#FF3B30'
const GRAY_900 = '#1C1C1E'
const GRAY_600 = '#636366'
const GRAY_500 = '#8E8E93'
const GRAY_200 = '#E8E8ED'
const GRAY_300 = '#D2D2D7'
const GRAY_100 = '#F5F5F7'
const WHITE = '#FFFFFF'
const CARD_SHADOW = '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'
const CARD_HOVER_SHADOW = '0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)'

interface AlertItem {
  id: string
  level: string
  message: string
  time: string
  hotspotUrl?: string
}

echarts.use([LineChart, RadarChart, TooltipComponent, GridComponent, RadarComponent, CanvasRenderer])

const GEO_LEVELS = [
  { min: 80, label: '优秀', color: APPLE_GREEN, icon: '🏆' },
  { min: 60, label: '良好', color: APPLE_BLUE, icon: '✨' },
  { min: 40, label: '一般', color: APPLE_ORANGE, icon: '⚡' },
  { min: 0, label: '较差', color: APPLE_RED, icon: '⚠️' },
]

function getGeoLevel(score: number) {
  return GEO_LEVELS.find(l => score >= l.min) ?? GEO_LEVELS[GEO_LEVELS.length - 1]
}

function alertLabel(level: string) {
  return level === 'high' ? '严重' : level === 'medium' ? '警告' : '提示'
}

const quickActions = [
  { label: '发起体检', icon: Search, path: '/geo/geo-check', color: APPLE_BLUE },
  { label: '生成内容', icon: Edit, path: '/geo/content/generate', color: APPLE_GREEN },
  { label: '运行监测', icon: View, path: '/geo/monitor', color: APPLE_ORANGE },
  { label: '创建视频', icon: Video, path: '/geo/video/create', color: APPLE_BLUE },
]

const cardBase: React.CSSProperties = {
  background: WHITE,
  borderRadius: '16px',
  padding: '24px',
  boxShadow: CARD_SHADOW,
  border: '1px solid rgba(0,0,0,0.04)',
}

function StatCardItem({ value, label, color, delay = 0 }: { value: string | number; label: string; color?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{ ...cardBase, textAlign: 'center' }}
    >
      <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.2, color: color || GRAY_900 }}>{value ?? '--'}</div>
      <div style={{ fontSize: '13px', color: GRAY_500, marginTop: '6px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
    </motion.div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={cardBase}>
      <h3 style={{ fontSize: '17px', fontWeight: 600, color: GRAY_900, margin: '0 0 16px 0' }}>{title}</h3>
      {children}
    </div>
  )
}

export default function GeoDashboard() {
  const navigate = useNavigate()
  const trendRef = useRef<HTMLDivElement>(null)
  const radarRef = useRef<HTMLDivElement>(null)
  const trendChart = useRef<echarts.ECharts | null>(null)
  const radarChart = useRef<echarts.ECharts | null>(null)

  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    try {
      const res = await dashboardApi.getHealth('30d')
      if (res) setHealthData(res)
    } catch {
      setHealthData({ overallScore: 0, geoScore: 0, contentGenerated: 0, contentCount: 0, publishedCount: 0, alerts: 0, monitorQueries: 0, mentionRate: 0, lastCheckAt: null, lastMonitorAt: null })
    }
    try {
      const res = await notificationApi.getList({ limit: 5 })
      if (res?.data && Array.isArray(res.data)) {
        setAlerts(res.data.slice(0, 5).map((n: any) => ({ id: n.id, level: n.type === 'alert' ? 'high' : n.type === 'warning' ? 'medium' : 'low', message: n.title || n.content || '-', time: n.createdAt?.slice(5, 16) || '-', hotspotUrl: n.hotspotUrl })))
      }
    } catch { }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!trendRef.current) return
    trendChart.current = echarts.init(trendRef.current)
    const trend = healthData?.trend
    if (trend && trend.length > 0) {
      const dates = trend.map((t: TrendPoint) => t.date)
      const scores = trend.map((t: TrendPoint) => t.score)
      trendChart.current.setOption({
        tooltip: { trigger: 'axis', backgroundColor: WHITE, borderColor: GRAY_200, textStyle: { color: GRAY_900 }, formatter: (params: any[]) => { const p = params[0]; return p.value != null ? `${p.name}: ${p.value}分` : `${p.name}: 暂无数据` } },
        grid: { top: 20, bottom: 30, left: 50, right: 20 },
        xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: GRAY_200 } }, axisLabel: { fontSize: 11, color: GRAY_500 } },
        yAxis: { type: 'value', min: 0, max: 100, axisLine: { show: false }, axisLabel: { fontSize: 11, color: GRAY_500 }, splitLine: { lineStyle: { color: GRAY_200, type: 'dashed' } } },
        series: [{ data: scores, type: 'line', smooth: true, connectNulls: true, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(0,122,255,0.25)' }, { offset: 1, color: 'rgba(0,122,255,0.02)' }]) }, lineStyle: { color: APPLE_BLUE, width: 2 }, itemStyle: { color: APPLE_BLUE }, symbol: 'circle', symbolSize: 6 }],
      })
    } else {
      const dates = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return `${d.getMonth() + 1}/${d.getDate()}` })
      trendChart.current.setOption({ tooltip: { trigger: 'axis' }, grid: { top: 16, bottom: 32, left: 48, right: 16 }, xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11, color: GRAY_500 } }, yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 11, color: GRAY_500 } }, series: [{ data: Array(30).fill(null), type: 'line', smooth: true }] })
    }
    const observer = new ResizeObserver(() => trendChart.current?.resize())
    observer.observe(trendRef.current)
    return () => { observer.disconnect(); trendChart.current?.dispose() }
  }, [healthData?.trend])

  useEffect(() => {
    if (!radarRef.current) return
    radarChart.current = echarts.init(radarRef.current)
    const radar = healthData?.radar
    const data = radar ? [radar.aiVisibility ?? 0, radar.contentCoverage ?? 0, radar.structuredData ?? 0, radar.competitorCompare ?? 50, radar.overallScore ?? 0] : [0, 0, 0, 0, 0]
    radarChart.current.setOption({
      tooltip: { backgroundColor: WHITE, borderColor: GRAY_200, textStyle: { color: GRAY_900 } },
      radar: { indicator: [{ name: 'AI可见度', max: 100 }, { name: '内容覆盖', max: 100 }, { name: '结构化数据', max: 100 }, { name: '竞品对比', max: 100 }, { name: '综合评分', max: 100 }], radius: '65%', splitNumber: 4, axisName: { color: GRAY_600, fontSize: 11 }, splitLine: { lineStyle: { color: GRAY_200 } }, splitArea: { show: false }, axisLine: { lineStyle: { color: GRAY_300 } } },
      series: [{ type: 'radar', data: [{ value: data, areaStyle: { color: 'rgba(0,122,255,0.15)' }, lineStyle: { color: APPLE_BLUE, width: 2 }, itemStyle: { color: APPLE_BLUE }, symbol: 'circle', symbolSize: 6 }] }],
    })
    const observer = new ResizeObserver(() => radarChart.current?.resize())
    observer.observe(radarRef.current)
    return () => { observer.disconnect(); radarChart.current?.dispose() }
  }, [healthData?.radar])

  const geoLevel = healthData ? getGeoLevel(healthData.overallScore) : null
  const loadingBars = Array(4).fill(0)

  return (
    <div style={{ padding: '24px 24px 32px', background: GRAY_100 }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {loading ? loadingBars.map((_, i) => <div key={i} className="apple-skeleton" style={{ height: '100px', borderRadius: '16px' }} />) : (
            <>
              <StatCardItem value={healthData?.overallScore ?? '--'} label="品牌健康度" color={geoLevel?.color || APPLE_BLUE} delay={0} />
              <StatCardItem value={healthData?.geoScore ?? '--'} label="GEO得分" color={APPLE_BLUE} delay={0.1} />
              <StatCardItem value={healthData?.contentGenerated ?? 0} label="本周生成内容" color={APPLE_GREEN} delay={0.2} />
              <StatCardItem value={healthData?.alerts ?? 0} label="监测告警" color={APPLE_ORANGE} delay={0.3} />
            </>
          )}
        </div>

        {/* 图表区 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ minWidth: 0 }}>
            <SectionCard title="GEO得分趋势">
              <div ref={trendRef} style={{ height: '300px' }} />
            </SectionCard>
          </div>
          <div style={{ minWidth: 0 }}>
            <SectionCard title="GEO维度雷达">
              <div ref={radarRef} style={{ height: '300px' }} />
            </SectionCard>
          </div>
        </div>

        {/* 快捷入口 + 告警 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          <SectionCard title="快捷入口">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {quickActions.map((action) => (
                <button key={action.path} onClick={() => navigate(action.path)}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 500,
                    color: WHITE, background: action.color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                    gap: '8px', fontFamily: 'inherit', transition: 'all 0.2s ease', boxShadow: `0 2px 8px ${action.color}30`
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = `0 4px 16px ${action.color}40` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 2px 8px ${action.color}30` }}
                >
                  <action.icon size={16} />{action.label}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="最新热点">
            {alerts.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: GRAY_500 }}>
                <Bell size={40} style={{ marginBottom: '12px', opacity: 0.25 }} />
                <span style={{ fontSize: '14px' }}>暂无热点</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {alerts.map((a, idx) => (
                  <button key={a.id}
                    onClick={() => { if (a.hotspotUrl) window.open(a.hotspotUrl, '_blank') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', padding: '12px 0',
                      borderBottom: idx < alerts.length - 1 ? `1px solid ${GRAY_200}` : 'none', background: 'none',
                      border: 'none', cursor: a.hotspotUrl ? 'pointer' : 'default', width: '100%', textAlign: 'left',
                      fontFamily: 'inherit', color: GRAY_900, transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => { if (a.hotspotUrl) e.currentTarget.style.background = GRAY_100 }}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{
                      padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, flexShrink: 0,
                      background: a.level === 'high' ? 'rgba(255,59,48,0.10)' : a.level === 'medium' ? 'rgba(255,149,0,0.10)' : 'rgba(142,142,147,0.10)',
                      color: a.level === 'high' ? APPLE_RED : a.level === 'medium' ? APPLE_ORANGE : GRAY_500
                    }}>{alertLabel(a.level)}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</span>
                    <span style={{ color: GRAY_500, fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.time}</span>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
      <GuideTabs />
    </div>
  )
}
