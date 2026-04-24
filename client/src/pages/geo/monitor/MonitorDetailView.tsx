/**
 * 监测详情 - 查看某条监测记录的详情
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { monitorApi } from '../../../services/geoApi'
import type { MonitorRecord } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'

const PLATFORM_MAP: Record<string, string> = {
  deepseek: 'DeepSeek', doubao: '豆包', wenxin: '文心一言',
  chatgpt: 'ChatGPT', kimi: 'Kimi',
}

export default function MonitorDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<MonitorRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    // 获取所有记录并找到匹配的那一条
    monitorApi.getRecords()
      .then((records: MonitorRecord[]) => {
        const found = records.find((r: MonitorRecord) => r.id === id)
        setRecord(found || null)
      })
      .catch(() => setRecord(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-6 text-center text-gray-400">加载中...</div>

  if (!record) return (
    <div className="p-6">
      <PageHeader title="监测详情" onBack={() => navigate('/geo/monitor')} />
      <div className="text-center py-16 text-gray-400">监测记录不存在</div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title={`监测详情 — ${record.keyword}`}
        onBack={() => navigate('/geo/monitor')}
      />

      {/* Meta info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">监测平台</div>
            <div className="text-sm font-medium text-gray-800">
              {PLATFORM_MAP[record.platform] || record.platform}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">关键词</div>
            <div className="text-sm font-medium text-gray-800">{record.keyword}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">被提及</div>
            <div className={`text-lg font-bold ${record.isMentioned ? 'text-green-600' : 'text-red-500'}`}>
              {record.isMentioned ? '是' : '否'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">推荐次数</div>
            <div className="text-sm font-medium text-gray-800">{record.recommendCount}</div>
          </div>
        </div>
        {record.rankPosition && (
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-1">排名位置</div>
            <div className="text-sm font-medium text-gray-800">第 {record.rankPosition} 位</div>
          </div>
        )}
        <div className="text-xs text-gray-400">
          监测时间：{new Date(record.createdAt).toLocaleString('zh-CN')}
        </div>
      </div>

      {/* Summary */}
      {record.summary && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">AI 摘要</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{record.summary}</p>
        </div>
      )}

      {/* Top content */}
      {record.topContent && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">推荐内容</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{record.topContent}</p>
        </div>
      )}

      {/* Trend & Sentiment */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">趋势</div>
            <div className="text-sm font-medium text-gray-800">
              {record.trend === 'rising' ? '📈 上升' : record.trend === 'stable' ? '➡️ 稳定' : record.trend === 'declining' ? '📉 下降' : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">情感倾向</div>
            <div className="text-sm font-medium text-gray-800">
              {record.sentiment === 'positive' ? '😊 积极' : record.sentiment === 'negative' ? '😞 消极' : record.sentiment === 'neutral' ? '😐 中性' : '--'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
