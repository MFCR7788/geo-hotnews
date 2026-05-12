import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../layouts/AppLayout'

const LoginPage = lazy(() => import('../pages/LoginPage'))
const RegisterPage = lazy(() => import('../pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const HotspotRadar = lazy(() => import('../pages/HotspotRadar'))
const GeoDashboard = lazy(() => import('../pages/geo/dashboard/GeoDashboard'))
const GeoCheckView = lazy(() => import('../pages/geo/geo-check/GeoCheckView'))
const GeoReportsView = lazy(() => import('../pages/geo/geo-check/ReportsView'))
const ReportDetailView = lazy(() => import('../pages/geo/geo-check/ReportDetailView'))
const ContentDetailView = lazy(() => import('../pages/geo/content/ContentDetailView'))
const ContentGenerateView = lazy(() => import('../pages/geo/content/ContentGenerateView'))
const ContentListView = lazy(() => import('../pages/geo/content/ContentListView'))
const ContentCalendarView = lazy(() => import('../pages/geo/content/ContentCalendarView'))
const KnowledgeView = lazy(() => import('../pages/geo/knowledge/KnowledgeView'))
const MonitorView = lazy(() => import('../pages/geo/monitor/MonitorView'))
const MonitorDetailView = lazy(() => import('../pages/geo/monitor/MonitorDetailView'))
const StrategyView = lazy(() => import('../pages/geo/strategy/StrategyView'))
const StrategyDetailView = lazy(() => import('../pages/geo/strategy/StrategyDetailView'))
const VideoCenterView = lazy(() => import('../pages/geo/video/VideoCenterView'))
const VideoCreateView = lazy(() => import('../pages/geo/video/VideoCreateView'))
const VideoAssetsView = lazy(() => import('../pages/geo/video/VideoAssetsView'))
const VideoPublishView = lazy(() => import('../pages/geo/video/VideoPublishView'))
const NotificationsView = lazy(() => import('../pages/geo/notifications/NotificationsView'))
const SettingsProfileView = lazy(() => import('../pages/geo/settings/SettingsProfileView'))
const SettingsTenantView = lazy(() => import('../pages/geo/settings/SettingsTenantView'))
const SettingsKnowledgeView = lazy(() => import('../pages/geo/settings/SettingsKnowledgeView'))
const SettingsSubscriptionView = lazy(() => import('../pages/geo/settings/SettingsSubscriptionView'))
const SettingsApiView = lazy(() => import('../pages/geo/settings/SettingsApiView'))
const GuideView = lazy(() => import('../pages/geo/guide/GuideView'))
const AdminPage = lazy(() => import('../pages/AdminPage'))
const PricingPage = lazy(() => import('../pages/PricingPage'))
const SubscriptionPage = lazy(() => import('../pages/SubscriptionPage'))
const BillingPage = lazy(() => import('../pages/BillingPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg-base, #050510)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm" style={{ color: 'var(--text-muted, #94a3b8)' }}>加载中...</span>
      </div>
    </div>
  )
}

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth()
  if (isLoading) return <LoadingFallback />
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireGeoAccess({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth()
  if (isLoading) return <LoadingFallback />
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={<LoadingFallback />}><LoginPage /></Suspense>,
  },
  {
    path: '/register',
    element: <Suspense fallback={<LoadingFallback />}><RegisterPage /></Suspense>,
  },
  {
    path: '/forgot-password',
    element: <Suspense fallback={<LoadingFallback />}><ForgotPasswordPage /></Suspense>,
  },
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/hotspot-radar" replace /> },
      { path: 'hotspot-radar', element: withSuspense(HotspotRadar) },
      { path: 'guide', element: withSuspense(GuideView) },
      { path: 'admin', element: withSuspense(AdminPage) },
      { path: 'pricing', element: withSuspense(PricingPage) },
      { path: 'subscription', element: withSuspense(SubscriptionPage) },
      { path: 'billing', element: withSuspense(BillingPage) },
      { path: 'settings', element: withSuspense(SettingsPage) },
    ],
  },
  {
    path: '/geo',
    element: <RequireGeoAccess><AppLayout /></RequireGeoAccess>,
    children: [
      { index: true, element: <Navigate to="/geo/dashboard" replace /> },
      { path: 'dashboard', element: withSuspense(GeoDashboard) },
      { path: 'geo-check', element: withSuspense(GeoCheckView) },
      { path: 'geo-check/reports', element: withSuspense(GeoReportsView) },
      { path: 'geo-check/reports/:id', element: withSuspense(ReportDetailView) },
      { path: 'content/generate', element: withSuspense(ContentGenerateView) },
      { path: 'content/list', element: withSuspense(ContentListView) },
      { path: 'content/calendar', element: withSuspense(ContentCalendarView) },
      { path: 'content/:id', element: withSuspense(ContentDetailView) },
      { path: 'content/:id/edit', element: withSuspense(ContentDetailView) },
      { path: 'knowledge', element: withSuspense(KnowledgeView) },
      { path: 'monitor', element: withSuspense(MonitorView) },
      { path: 'monitor/:id', element: withSuspense(MonitorDetailView) },
      { path: 'strategy', element: withSuspense(StrategyView) },
      { path: 'strategy/:id', element: withSuspense(StrategyDetailView) },
      { path: 'video', element: withSuspense(VideoCenterView) },
      { path: 'video/create', element: withSuspense(VideoCreateView) },
      { path: 'video/assets', element: withSuspense(VideoAssetsView) },
      { path: 'video/publish', element: withSuspense(VideoPublishView) },
      { path: 'notifications', element: withSuspense(NotificationsView) },
      { path: 'settings/profile', element: withSuspense(SettingsProfileView) },
      { path: 'settings/tenant', element: withSuspense(SettingsTenantView) },
      { path: 'settings/knowledge', element: withSuspense(SettingsKnowledgeView) },
      { path: 'settings/subscription', element: withSuspense(SettingsSubscriptionView) },
      { path: 'settings/api', element: withSuspense(SettingsApiView) },
    ],
  },
  { path: '*', element: <Navigate to="/hotspot-radar" replace /> },
])
