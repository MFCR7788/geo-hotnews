import { authRequest } from './auth.js';

export interface Keyword {
  id: string;
  text: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  _count?: { hotspots: number };
}

// 新的用户订阅格式
export interface UserKeyword {
  id: string;
  keywordId: string;
  text: string;
  category: string | null;
  isActive: boolean;
  addedAt: string;
  hotspotCount?: number;
  userCount?: number;
}

// 全局词库关键词
export interface LibraryKeyword {
  id: string;
  text: string;
  category: string | null;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Hotspot {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  sourceId: string | null;
  isReal: boolean;
  relevance: number;
  relevanceReason: string | null;
  keywordMentioned: boolean | null;
  importance: 'low' | 'medium' | 'high' | 'urgent';
  summary: string | null;
  viewCount: number | null;
  likeCount: number | null;
  retweetCount: number | null;
  replyCount: number | null;
  commentCount: number | null;
  quoteCount: number | null;
  danmakuCount: number | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
  authorFollowers: number | null;
  authorVerified: boolean | null;
  publishedAt: string | null;
  createdAt: string;
  keyword?: { id: string; text: string; category: string | null } | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  hotspotId: string | null;
  hotspotUrl: string | null;
  createdAt: string;
}

export interface Stats {
  total: number;
  today: number;
  urgent: number;
  bySource: Record<string, number>;
}

// 使用 auth.ts 中带自动刷新 Token 的请求函数
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return authRequest<T>(endpoint, options);
}

// ============ 全局词库 API ============

export const keywordLibraryApi = {
  // 获取全局词库
  getAll: (params?: { search?: string; category?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    return request<LibraryKeyword[]>(`/keywords/library?${searchParams}`);
  },
  
  // 添加新词到词库
  create: (data: { text: string; category?: string }) =>
    request<LibraryKeyword>('/keywords/library', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

// ============ 用户关键词订阅 API ============

export const keywordsApi = {
  // 获取用户已订阅的关键词
  getSubscribed: () => request<UserKeyword[]>('/keywords'),
  
  // 搜索系统词库中的相似词（输入时实时调用）
  searchSimilar: (q: string) => 
    request<LibraryKeyword[]>(`/keywords/similar?q=${encodeURIComponent(q)}`),
  
  // 订阅关键词（从词库选择或新增）
  subscribe: (data: { keywordId?: string; text?: string; category?: string }) =>
    request<UserKeyword>('/keywords/subscribe', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  // 取消订阅
  unsubscribe: (keywordId: string) =>
    request<void>(`/keywords/unsubscribe/${keywordId}`, { method: 'DELETE' }),
  
  // 切换开关状态
  toggle: (id: string) =>
    request<{ id: string; keywordId: string; text: string; isActive: boolean }>(`/keywords/toggle/${id}`, { method: 'PATCH' })
};

// ============ Hotspots API ============

export const hotspotsApi = {
  getAll: (params?: { 
    page?: number; 
    limit?: number; 
    source?: string; 
    importance?: string; 
    keywordId?: string;
    isReal?: string;
    timeRange?: string;
    timeFrom?: string;
    timeTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') searchParams.append(key, String(value));
      });
    }
    return request<{ data: Hotspot[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/hotspots?${searchParams}`
    );
  },
  
  getStats: () => request<Stats>('/hotspots/stats'),
  
  getById: (id: string) => request<Hotspot>(`/hotspots/${id}`),
  
  search: (query: string, sources?: string[]) => 
    request<{ results: Hotspot[] }>('/hotspots/search', {
      method: 'POST',
      body: JSON.stringify({ query, sources })
    }),
  
  delete: (id: string) => 
    request<void>(`/hotspots/${id}`, { method: 'DELETE' })
};

// ============ Notifications API ============

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request<{ data: Notification[]; unreadCount: number; pagination: any }>(
      `/notifications?${searchParams}`
    );
  },
  
  markAsRead: (id: string) => 
    request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
  
  markAllAsRead: () => 
    request<void>('/notifications/read-all', { method: 'PATCH' }),
  
  delete: (id: string) => 
    request<void>(`/notifications/${id}`, { method: 'DELETE' }),
  
  clear: () => 
    request<void>('/notifications', { method: 'DELETE' })
};

// ============ Settings API ============

export const settingsApi = {
  getAll: () => request<Record<string, string>>('/settings'),
  
  update: (settings: Record<string, string>) => 
    request<void>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
};

// ============ Manual trigger ============

export const triggerHotspotCheck = () => 
  request<{ message: string }>('/check-hotspots', { method: 'POST' });
