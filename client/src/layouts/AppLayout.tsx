import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  LayoutDashboard, Search, Edit, Video, List, View, BookOpen,
  Settings, HelpCircle, PanelLeftClose, PanelLeftOpen,
  Flame, Bell, ChevronDown, Building2, Key, CreditCard, LogOut,
  Crown, User
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
    label: 'GEO体检', icon: Search,
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

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isLoggedIn, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [manualOpenMenus, setManualOpenMenus] = useState<Set<string>>(new Set())

  const shouldOpenMenu = useCallback((label: string) => {
    const item = navItems.find(i => i.label === label)
    const hasActiveChild = item?.children?.some(c =>
      location.pathname === c.path || location.pathname.startsWith(c.path + '/')
    )
    return hasActiveChild || manualOpenMenus.has(label)
  }, [location.pathname, manualOpenMenus])

  useEffect(() => {
    const currentPath = location.pathname
    setManualOpenMenus(prev => {
      const newSet = new Set<string>()
      prev.forEach(label => {
        const item = navItems.find(i => i.label === label)
        if (item?.children?.some(c => currentPath === c.path || currentPath.startsWith(c.path + '/'))) {
          newSet.add(label)
        }
      })
      return newSet
    })
  }, [location.pathname])

  const [showNotifs, setShowNotifs] = useState(false)
  const [notifList, setNotifList] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isLoggedIn) return
    notificationsApi.getAll({ limit: 20 }).then(res => {
      setNotifList(res.data || res || [])
      setUnreadCount(res.unreadCount || 0)
    }).catch(() => {})
  }, [isLoggedIn])

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllAsRead()
    setUnreadCount(0)
    setNotifList(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  function toggleMenu(label: string) {
    setManualOpenMenus(prev => {
      const newSet = new Set(prev)
      newSet.has(label) ? newSet.delete(label) : newSet.add(label)
      return newSet
    })
  }

  const isActive = useCallback((path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }, [location.pathname])

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F5F7' }}>
      {/* ===== 🍎 苹果顶栏 - 毛玻璃效果 ===== */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(245,245,247,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: '#636366',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="lg:flex"
            onMouseEnter={e => { e.currentTarget.style.background = '#E8E8ED'; e.currentTarget.style.color = '#48484A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#636366' }}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              display: 'flex',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#636366',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="lg:hidden"
          >
            <Menu size={18} />
          </button>
          <Link to="/guide" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="GEO" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain' }} />
            <div style={{ display: 'none', flexDirection: 'column' }} className="sm:flex">
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#1C1C1E' }}>GEO星擎</span>
            </div>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoggedIn && (
            <>
              {user?.role === 'admin' && (
                <Link to="/admin" style={{
                  display: 'none',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#AF52DE',
                  background: 'rgba(175,82,222,0.10)',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }} className="md:flex" onMouseEnter={e => e.currentTarget.style.background = 'rgba(175,82,222,0.16)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(175,82,222,0.10)'}>
                  <Crown size={14} style={{ marginRight: '4px' }} />
                  管理后台
                </Link>
              )}
              <Link to="/pricing" style={{
                display: 'none',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                background: 'var(--apple-blue, #007AFF)',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(0,122,255,0.25)',
                transition: 'all 0.2s ease'
              }} className="sm:flex" onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                升级方案
              </Link>
              <Link to="/subscription" style={{
                display: 'none',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#636366',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }} className="sm:flex" onMouseEnter={e => { e.currentTarget.style.background = '#E8E8ED' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                会员
              </Link>
              <div className="relative" onMouseEnter={() => setShowNotifs(true)} onMouseLeave={() => setShowNotifs(false)}>
                <button style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  color: '#636366',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E8E8ED' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-4px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 4px',
                      borderRadius: '9999px',
                      background: '#FF3B30',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      lineHeight: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
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
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        marginTop: '8px',
                        width: '320px',
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.06)',
                        background: '#FFFFFF',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                        zIndex: 70
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid #E8E8ED'
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1C1C1E' }}>通知</span>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#007AFF', cursor: 'pointer', fontWeight: 500 }}>
                            全部已读
                          </button>
                        )}
                      </div>
                      <div style={{ maxHeight: '288px', overflowY: 'auto' }}>
                        {!notifList.length ? (
                          <p style={{ textAlign: 'center', padding: '24px 0', fontSize: '14px', color: '#8E8E93' }}>暂无通知</p>
                        ) : (
                          notifList.slice(0, 6).map(n => (
                            <div
                              key={n.id}
                              onClick={() => n.hotspotUrl && window.open(n.hotspotUrl, '_blank', 'noopener,noreferrer')}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                opacity: n.isRead ? 0.5 : 1,
                                borderBottom: '1px solid #E8E8ED',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1C1C1E', margin: '0 0 2px 0' }}>{n.title}</p>
                              <p style={{ fontSize: '12px', color: '#636366', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
          <Link to="/settings" style={{
            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
            background: 'transparent', color: '#636366', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'all 0.15s ease', textDecoration: 'none'
          }} title="设置"
            onMouseEnter={e => { e.currentTarget.style.background = '#E8E8ED'; e.currentTarget.style.color = '#48484A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#636366' }}>
            <Settings size={18} />
          </Link>
          {isLoggedIn ? (
            <button
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
              title="退出登录"
              style={{
                width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                background: 'transparent', color: '#8E8E93', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E8E8ED'; e.currentTarget.style.color = '#FF3B30' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8E8E93' }}
            >
              <LogOut size={18} />
            </button>
          ) : (
            <Link to="/login" style={{
              padding: '8px 16px', borderRadius: '9999px', fontSize: '14px',
              fontWeight: 500, color: '#007AFF', textDecoration: 'none',
              transition: 'all 0.15s ease'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,122,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              登录
            </Link>
          )}
        </div>
      </header>

      {/* ===== 🍎 苹果侧边栏 - 浅色风格 ===== */}
      <aside
        className={cn(
          'fixed top-[52px] left-0 bottom-0 z-50 flex flex-col overflow-x-hidden',
          collapsed ? 'w-[64px]' : 'w-[260px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          background: '#F5F5F7',
          borderRight: '1px solid #E8E8ED',
          transition: 'width 0.25s var(--ease-out, cubic-bezier(0,0,0.58,1))'
        }}
      >
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          {navItems.map(item => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? '0' : '10px',
                      padding: collapsed ? '10px' : '10px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: shouldOpenMenu(item.label) && !collapsed
                        ? 'rgba(0,122,255,0.08)' : 'transparent',
                      color: shouldOpenMenu(item.label) && !collapsed
                        ? '#007AFF' : '#636366',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={e => {
                      if (!shouldOpenMenu(item.label)) {
                        e.currentTarget.style.background = '#E8E8ED'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!shouldOpenMenu(item.label)) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    <item.icon size={18} style={{ flexShrink: 0 }} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        <ChevronDown
                          size={14}
                          style={{
                            transform: shouldOpenMenu(item.label) ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            flexShrink: 0
                          }}
                        />
                      </>
                    )}
                  </button>
                  <AnimatePresence>
                    {shouldOpenMenu(item.label) && !collapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{
                          marginLeft: '36px',
                          overflow: 'hidden',
                          paddingLeft: '12px',
                          borderLeft: '1px solid #E8E8ED'
                        }}
                      >
                        {item.children.map(child => (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => setMobileOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: isActive(child.path) ? 600 : 400,
                              color: isActive(child.path) ? '#007AFF' : '#636366',
                              background: isActive(child.path) ? 'rgba(0,122,255,0.08)' : 'transparent',
                              textDecoration: 'none',
                              transition: 'all 0.15s ease',
                              marginBottom: '2px'
                            }}
                            onMouseEnter={e => { if (!isActive(child.path)) e.currentTarget.style.background = '#E8E8ED' }}
                            onMouseLeave={e => { if (!isActive(child.path)) e.currentTarget.style.background = 'transparent' }}
                          >
                            {child.icon && <child.icon size={14} />}
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? '0' : '10px',
                    padding: collapsed ? '10px' : '10px 12px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: isActive(item.path!) ? 600 : 500,
                    color: isActive(item.path!) ? '#007AFF' : '#636366',
                    background: isActive(item.path!) ? 'rgba(0,122,255,0.08)' : 'transparent',
                    transition: 'all 0.15s ease',
                    marginBottom: '2px'
                  }}
                  onMouseEnter={e => { if (!isActive(item.path!)) e.currentTarget.style.background = '#E8E8ED' }}
                  onMouseLeave={e => { if (!isActive(item.path!)) e.currentTarget.style.background = 'transparent' }}
                >
                  <item.icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', zIndex: 40, backdropFilter: 'blur(4px)' }}
          className="lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 主内容区 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginTop: '52px',
        transition: 'all 0.25s var(--ease-out, cubic-bezier(0,0,0.58,1))'
      }} className={collapsed ? 'lg:ml-[64px]' : 'lg:ml-[260px]'}>
        <main style={{ flex: 1, overflowY: 'auto', background: '#F5F5F7' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
