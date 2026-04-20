// 认证服务层
// 管理 Token 存储、用户信息、登录状态

const API_BASE = '/api';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  isBanned?: boolean;
  createdAt: string;
  settings?: UserSettings;
}

export interface UserSettings {
  id: string;
  userId: string;
  logoUrl: string | null;
  themeMode: 'dark' | 'light';
  themeColor: string;
  sourcePrefs: string;
  defaultImportance: string;
  defaultTimeRange: string;
  defaultSortBy: string;
  defaultSortOrder: string;
  defaultSource: string;
  showOnlyReal: boolean;
  notifyEmail: boolean;
  notifyWeb: boolean;
  notifyHighOnly: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Token 存储键
const ACCESS_TOKEN_KEY = 'mfcr_access_token';
const REFRESH_TOKEN_KEY = 'mfcr_refresh_token';
const USER_KEY = 'mfcr_user';

// Token 管理
export const tokenStore = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  
  setTokens: (tokens: AuthTokens) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  saveUser: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser: (): User | null => {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
  }
};

// 带认证头的请求（带自动刷新 Token）
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function requestWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const accessToken = tokenStore.getAccessToken();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    },
    ...options
  });

  // Token 过期，尝试刷新
  if (response.status === 401 && retry) {
    if (isRefreshing) {
      // 排队等待刷新完成
      return new Promise((resolve, reject) => {
        refreshQueue.push(async (newToken) => {
          if (!newToken) {
            reject(new Error('Authentication failed'));
            return;
          }
          try {
            const retryRes = await requestWithAuth<T>(endpoint, options, false);
            resolve(retryRes);
          } catch (e) {
            reject(e);
          }
        });
      });
    }

    isRefreshing = true;
    const refreshToken = tokenStore.getRefreshToken();
    
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
          const tokens: AuthTokens = await refreshRes.json();
          tokenStore.setTokens(tokens);
          
          // 通知所有等待的请求
          refreshQueue.forEach(cb => cb(tokens.accessToken));
          refreshQueue = [];
          isRefreshing = false;
          
          // 重试原始请求
          return requestWithAuth<T>(endpoint, options, false);
        }
      } catch (e) {
        // 刷新失败
      }
    }

    // 刷新失败，清除 Token 并跳转登录
    refreshQueue.forEach(cb => cb(null));
    refreshQueue = [];
    isRefreshing = false;
    tokenStore.clearTokens();
    window.location.href = '/login';
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// 认证 API
export const authApi = {
  register: async (email: string, password: string, name?: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '注册失败');
    
    tokenStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    tokenStore.saveUser(data.user);
    return data;
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登录失败');
    
    tokenStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    tokenStore.saveUser(data.user);
    return data;
  },

  logout: async () => {
    const refreshToken = tokenStore.getRefreshToken();
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    } catch (e) {
      // ignore
    }
    tokenStore.clearTokens();
  },

  getMe: () => requestWithAuth<User>('/auth/me'),

  updateMe: (data: { name?: string }) =>
    requestWithAuth<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    requestWithAuth<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword })
    }),

  forgotPassword: async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '发送失败');
    return data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '重置失败');
    return data;
  },

  getSettings: () => requestWithAuth<UserSettings>('/auth/settings'),

  updateSettings: (settings: Partial<UserSettings>) =>
    requestWithAuth<UserSettings>('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),

  isLoggedIn: () => !!tokenStore.getAccessToken(),
  getCurrentUser: () => tokenStore.getUser()
};

// 管理员 API
export const adminApi = {
  getUsers: (params?: { page?: number; limit?: number; search?: string; isBanned?: boolean }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') sp.append(k, String(v));
      });
    }
    return requestWithAuth<{
      data: User[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/users?${sp}`);
  },

  getUser: (id: string) => requestWithAuth<User>(`/admin/users/${id}`),

  banUser: (id: string) =>
    requestWithAuth<{ message: string }>(`/admin/users/${id}/ban`, { method: 'PATCH' }),

  unbanUser: (id: string) =>
    requestWithAuth<{ message: string }>(`/admin/users/${id}/unban`, { method: 'PATCH' }),

  updateRole: (id: string, role: 'user' | 'admin') =>
    requestWithAuth<{ message: string }>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    }),

  deleteUser: (id: string) =>
    requestWithAuth<{ message: string }>(`/admin/users/${id}`, { method: 'DELETE' }),

  getStats: () =>
    requestWithAuth<{
      users: { total: number; newToday: number; newThisWeek: number; banned: number; activeOnline: number };
      content: { keywords: number; hotspots: number; hotspotToday: number; notifications: number };
      trends: { registrations: Array<{ date: string; count: number }> };
    }>('/admin/stats'),

  // 订阅管理
  getSubscriptions: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') sp.append(k, String(v));
      });
    }
    return requestWithAuth<{
      data: Array<{
        id: string;
        userId: string;
        userEmail: string;
        userName: string | null;
        planId: string;
        planName: string;
        status: string;
        billingCycle: string;
        currentPeriodEnd: string;
        autoRenew: boolean;
        createdAt: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/subscriptions?${sp}`);
  },

  // 订单流水
  getPayments: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') sp.append(k, String(v));
      });
    }
    return requestWithAuth<{
      data: Array<{
        id: string;
        orderNo: string;
        userId: string;
        userEmail: string;
        userName: string | null;
        planName: string;
        billingCycle: string;
        amount: number;
        status: string;
        payChannel: string | null;
        paidAt: string | null;
        createdAt: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/payments?${sp}`);
  }
};

export { requestWithAuth as authRequest };
