import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  LayoutDashboard, Search, Edit, Video, List, View, BookOpen,
  Settings, HelpCircle, PanelLeftClose, PanelLeftOpen,
  Flame, Sparkles, Bell, User, ChevronRight, Building2, Key, CreditCard, LogOut,
  Crown
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { notificationsApi, type Notification } from '../services/api'

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  children?: { label: string; path: string; icon?: React.ElementType }[]
}

const navItems: NavItem[] = [
  { label: '热点监控', icon: Flame, path: '/hotspot-radar' },
  { label: '使用指南', icon: HelpCircle, path: '/guide' },
  { label: '数据看板', icon: LayoutDashboard, path: '/geo/dashboard' },
  {
    label: 'GEO体检', icon: Search, path: '/geo/geo-check',
    children: [
      { label: '发起体检', path: '/geo/geo-check' },
      { label: '报告管理', path: '/geo/geo-check/reports' },
    ]
  },
  {
    label: '内容引擎', icon: Edit,
    children: [
      { label: '生成内容', path: '/geo/content/generate' },
      { label: '内容管理', path: '/geo/content/list' },
      { label: '内容日历', path: '/geo/content/calendar' },
    ]
  },
  {
    label: '短视频', icon: Video,
    children: [
      { label: '视频管理', path: '/geo/video' },
      { label: '创建视频', path: '/geo/video/create' },
      { label: '素材库', path: '/geo/video/assets' },
      { label: '发布管理', path: '/geo/video/publish' },
    ]
  },
  { label: '品牌知识库', icon: BookOpen, path: '/geo/knowledge' },
  { label: 'AI监测', icon: View, path: '/geo/monitor' },
  { label: '策略库', icon: List, path: '/geo/strategy' },
  { label: '通知中心', icon: Bell, path: '/geo/notifications' },
  {
    label: '设置', icon: Settings,
    children: [
      { label: '个人设置', path: '/geo/settings/profile', icon: User },
      { label: '企业设置', path: '/geo/settings/tenant', icon: Building2 },
      { label: '品牌知识库', path: '/geo/settings/knowledge', icon: BookOpen },
      { label: '订阅管理', path: '/geo/settings/subscription', icon: CreditCard },
      { label: 'API设置', path: '/geo/settings/api', icon: Key },
    ]
  },
]

// 无 legacyNavItems — 热点监控已合并到 navItems

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isLoggedIn, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifList, setNotifList] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // 加载通知
  useEffect(() => {
    if (!isLoggedIn) return
    notificationsApi.getAll({ limit: 20 }).then(res => {
      setNotifList(res.data)
      setUnreadCount(res.unreadCount)
    }).catch(() => {})
  }, [isLoggedIn])

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    setUnreadCount(0)
    setNotifList(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  // 初始化：默认展开当前路径的父菜单
  useEffect(() => {
    const newOpen: Record<string, boolean> = {}
    navItems.forEach(item => {
      if (item.children?.some(c => location.pathname.startsWith(c.path))) {
        newOpen[item.label] = true
      }
    })
    setOpenMenus(newOpen)
  }, [location.pathname])

  // 强制深色模式（匹配 HotspotRadar 风格）
  useEffect(() => {
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark', 'bg-[#050510]')
  }, [])

  function toggleMenu(label: string) {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }))
  }

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="flex h-screen bg-[#050510]">
      {/* ===== 最外层固定顶栏 - 深藏青 ===== */}
      <header className="fixed top-0 left-0 right-0 z-[60] h-14 flex items-center justify-between px-4 lg:px-6 bg-[#0b1a2e]/95 backdrop-blur-xl border-b border-white/5">
        {/* 左侧：品牌 Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-300" />
          </button>
          <Link to="/guide" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="GEO星擎" className="w-8 h-8 rounded-lg object-contain" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-base font-bold text-white">GEO星擎</span>
              <span className="text-[11px] text-gray-400">热点监控系统</span>
            </div>
          </Link>
        </div>

        {/* 右侧：功能按钮组 */}
        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <>
              {/* 管理后台 */}
              <Link
                to="/admin"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 text-xs font-medium transition-colors"
              >
                <Crown className="w-3.5 h-3.5" />
                管理后台
              </Link>
              {/* 升级方案 */}
              <Link
                to="/pricing"
                className="hidden sm:flex items-center px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white text-xs font-medium shadow-md shadow-blue-500/20 transition-all"
              >
                升级方案
              </Link>
              {/* 会员 */}
              <Link
                to="/subscription"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-yellow-400 hover:bg-white/5 text-xs transition-colors"
              >
                <Crown className="w-4 h-4" />
                会员
              </Link>
              {/* 通知 - 原始下拉面板 */}
              <div
                className="relative"
                onMouseEnter={() => setShowNotifs(true)}
                onMouseLeave={() => setShowNotifs(false)}
              >
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifs && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 w-80 bg-[#0a0a1a]/95 backdrop-blur-2xl rounded-xl border border-white/10 shadow-2xl overflow-hidden z-[70]"
                    >
                      <div className="flex items-center justify-between p-3 border-b border-white/5">
                        <h3 className="text-sm font-medium text-white">通知</h3>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-xs text-blue-400 hover:text-blue-300">全部已读</button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifList.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-6">暂无通知</p>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {notifList.slice(0, 6).map(n => (
                              <div
                                key={n.id}
                                onClick={() => n.hotspotUrl && window.open(n.hotspotUrl, '_blank', 'noopener,noreferrer')}
                                className={cn('p-3 transition-colors cursor-pointer', n.isRead ? 'opacity-50' : 'hover:bg-white/5')}
                              >
                                <p className="text-sm font-medium text-white">{n.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
          {/* 星宇（设置）→ 原始 SettingsPage */}
          <Link
            to="/settings"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            title="设置"
          >
            <Settings className="w-4.5 h-4.5" />
          </Link>
          {/* 退出 */}
          {isLoggedIn ? (
            <button
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 text-sm transition-colors"
            >
              登录
            </Link>
          )}
        </div>
      </header>

      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed top-14 left-0 bottom-0 z-50 flex flex-col bg-[#0a0a1a]/80 backdrop-blur-xl border-r border-white/5 transition-all duration-300',
          collapsed ? 'w-16' : 'w-56',
          'max-lg:translate-x-full',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* 导航菜单 - 无Logo区，菜单直接从顶部开始 */}
        <nav className="flex-1 overflow-y-auto pt-3 pb-2">
          <div className="px-2 space-y-0.5">
            {navItems.map(item => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                        Object.values(openMenus).some(v => v) && !collapsed
                          ? 'text-gray-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronRight
                            className={cn(
                              'w-3 h-3 transition-transform',
                              openMenus[item.label] && 'rotate-90'
                            )}
                          />
                        </>
                      )}
                    </button>
                    <AnimatePresence>
                      {openMenus[item.label] && !collapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="ml-5 space-y-0.5 overflow-hidden"
                        >
                          {item.children.map(child => (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                                isActive(child.path)
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                              )}
                            >
                              {child.icon && <child.icon className="w-3.5 h-3.5" />}
                              <span>{child.label}</span>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <Link
                    to={item.path!}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                      isActive(item.path!)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* 折叠按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t border-white/5 text-gray-500 hover:text-white transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </aside>

      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 主内容区 */}
      <div className={cn('flex-1 flex flex-col mt-14 transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-56')}>
        {/* 页面内容 - 无副顶栏，内容直接从顶部开始 */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
