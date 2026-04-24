import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, Bell, ChevronDown, ChevronRight,
  LayoutDashboard, Search, Edit, Video, List, View, BookOpen,
  Settings, LogOut, User, Building2, Key, CreditCard,
  HelpCircle, PanelLeftClose, PanelLeftOpen,
  Flame
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  children?: { label: string; path: string; icon?: React.ElementType }[]
}

const navItems: NavItem[] = [
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

// 热点监控旧页面
import { Shield } from 'lucide-react'
const legacyNavItems: NavItem[] = [
  { label: '热点雷达', icon: Flame, path: '/dashboard' },
  { label: '监控词管理', icon: Shield, path: '/keywords' },
  { label: '搜索', icon: Search, path: '/search' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [unreadCount] = useState(0)

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

  function toggleMenu(label: string) {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }))
  }

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300',
          collapsed ? 'w-16' : 'w-56',
          'max-lg:translate-x-full',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-gray-800">
          <Link to="/geo/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Flame className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-white text-sm whitespace-nowrap"
              >
                GEO Star Engine
              </motion.span>
            )}
          </Link>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-2">
          {/* 热点雷达（原有功能） */}
          {!collapsed && (
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
              热点监控
            </div>
          )}
          <div className="px-2 space-y-0.5">
            {legacyNavItems.map(item => (
              <Link
                key={item.path}
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
            ))}
          </div>

          {!collapsed && (
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-1">
              GEO功能
            </div>
          )}
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
          className="hidden lg:flex items-center justify-center h-10 border-t border-gray-800 text-gray-500 hover:text-white transition-colors"
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
      <div className={cn('flex-1 flex flex-col transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-56')}>
        {/* 顶栏 */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          {/* 左侧 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* 面包屑 */}
            <nav className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
              <Link to="/geo/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">首页</Link>
              {navItems.map(item => {
                if (item.children?.some(c => isActive(c.path))) {
                  return (
                    <>
                      <span key="sep1" className="text-gray-400">/</span>
                      <span key="parent" className="text-gray-700 dark:text-gray-300">{item.label}</span>
                    </>
                  )
                }
                if (item.path && isActive(item.path) && item.path !== '/geo/dashboard') {
                  return (
                    <>
                      <span key="sep2" className="text-gray-400">/</span>
                      <span key="current" className="text-gray-700 dark:text-gray-300">{item.label}</span>
                    </>
                  )
                }
                return null
              })}
            </nav>
          </div>

          {/* 右侧 */}
          <div className="flex items-center gap-2">
            {/* 通知 */}
            <button
              onClick={() => navigate('/geo/notifications')}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* 用户菜单 */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user?.phone?.slice(-2) || '用户'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                    >
                      <Link
                        to="/geo/settings/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <User className="w-4 h-4" />
                        个人设置
                      </Link>
                      <Link
                        to="/geo/settings/tenant"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Building2 className="w-4 h-4" />
                        企业设置
                      </Link>
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
