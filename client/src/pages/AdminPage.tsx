import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Shield, AlertTriangle, TrendingUp, Zap, Search,
  Ban, Unlock, Crown, Trash2, X, CheckCircle, BarChart3,
  CreditCard, RefreshCw, Clock, Play, Loader2
} from 'lucide-react';
import { adminApi, type User } from '../services/auth.js';
import { subscriptionApi } from '../services/subscription.js';
import { triggerHotspotCheck } from '../services/api.js';

// 扩展 User 类型以包含 _count
type AdminUser = User & { _count?: { keywords: number; notifications: number } };

interface AdminStats {
  users: { total: number; newToday: number; newThisWeek: number; banned: number; activeOnline: number };
  content: { keywords: number; hotspots: number; hotspotToday: number; notifications: number };
  trends: { registrations: Array<{ date: string; count: number }> };
}

// 订阅类型
interface AdminSubscription {
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
}

interface AdminPayment {
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
}

type TabType = 'users' | 'keywords' | 'subscriptions' | 'payments';

export default function AdminPage({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('users');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  // 开始扫描热点
  const handleStartScan = async () => {
    setScanning(true);
    try {
      await triggerHotspotCheck();
      setLastScanTime(new Date().toLocaleTimeString('zh-CN'));
      showFeedback('success', '扫描已触发，正在后台运行...');
    } catch (err: any) {
      showFeedback('error', err.message || '扫描启动失败');
    } finally {
      setScanning(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const fetchStats = async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers({ page, limit: 10, search: search || undefined });
      setUsers(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      showFeedback('error', err.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSubscriptions({ page, limit: 10, search: search || undefined });
      setSubscriptions(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      showFeedback('error', err.message || '获取订阅列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPayments({ page, limit: 10, search: search || undefined });
      setPayments(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      showFeedback('error', err.message || '获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchKeywords = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getKeywords({ page, limit: 10, search: search || undefined });
      setKeywords(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      showFeedback('error', err.message || '获取监控词列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    if (tab === 'users') {
      fetchUsers();
    } else if (tab === 'keywords') {
      fetchKeywords();
    } else if (tab === 'subscriptions') {
      fetchSubscriptions();
    } else if (tab === 'payments') {
      fetchPayments();
    }
  }, [tab, page, search]);

  const handleBan = async (id: string) => {
    setActionLoading(id);
    try {
      await adminApi.banUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isBanned: true } : u));
      showFeedback('success', '用户已封禁');
    } catch (err: any) {
      showFeedback('error', err.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (id: string) => {
    setActionLoading(id);
    try {
      await adminApi.unbanUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isBanned: false } : u));
      showFeedback('success', '用户已解封');
    } catch (err: any) {
      showFeedback('error', err.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该用户吗？此操作不可恢复。')) return;
    setActionLoading(id);
    try {
      await adminApi.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      showFeedback('success', '用户已删除');
    } catch (err: any) {
      showFeedback('error', err.message || '删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 手动续费
  const handleRenew = async (subscriptionId: string) => {
    setActionLoading(subscriptionId);
    try {
      await subscriptionApi.adminRenew(subscriptionId);
      showFeedback('success', '续费成功');
      fetchSubscriptions();
    } catch (err: any) {
      showFeedback('error', err.message || '续费失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 取消订阅
  const handleCancel = async (subscriptionId: string) => {
    if (!confirm('确定要取消该订阅吗？')) return;
    setActionLoading(subscriptionId);
    try {
      await subscriptionApi.adminCancel(subscriptionId);
      showFeedback('success', '已取消订阅');
      fetchSubscriptions();
    } catch (err: any) {
      showFeedback('error', err.message || '取消失败');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN');
  const formatDateTime = (d: string) => new Date(d).toLocaleString('zh-CN');
  const formatPrice = (cents: number) => (cents / 100).toFixed(2);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-emerald-500/20 text-emerald-400', label: '有效' },
      trialing: { color: 'bg-blue-500/20 text-blue-400', label: '试用中' },
      past_due: { color: 'bg-amber-500/20 text-amber-400', label: '逾期' },
      cancelled: { color: 'bg-slate-500/20 text-slate-400', label: '已取消' },
      expired: { color: 'bg-red-500/20 text-red-400', label: '已过期' },
      pending: { color: 'bg-yellow-500/20 text-yellow-400', label: '待支付' },
      paid: { color: 'bg-emerald-500/20 text-emerald-400', label: '已支付' },
      failed: { color: 'bg-red-500/20 text-red-400', label: '失败' },
      refunded: { color: 'bg-slate-500/20 text-slate-400', label: '已退款' },
    };
    const s = map[status] || { color: 'bg-slate-500/20 text-slate-400', label: status };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${s.color}`}>{s.label}</span>;
  };

  const getPlanBadge = (planId: string) => {
    const map: Record<string, { color: string; label: string }> = {
      free: { color: 'bg-slate-500/20 text-slate-400', label: 'Free' },
      pro: { color: 'bg-blue-500/20 text-blue-400', label: 'Pro' },
      enterprise: { color: 'bg-purple-500/20 text-purple-400', label: 'Enterprise' },
    };
    const p = map[planId] || { color: 'bg-slate-500/20 text-slate-400', label: planId };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${p.color}`}>{p.label}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a1a] border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">管理后台</h2>
              <p className="text-slate-500 text-xs">GEO星擎 系统管理</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 px-6 pt-4 border-b border-slate-800">
          {[
            { id: 'users', label: '用户管理', icon: <Users className="w-4 h-4" /> },
            { id: 'keywords', label: '监控词管理', icon: <Zap className="w-4 h-4" /> },
            { id: 'subscriptions', label: '订阅管理', icon: <Crown className="w-4 h-4" /> },
            { id: 'payments', label: '订单流水', icon: <CreditCard className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id as TabType); setPage(1); setSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-slate-800/50 text-white border border-slate-700 border-b-transparent'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 反馈 */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 ${
                feedback.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span className="text-sm">{feedback.msg}</span>
            </motion.div>
          )}

          {/* 统计卡片 */}
          {stats && tab === 'users' && (
            <div className="space-y-4">
              {/* 开始扫描按钮 */}
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">热点扫描</p>
                    <p className="text-slate-500 text-xs">
                      {lastScanTime ? `上次扫描: ${lastScanTime}` : '自动每30分钟扫描'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleStartScan}
                  disabled={scanning}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      扫描中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      开始扫描
                    </>
                  )}
                </button>
              </div>

              {/* 统计卡片网格 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: '总用户', value: stats.users.total, icon: <Users className="w-5 h-5 text-blue-400" />, sub: `今日+${stats.users.newToday}` },
                { label: '关键词', value: stats.content.keywords, icon: <Zap className="w-5 h-5 text-cyan-400" />, sub: '个监控词' },
                { label: '热点总数', value: stats.content.hotspots, icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, sub: `今日+${stats.content.hotspotToday}` },
                { label: '封禁用户', value: stats.users.banned, icon: <Ban className="w-5 h-5 text-red-400" />, sub: '已封禁' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#050510] border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 text-xs">{stat.label}</span>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
                  <p className="text-slate-600 text-xs mt-1">{stat.sub}</p>
                </motion.div>
              ))}
            </div>
            </div>
          )}

          {/* 监控词统计 */}
          {tab === 'keywords' && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: '监控词总数', value: keywords.length > 0 ? keywords[0].__total || stats?.content.keywords || 0 : stats?.content.keywords || 0, icon: <Zap className="w-5 h-5 text-blue-400" />, sub: '个关键词' },
                { label: '总订阅数', value: keywords.reduce((sum, k) => sum + k.userCount, 0), icon: <Users className="w-5 h-5 text-cyan-400" />, sub: '次订阅' },
                { label: '热点关联', value: keywords.reduce((sum, k) => sum + k.hotspotCount, 0), icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, sub: '条热点' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#050510] border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 text-xs">{stat.label}</span>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-slate-600 text-xs mt-1">{stat.sub}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* 扫描操作栏 */}
          {tab === 'keywords' && (
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">热点扫描</p>
                  <p className="text-slate-500 text-xs">
                    {lastScanTime ? `上次扫描: ${lastScanTime}` : '自动每30分钟扫描'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleStartScan}
                disabled={scanning}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    扫描中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    扫描监控词
                  </>
                )}
              </button>
            </div>
          )}

          {/* 订阅统计 */}
          {tab === 'subscriptions' && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: '有效订阅', value: subscriptions.filter(s => s.status === 'active').length, icon: <Crown className="w-5 h-5 text-blue-400" />, sub: '活跃中' },
                { label: '试用中', value: subscriptions.filter(s => s.status === 'trialing').length, icon: <Clock className="w-5 h-5 text-cyan-400" />, sub: '体验期' },
                { label: '逾期/过期', value: subscriptions.filter(s => ['past_due', 'expired'].includes(s.status)).length, icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, sub: '需关注' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#050510] border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 text-xs">{stat.label}</span>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-slate-600 text-xs mt-1">{stat.sub}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* 搜索栏 */}
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium flex items-center gap-2">
              {tab === 'users' && <><BarChart3 className="w-4 h-4" /> 用户列表</>}
              {tab === 'keywords' && <><Zap className="w-4 h-4" /> 监控词列表</>}
              {tab === 'subscriptions' && <><Crown className="w-4 h-4" /> 订阅列表</>}
              {tab === 'payments' && <><CreditCard className="w-4 h-4" /> 订单流水</>}
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder={tab === 'users' ? "搜索邮箱/昵称..." : tab === 'keywords' ? "搜索监控词..." : "搜索邮箱..."}
                className="bg-[#050510] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 w-64"
              />
            </div>
          </div>

          {/* 监控词列表 Tab */}
          {tab === 'keywords' && (
            <div className="bg-[#050510] border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">监控词</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">分类</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">订阅数</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">热点数</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">创建时间</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">订阅用户</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">加载中...</td>
                    </tr>
                  ) : keywords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">暂无监控词</td>
                    </tr>
                  ) : keywords.map((k) => (
                    <tr key={k.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white text-sm font-medium">{k.text}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-400 text-xs">{k.category || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-cyan-400 text-sm">{k.userCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-emerald-400 text-sm">{k.hotspotCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-400 text-xs">{formatDate(k.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {k.subscribers?.slice(0, 3).map((s: any) => (
                            <span key={s.id} className={`inline-flex px-2 py-0.5 rounded-full text-xs ${s.isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                              {s.name || s.email?.split('@')[0] || '用户'}
                            </span>
                          ))}
                          {(k.subscribers?.length || 0) > 3 && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-slate-700/50 text-slate-400">
                              +{k.subscribers.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 用户列表 Tab */}
          {tab === 'users' && (
            <div className="bg-[#050510] border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">用户</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">角色</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">数据</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">注册时间</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">状态</th>
                    <th className="text-right px-4 py-3 text-slate-500 text-xs font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">加载中...</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">暂无用户</td>
                    </tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm">{u.name || '—'}</p>
                          <p className="text-slate-500 text-xs">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'
                        }`}>
                          {u.role === 'admin' && <Crown className="w-3 h-3" />}
                          {u.role === 'admin' ? '管理员' : '用户'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-400 text-xs">{u._count?.keywords ?? 0} 关键词</p>
                        <p className="text-slate-500 text-xs">{u._count?.notifications ?? 0} 通知</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-400 text-xs">{formatDate(u.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {u.isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                            <Ban className="w-3 h-3" /> 已封禁
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                            正常
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {u.role !== 'admin' && (
                            <>
                              {u.isBanned ? (
                                <button
                                  onClick={() => handleUnban(u.id)}
                                  disabled={actionLoading === u.id}
                                  className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                                  title="解封"
                                >
                                  {actionLoading === u.id ? <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> : <Unlock className="w-4 h-4" />}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBan(u.id)}
                                  disabled={actionLoading === u.id}
                                  className="text-amber-400 hover:text-amber-300 p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors"
                                  title="封禁"
                                >
                                  {actionLoading === u.id ? <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> : <Ban className="w-4 h-4" />}
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(u.id)}
                                disabled={actionLoading === u.id}
                                className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 订阅列表 Tab */}
          {tab === 'subscriptions' && (
            <div className="bg-[#050510] border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">用户</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">套餐</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">周期</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">状态</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">到期时间</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">自动续费</th>
                    <th className="text-right px-4 py-3 text-slate-500 text-xs font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">加载中...</td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">暂无订阅</td>
                    </tr>
                  ) : subscriptions.map((s) => (
                    <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm">{s.userName || '—'}</p>
                          <p className="text-slate-500 text-xs">{s.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getPlanBadge(s.planId)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-400 text-xs">
                          {s.billingCycle === 'yearly' ? '年付' : '月付'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(s.status)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-400 text-xs">{formatDateTime(s.currentPeriodEnd)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {s.autoRenew ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                            <RefreshCw className="w-3 h-3" /> 开启
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-500/20 text-slate-400">
                            已关闭
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {s.status === 'active' && (
                            <button
                              onClick={() => handleRenew(s.id)}
                              disabled={actionLoading === s.id}
                              className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
                              title="手动续费"
                            >
                              {actionLoading === s.id ? <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                          )}
                          {(s.status === 'active' || s.status === 'trialing') && (
                            <button
                              onClick={() => handleCancel(s.id)}
                              disabled={actionLoading === s.id}
                              className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                              title="取消订阅"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 订单流水 Tab */}
          {tab === 'payments' && (
            <div className="bg-[#050510] border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">订单号</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">用户</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">套餐</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">金额</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">支付方式</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">状态</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">加载中...</td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">暂无订单</td>
                    </tr>
                  ) : payments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-slate-400 text-xs font-mono">{p.orderNo.slice(0, 16)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm">{p.userName || '—'}</p>
                          <p className="text-slate-500 text-xs">{p.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getPlanBadge(p.planName.toLowerCase())}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-emerald-400 font-medium">¥{formatPrice(p.amount)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-400 text-xs">
                          {p.payChannel === 'wechat' ? '微信支付' : p.payChannel === 'alipay' ? '支付宝' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-400 text-xs">{formatDateTime(p.createdAt)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-[#050510] border border-slate-700 text-slate-400 text-sm disabled:opacity-30 hover:border-slate-500 transition-colors"
              >
                上一页
              </button>
              <span className="text-slate-500 text-sm">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-[#050510] border border-slate-700 text-slate-400 text-sm disabled:opacity-30 hover:border-slate-500 transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
