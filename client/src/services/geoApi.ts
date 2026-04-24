/**
 * GEO Star Engine - API 服务层
 * 完全匹配后端 /api/geo/* 路由
 */
import { authRequest } from './auth.js'

// ==================== 类型定义 ====================

export interface ApiResponse<T = unknown> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

// 后端分页响应格式
export interface BackendPaginated<T> {
  contents?: T[]        // content list
  videos?: T[]          // video list
  reports?: T[]         // geo-check reports list
  total: number
  page: number
  limit: number
}

// 前端统一分页格式
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
  id: string
  level: 'high' | 'medium' | 'low'
  message: string
  time: string
}

// ==================== GEO体检 ====================

export interface GeoReportItem {
  id: string
  userId: string
  brand: string
  industry: string
  platforms: string   // JSON string
  keywords: string    // JSON string
  competitors?: string // JSON string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  overallScore?: number
  dimensions?: string  // JSON string
  summary?: string
  suggestions?: string // JSON string
  keywordDetails?: string // JSON string
  createdAt: string
  completedAt?: string
}

export interface GeoReportDetail extends GeoReportItem {
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
  description?: string
  category: string
  platform: string
  contentType: string
  prompt: string
  variables?: string
  isActive: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface ContentItem {
  id: string
  userId: string
  templateId?: string
  title: string
  body?: string
  formattedBody?: string
  platform: string
  industry?: string
  brandName?: string
  keywords?: string   // JSON string
  status: 'draft' | 'published' | 'archived'
  images?: string     // JSON string
  metadata?: string   // JSON string
  complianceScore?: number
  publishedAt?: string
  createdAt: string
  updatedAt: string
  template?: ContentTemplate
}

// ==================== 品牌知识库 ====================

export interface KnowledgeEntry {
  id: string
  userId: string
  brand: string
  category: string
  subCategory?: string
  name: string
  description?: string
  specs?: string   // JSON object
  tags?: string    // JSON array string
  source?: string
  createdAt: string
  updatedAt: string
}

export interface KnowledgeCategory {
  category: string
  count: number
}

// ==================== AI监测 ====================

export interface MonitorTask {
  id: string
  userId: string
  name: string
  keywords: string      // JSON array string
  platforms: string     // JSON array string
  competitors?: string  // JSON array string
  interval: number
  isActive: boolean
  lastRunAt?: string
  totalRecords: number
  aiSummary?: string
  createdAt: string
  updatedAt: string
  _count?: { records: number }
  records?: MonitorRecord[]
}

export interface MonitorRecord {
  id: string
  taskId: string
  platform: string
  keyword: string
  mentionCount: number
  recommendCount: number
  rankPosition?: number
  sentiment?: 'positive' | 'neutral' | 'negative'
  isMentioned: boolean
  summary?: string
  topContent?: string
  trend?: 'rising' | 'stable' | 'declining'
  createdAt: string
}

export interface MonitorStats {
  averageScore: number
  anomalyCount: number
  totalChecks: number
}

export interface DailyStat {
  date: string
  totalMentions: number
  totalRecommends: number
  count: number
}

// ==================== 策略库 ====================

export interface Strategy {
  id: string
  userId: string
  name: string
  category: string
  platform: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  description?: string
  startDate?: string
  endDate?: string
  budget?: number
  engagement?: number
  roi?: number
  views: number
  clicks: number
  conversions: number
  keywords?: string      // JSON array
  contentPillars?: string // JSON array
  platforms?: string     // JSON array
  createdAt: string
  updatedAt: string
  _count?: { phases: number; kols: number }
  phases?: StrategyPhase[]
  kols?: StrategyKol[]
}

export interface StrategyPhase {
  id: string
  strategyId: string
  name: string
  content?: string
  platforms?: string // JSON array
  sortOrder: number
  createdAt: string
}

export interface StrategyKol {
  id: string
  strategyId: string
  name: string
  platform: string
  followers: number
  cost: number
  estimatedReach: number
  actualReach?: number
  engagement?: number
  status: 'pending' | 'cooperating' | 'completed'
  createdAt: string
}

// ==================== 短视频 ====================

export interface VideoAsset {
  id: string
  userId: string
  title: string
  description?: string
  fileUrl?: string
  coverUrl?: string
  duration?: number
  platform: string
  status: 'uploading' | 'ready' | 'published' | 'failed'
  fileSize?: number
  width?: number
  height?: number
  tags?: string // JSON array
  metadata?: string // JSON object
  createdAt: string
  updatedAt: string
}

export interface VideoStats {
  total: number
  byPlatform: { platform: string; count: number }[]
  byStatus: { status: string; count: number }[]
}

// ==================== 通知 ====================

export interface NotificationItem {
  id: string
  type: string
  title: string
  content: string
  isRead: boolean
  hotspotId?: string
  createdAt: string
}

// ==================== API 实现 ====================

/**
 * 扩展请求函数：支持 params（query string）和 data（自动 JSON 序列化）
 * 封装 authRequest，使其可用 { params, data } 风格调用
 */
async function geoRequest<T>(
  endpoint: string,
  options: {
    method?: string
    params?: Record<string, unknown>
    data?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  const { params, data, method, headers: extraHeaders } = options

  // 处理 query params
  let url = endpoint
  if (params) {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.append(k, String(v))
    })
    const qs = sp.toString()
    if (qs) url += `?${qs}`
  }

  // 构建 RequestInit
  const init: RequestInit = {}
  if (method) init.method = method
  if (data !== undefined) {
    init.body = JSON.stringify(data)
  }
  init.headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  return authRequest<T>(url, init)
}

// 辅助函数：将后端分页格式转为前端格式（保留备用）
// @ts-ignore unused helper, kept for future use
function _adaptPaginated<T, F = T>(res: BackendPaginated<T>, field: keyof BackendPaginated<T> = 'contents'): PaginatedResponse<F> {
  const items = (res[field] as unknown as F[]) || []
  return {
    items,
    total: res.total,
    page: res.page,
    pageSize: res.limit,
  }
}

// ==================== 内容引擎 ====================

export const contentApi = {
  getTemplates: (params?: { category?: string; platform?: string; contentType?: string }) =>
    geoRequest<ContentTemplate[]>(`/geo/content/templates`, { params }),

  getList: (params?: { page?: number; limit?: number; status?: string; platform?: string; brand?: string; search?: string }) =>
    geoRequest<BackendPaginated<ContentItem>>(`/geo/content`, { params }),

  getCalendarMonth: (year: number, month: number) =>
    geoRequest<Pick<ContentItem, 'id' | 'title' | 'platform' | 'publishedAt' | 'status'>[]>(
      `/geo/content/calendar/month`, { params: { year, month } }
    ),

  getById: (id: string) =>
    geoRequest<ContentItem>(`/geo/content/${id}`),

  create: (data: {
    templateId?: string
    title?: string
    body?: string
    formattedBody?: string
    platform: string
    industry?: string
    brandName?: string
    keywords?: string[]
    images?: string[]
    metadata?: Record<string, unknown>
    // AI生成参数
    useAI?: boolean
    templatePrompt?: string
    sellingPoints?: string[]
    competitors?: string[]
    tone?: string
    wordCount?: number
    customPrompt?: string
  }) => geoRequest<ContentItem & { complianceScore?: number }>(`/geo/content`, { method: 'POST', data }),

  update: (id: string, data: {
    title?: string
    body?: string
    formattedBody?: string
    platform?: string
    status?: string
    images?: string[]
    metadata?: Record<string, unknown>
  }) => geoRequest<ContentItem>(`/geo/content/${id}`, { method: 'PUT', data }),

  publish: (id: string) =>
    geoRequest<ContentItem>(`/geo/content/${id}/publish`, { method: 'POST' }),

  archive: (id: string) =>
    geoRequest<ContentItem>(`/geo/content/${id}/archive`, { method: 'POST' }),

  delete: (id: string) =>
    geoRequest<void>(`/geo/content/${id}`, { method: 'DELETE' }),
}

// ==================== 品牌知识库 ====================

export const knowledgeApi = {
  getList: (params?: { category?: string; brand?: string; search?: string }) =>
    geoRequest<KnowledgeEntry[]>(`/geo/knowledge`, { params }),

  getCategories: () =>
    geoRequest<KnowledgeCategory[]>(`/geo/knowledge/categories`),

  getById: (id: string) =>
    geoRequest<KnowledgeEntry>(`/geo/knowledge/${id}`),

  create: (data: {
    brand: string
    category: string
    subCategory?: string
    name: string
    description?: string
    specs?: Record<string, unknown>
    tags?: string[]
    source?: string
  }) => geoRequest<KnowledgeEntry>(`/geo/knowledge`, { method: 'POST', data }),

  update: (id: string, data: Partial<{
    brand: string
    category: string
    subCategory: string
    name: string
    description: string
    specs: Record<string, unknown>
    tags: string[]
    source: string
  }>) => geoRequest<KnowledgeEntry>(`/geo/knowledge/${id}`, { method: 'PUT', data }),

  delete: (id: string) =>
    geoRequest<void>(`/geo/knowledge/${id}`, { method: 'DELETE' }),

  batchImport: (entries: Array<{
    brand: string
    category: string
    subCategory?: string
    name: string
    description?: string
    specs?: Record<string, unknown>
    tags?: string[]
    source?: string
  }>) => geoRequest<{ created: number }>(`/geo/knowledge/batch`, {
    method: 'POST',
    data: { entries },
  }),
}

// ==================== AI监测 ====================

export const monitorApi = {
  getTasks: (params?: { isActive?: boolean }) =>
    geoRequest<MonitorTask[]>(`/geo/monitor/tasks`, { params }),

  getTaskById: (id: string) =>
    geoRequest<MonitorTask>(`/geo/monitor/tasks/${id}`),

  createTask: (data: {
    name: string
    keywords: string[]
    platforms: string[]
    competitors?: string[]
    interval?: number
  }) => geoRequest<MonitorTask>(`/geo/monitor/tasks`, { method: 'POST', data }),

  updateTask: (id: string, data: Partial<{
    name: string
    keywords: string[]
    platforms: string[]
    competitors: string[] | null
    interval: number
    isActive: boolean
  }>) => geoRequest<MonitorTask>(`/geo/monitor/tasks/${id}`, { method: 'PUT', data }),

  deleteTask: (id: string) =>
    geoRequest<void>(`/geo/monitor/tasks/${id}`, { method: 'DELETE' }),

  triggerTask: (id: string) =>
    geoRequest<{ message: string; taskId: string }>(`/geo/monitor/tasks/${id}/trigger`, { method: 'POST' }),

  getRecords: (params?: { taskId?: string; platform?: string; startDate?: string; endDate?: string }) =>
    geoRequest<MonitorRecord[]>(`/geo/monitor/records`, { params }),

  getStats: (params?: { taskId?: string }) =>
    geoRequest<DailyStat[]>(`/geo/monitor/stats`, { params }),
}

// ==================== 策略库 ====================

export const strategyApi = {
  getList: (params?: { status?: string; category?: string }) =>
    geoRequest<Strategy[]>(`/geo/strategy`, { params }),

  getById: (id: string) =>
    geoRequest<Strategy>(`/geo/strategy/${id}`),

  create: (data: {
    name: string
    category?: string
    platform?: string
    description?: string
    startDate?: string
    endDate?: string
    budget?: number
    keywords?: string[]
    contentPillars?: string[]
    platforms?: string[]
  }) => geoRequest<Strategy>(`/geo/strategy`, { method: 'POST', data }),

  update: (id: string, data: Partial<{
    name: string
    category: string
    platform: string
    status: string
    description: string
    startDate: string
    endDate: string
    budget: number
    keywords: string[]
    contentPillars: string[]
    platforms: string[]
  }>) => geoRequest<Strategy>(`/geo/strategy/${id}`, { method: 'PUT', data }),

  delete: (id: string) =>
    geoRequest<void>(`/geo/strategy/${id}`, { method: 'DELETE' }),

  addPhase: (strategyId: string, data: { name: string; content?: string; platforms?: string[]; sortOrder?: number }) =>
    geoRequest<StrategyPhase>(`/geo/strategy/${strategyId}/phases`, { method: 'POST', data }),

  updatePhase: (phaseId: string, data: Partial<{ name: string; content: string; platforms: string[]; sortOrder: number }>) =>
    geoRequest<StrategyPhase>(`/geo/strategy/phases/${phaseId}`, { method: 'PUT', data }),

  deletePhase: (phaseId: string) =>
    geoRequest<void>(`/geo/strategy/phases/${phaseId}`, { method: 'DELETE' }),

  addKol: (strategyId: string, data: { name: string; platform: string; followers?: number; cost?: number; estimatedReach?: number }) =>
    geoRequest<StrategyKol>(`/geo/strategy/${strategyId}/kols`, { method: 'POST', data }),

  updateKol: (kolId: string, data: Partial<{ status: string; actualReach: number; engagement: number }>) =>
    geoRequest<StrategyKol>(`/geo/strategy/kols/${kolId}`, { method: 'PUT', data }),

  deleteKol: (kolId: string) =>
    geoRequest<void>(`/geo/strategy/kols/${kolId}`, { method: 'DELETE' }),
}

// ==================== 短视频 ====================

export const videoApi = {
  getList: (params?: { page?: number; limit?: number; platform?: string; status?: string }) =>
    geoRequest<BackendPaginated<VideoAsset>>(`/geo/video`, { params }),

  getById: (id: string) =>
    geoRequest<VideoAsset>(`/geo/video/${id}`),

  create: (data: {
    title: string
    description?: string
    fileUrl?: string
    coverUrl?: string
    duration?: number
    platform?: string
    tags?: string[]
    metadata?: Record<string, unknown>
  }) => geoRequest<VideoAsset>(`/geo/video`, { method: 'POST', data }),

  update: (id: string, data: Partial<{
    title: string
    description: string
    coverUrl: string
    platform: string
    status: string
    tags: string[]
    metadata: Record<string, unknown>
  }>) => geoRequest<VideoAsset>(`/geo/video/${id}`, { method: 'PUT', data }),

  delete: (id: string) =>
    geoRequest<void>(`/geo/video/${id}`, { method: 'DELETE' }),

  getStats: () =>
    geoRequest<VideoStats>(`/geo/video/stats/overview`),
}

// ==================== GEO体检 ====================

export const geoCheckApi = {
  getReports: (params?: { page?: number; limit?: number }) =>
    geoRequest<BackendPaginated<GeoReportItem>>(`/geo/geo-check/reports`, { params }),

  getReportById: (id: string) =>
    geoRequest<GeoReportItem>(`/geo/geo-check/reports/${id}`),

  runCheck: (data: {
    brand: string
    industry: string
    platforms: string[]
    keywords: string[]
    competitors?: string[]
  }) => geoRequest<GeoReportItem>(`/geo/geo-check/check`, { method: 'POST', data }),

  deleteReport: (id: string) =>
    geoRequest<void>(`/geo/geo-check/reports/${id}`, { method: 'DELETE' }),
}

// ==================== Dashboard ====================

export const dashboardApi = {
  getHealth: (period?: string) =>
    geoRequest<HealthData>(`/geo/dashboard/health`, { params: { period } }),
}

// ==================== 通知 ====================

export const notificationApi = {
  getList: (params?: { limit?: number }) =>
    geoRequest<NotificationItem[]>(`/geo/notifications`, { params }),

  getUnreadCount: () =>
    geoRequest<{ count: number }>(`/geo/notifications/unread-count`),

  markRead: (id: string) =>
    geoRequest<void>(`/geo/notifications/${id}/read`, { method: 'PUT' }),

  markAllRead: () =>
    geoRequest<void>(`/geo/notifications/read-all`, { method: 'POST' }),
}