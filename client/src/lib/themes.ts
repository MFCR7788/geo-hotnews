
// ==========================================
// GEO星擎 主题配置系统
// 支持多种视觉风格切换
// ==========================================

export type ThemeId =
  | 'dark-cosmic'
  | 'light-ocean'
  | 'sunset-cafe'
  | 'forest-nature'
  | 'night-neon'
  | 'elegant-pro'
  | 'cyberpunk'
  | 'minimalist'

export interface Theme {
  id: ThemeId
  name: string
  description: string
  preview: string
  cssClass: string
  isDark: boolean
  accentColor: string
}

// 所有主题配置
export const THEMES: Theme[] = [
  {
    id: 'dark-cosmic',
    name: '宇宙深空',
    description: '深邃的星空黑，专业感十足',
    preview: '🌌',
    cssClass: 'theme-dark-cosmic',
    isDark: true,
    accentColor: '#3b82f6'
  },
  {
    id: 'light-ocean',
    name: '清新海洋',
    description: '明亮的蓝色调，清爽优雅',
    preview: '🌊',
    cssClass: 'theme-light-ocean',
    isDark: false,
    accentColor: '#0ea5e9'
  },
  {
    id: 'sunset-cafe',
    name: '日落咖啡',
    description: '温暖的橙棕色调，舒适温馨',
    preview: '🌅',
    cssClass: 'theme-sunset-cafe',
    isDark: false,
    accentColor: '#f59e0b'
  },
  {
    id: 'forest-nature',
    name: '森林自然',
    description: '清新的绿色调，回归自然',
    preview: '🌲',
    cssClass: 'theme-forest-nature',
    isDark: false,
    accentColor: '#10b981'
  },
  {
    id: 'night-neon',
    name: '霓虹之夜',
    description: '赛博朋克风格，未来科技感',
    preview: '🪩',
    cssClass: 'theme-night-neon',
    isDark: true,
    accentColor: '#8b5cf6'
  },
  {
    id: 'elegant-pro',
    name: '优雅专业',
    description: '经典商务风格，稳重大气',
    preview: '💼',
    cssClass: 'theme-elegant-pro',
    isDark: false,
    accentColor: '#1e40af'
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    description: '高对比度霓虹，科幻感爆棚',
    preview: '🚀',
    cssClass: 'theme-cyberpunk',
    isDark: true,
    accentColor: '#ec4899'
  },
  {
    id: 'minimalist',
    name: '极简主义',
    description: '简洁黑白灰，专注内容',
    preview: '◻️',
    cssClass: 'theme-minimalist',
    isDark: true,
    accentColor: '#525252'
  }
]

// 默认主题
export const DEFAULT_THEME: ThemeId = 'elegant-pro'

// 本地存储key
export const THEME_STORAGE_KEY = 'geo-theme'

// 获取主题配置
export function getTheme(id: ThemeId): Theme {
  return THEMES.find(t => t.id === id) || THEMES[0]
}

// 保存主题到本地存储
export function saveThemeToStorage(themeId: ThemeId) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, themeId)
  }
}

// 从本地存储获取主题
export function getThemeFromStorage(): ThemeId {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId
    if (saved && THEMES.find(t => t.id === saved)) {
      return saved
    }
  }
  return DEFAULT_THEME
}

// 应用主题到DOM
export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return

  // 移除所有主题类
  const root = document.documentElement
  THEMES.forEach(t => root.classList.remove(t.cssClass))

  // 添加当前主题类
  root.classList.add(theme.cssClass)

  // 设置meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  const bgColor = theme.isDark ? getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim() || '#050510' : '#ffffff'
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', bgColor)
  } else {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = bgColor
    document.head.appendChild(meta)
  }

  // 设置data-theme属性（用于其他库）
  root.setAttribute('data-theme', theme.id)
  root.setAttribute('data-theme-mode', theme.isDark ? 'dark' : 'light')
}
