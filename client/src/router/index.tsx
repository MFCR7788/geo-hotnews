import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../layouts/AppLayout'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'

// 热点雷达页面（原有功能，暂时保留在根路径）
import HotspotRadar from '../pages/HotspotRadar'

// GEO 功能占位页面（待实现）
import GeoDashboard from '../pages/geo/dashboard/GeoDashboard'
import GeoCheckView from '../pages/geo/geo-check/GeoCheckView'
import GeoReportsView from '../pages/geo/geo-check/ReportsView'
import ReportDetailView from '../pages/geo/geo-check/ReportDetailView'
import ContentDetailView from '../pages/geo/content/ContentDetailView'
import ContentGenerateView from '../pages/geo/content/ContentGenerateView'
import ContentListView from '../pages/geo/content/ContentListView'
import ContentCalendarView from '../pages/geo/content/ContentCalendarView'
import KnowledgeView from '../pages/geo/knowledge/KnowledgeView'
import MonitorView from '../pages/geo/monitor/MonitorView'
import MonitorDetailView from '../pages/geo/monitor/MonitorDetailView'
import StrategyView from '../pages/geo/strategy/StrategyView'
import StrategyDetailView from '../pages/geo/strategy/StrategyDetailView'
import VideoCenterView from '../pages/geo/video/VideoCenterView'
import VideoCreateView from '../pages/geo/video/VideoCreateView'
import VideoAssetsView from '../pages/geo/video/VideoAssetsView'
import VideoPublishView from '../pages/geo/video/VideoPublishView'
import NotificationsView from '../pages/geo/notifications/NotificationsView'
import SettingsProfileView from '../pages/geo/settings/SettingsProfileView'
import SettingsTenantView from '../pages/geo/settings/SettingsTenantView'
import SettingsKnowledgeView from '../pages/geo/settings/SettingsKnowledgeView'
import SettingsSubscriptionView from '../pages/geo/settings/SettingsSubscriptionView'
import SettingsApiView from '../pages/geo/settings/SettingsApiView'
import GuideView from '../pages/geo/guide/GuideView'

// 原始独立页面（modal/page 组件）
import AdminPage from '../pages/AdminPage'
import PricingPage from '../pages/PricingPage'
import SubscriptionPage from '../pages/SubscriptionPage'
import BillingPage from '../pages/BillingPage'
import SettingsPage from '../pages/SettingsPage'

// 守卫组件
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">加载中...</span>
        </div>
      </div>
    )
  }
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export const router = createBrowserRouter([
  // 公开路由
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },

  // GEO 功能 + 热点雷达（带 Layout）
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/guide" replace /> },
      // 热点雷达（原有核心功能）
      { path: 'hotspot-radar', element: <HotspotRadar /> },
      { path: 'guide', element: <GuideView /> },
      { path: 'geo/dashboard', element: <GeoDashboard /> },
      { path: 'geo/geo-check', element: <GeoCheckView /> },
      { path: 'geo/geo-check/reports', element: <GeoReportsView /> },
      { path: 'geo/geo-check/reports/:id', element: <ReportDetailView /> },
      { path: 'geo/content/generate', element: <ContentGenerateView /> },
      { path: 'geo/content/list', element: <ContentListView /> },
      { path: 'geo/content/calendar', element: <ContentCalendarView /> },
      { path: 'geo/content/:id', element: <ContentDetailView /> },
      { path: 'geo/content/:id/edit', element: <ContentDetailView /> },
      { path: 'geo/knowledge', element: <KnowledgeView /> },
      { path: 'geo/monitor', element: <MonitorView /> },
      { path: 'geo/monitor/:id', element: <MonitorDetailView /> },
      { path: 'geo/strategy', element: <StrategyView /> },
      { path: 'geo/strategy/:id', element: <StrategyDetailView /> },
      { path: 'geo/video', element: <VideoCenterView /> },
      { path: 'geo/video/create', element: <VideoCreateView /> },
      { path: 'geo/video/assets', element: <VideoAssetsView /> },
      { path: 'geo/video/publish', element: <VideoPublishView /> },
      { path: 'geo/notifications', element: <NotificationsView /> },
      { path: 'geo/settings/profile', element: <SettingsProfileView /> },
      { path: 'geo/settings/tenant', element: <SettingsTenantView /> },
      { path: 'geo/settings/knowledge', element: <SettingsKnowledgeView /> },
      { path: 'geo/settings/subscription', element: <SettingsSubscriptionView /> },
      { path: 'geo/settings/api', element: <SettingsApiView /> },
      // 原始独立功能页面
      { path: 'admin', element: <AdminPage onClose={() => window.history.back()} /> },
      { path: 'pricing', element: <PricingPage onBack={() => window.history.back()} /> },
      { path: 'subscription', element: <SubscriptionPage onBack={() => window.history.back()} /> },
      { path: 'billing', element: <BillingPage onBack={() => window.history.back()} /> },
      { path: 'settings', element: <SettingsPage onClose={() => window.history.back()} /> },
    ],
  },

  // 404
  { path: '*', element: <Navigate to="/geo/dashboard" replace /> },
])
