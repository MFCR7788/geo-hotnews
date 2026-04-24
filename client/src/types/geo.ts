// GEO Star Engine 类型定义

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T = unknown> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ==================== Dashboard ====================

export interface HealthData {
  overallScore: number
  geoScore: number
  contentGenerated: number
  contentCount: number
  publishedCount: number
  alerts: number
  monitorQueries: number
  mentionRate: number
  lastCheckAt: string | null
  lastMonitorAt: string | null
  trend?: TrendPoint[]
  radar?: RadarData
}

export interface TrendPoint {
  date: string
  score: number | null
}

export interface RadarData {
  aiVisibility: number
  contentCoverage: number
  structuredData: number
  competitorCompare: number
  overallScore: number
}

export interface AlertItem {
  id: number
  level: 'high' | 'medium' | 'low'
  message: string
  time: string
}

// ==================== GEO体检 ====================

export interface GeoReportItem {
  id: number
  brandName: string
  industry: string | null
  overallScore: number
  status: 'completed' | 'running' | 'pending' | 'failed'
  createdAt: string
}

export interface GeoReportDetail extends GeoReportItem {
  keywords: string[]
  platformScores: Record<string, number>
  keywordCoverage: KeywordCoverageItem[]
  recommendations: RecommendationItem[]
}

export interface KeywordCoverageItem {
  keyword: string
  platform: string
  covered: boolean
  rank: number
}

export interface RecommendationItem {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  impact: string
}

// ==================== 内容引擎 ====================

export interface ContentTemplate {
  id: string
  name: string
  platform: string
  industry: string
  category: string
  outline: string
  placeholders: string[]
  example: string
}

export interface ContentItem {
  id: number
  tenantId: number
  title: string
  body: string
  content?: string
  platform: string | null
  industry: string | null
  templateId: string | null
  status: 'draft' | 'published' | 'archived'
  complianceScore: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ==================== AI监测 ====================

export interface MonitorStats {
  averageScore: number
  anomalyCount: number
  totalChecks: number
}

export interface MonitorRecordItem {
  id: number
  brandName: string
  platform: string
  averageScore: number | null
  totalQuestions: number
  mentionedCount: number
  createdAt: string
}

export interface MonitorResultItem {
  question: string
  platform: string
  mentioned: boolean
  snippet: string
  position: number
  sentiment: 'positive' | 'neutral' | 'negative'
}

// ==================== 策略库 ====================

export interface StrategyItem {
  id: number
  title: string
  description: string | null
  category: string
  status: string
  isActive: boolean
  priority: 'high' | 'medium' | 'low'
  scheduledAt: string | null
  completedAt: string | null
  actionItems: StrategyActionItem[]
  createdAt: string
  updatedAt: string
}

export interface StrategyActionItem {
  id: string
  actionType: string
  title: string
  description: string
  completed: boolean
}

// ==================== 短视频 ====================

export type VideoProjectStatus = 'draft' | 'generating' | 'ready' | 'publishing' | 'published' | 'failed'
export type VideoType = 'script' | 'text-to-video' | 'image-video'
export type ClipType = 'text' | 'image' | 'video' | 'transition'
export type TransitionType = 'none' | 'fade' | 'slide' | 'zoom'
export type PublishPlatform = 'douyin' | 'xiaohongshu' | 'bilibili' | 'weixin' | 'weibo'
export type PublishStatus = 'pending' | 'published' | 'failed'

export interface VideoProject {
  id: number
  title: string
  type: VideoType
  status: VideoProjectStatus
  scriptText: string
  ttsVoice: string
  ttsSpeed: number
  bgmId: string
  bgmVolume: number
  templateId: string
  outputUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface VideoClip {
  id: number
  orderIndex: number
  type: ClipType
  assetId: number | null
  aiImageUrl: string | null
  duration: number
  transition: TransitionType
  transitionDuration: number
  subtitle: string | null
  subtitleStart: number
  subtitleEnd: number | null
  kenBurnsEffect: string | null
}

export interface VideoPublishRecord {
  id: number
  platform: PublishPlatform
  title: string
  description: string
  tags: string
  scheduledAt: string | null
  publishedAt: string | null
  status: PublishStatus
  publishUrl: string | null
}

// ==================== 品牌素材库 ====================

export type AssetType = 'image' | 'video' | 'audio' | 'document'
export type AssetFileType = 'jpg' | 'png' | 'gif' | 'mp4' | 'mp3' | 'pdf'

export interface BrandAsset {
  id: number
  name: string
  type: AssetType
  fileType: AssetFileType
  url: string
  thumbnailUrl: string | null
  size: number
  tags: string
  createdAt: string
}

// ==================== 通知 ====================

export interface NotificationItem {
  id: number
  type: string
  title: string
  message: string
  isRead: boolean
  hotspotUrl: string | null
  createdAt: string
}
