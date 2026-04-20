import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Search, Plus, Bell, Trash2, 
  ExternalLink, X, Check, AlertTriangle,
  Zap, TrendingUp, Twitter, Globe, Eye, Activity, Clock, Target,
  ChevronLeft, ChevronRight,
  MessageCircle, Repeat2, Quote, User, Shield, ShieldAlert,
  ChevronDown, ChevronUp, ChevronsUpDown, ThermometerSun, FileText,
  Settings, LogOut, Crown
} from 'lucide-react';
import { 
  keywordsApi, hotspotsApi, notificationsApi, triggerHotspotCheck,
  keywordLibraryApi,
  type Hotspot, type Stats, type Notification,
  type UserKeyword, type LibraryKeyword
} from './services/api';
import { onNewHotspot, onNotification, subscribeToKeywords } from './services/socket';
import { cn } from './lib/utils';
import { Spotlight } from './components/ui/spotlight';
import { BackgroundBeams } from './components/ui/background-beams';
import { Meteors } from './components/ui/meteors';
import FilterSortBar, { defaultFilterState, type FilterState } from './components/FilterSortBar';
import { sortHotspots } from './utils/sortHotspots';
import { relativeTime, formatDateTime } from './utils/relativeTime';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import PricingPage from './pages/PricingPage';
import SubscriptionPage from './pages/SubscriptionPage';
import BillingPage from './pages/BillingPage';
// TextGenerateEffect available for future use

/** 计算热度综合指标（归一化 0-100） */
function calcHeatScore(h: Hotspot): number {
  const likes = h.likeCount ?? 0;
  const retweets = h.retweetCount ?? 0;
  const replies = h.replyCount ?? 0;
  const comments = h.commentCount ?? 0;
  const quotes = h.quoteCount ?? 0;
  const views = h.viewCount ?? 0;
  // 加权公式：转发最重、其次点赞、然后评论/回复
  const raw = likes * 2 + retweets * 3 + replies * 1.5 + comments * 1.5 + quotes * 2 + views / 100;
  // log 压缩到 0-100
  if (raw <= 0) return 0;
  return Math.min(100, Math.round(Math.log10(raw + 1) * 25));
}

function getHeatLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '爆', color: 'text-red-400' };
  if (score >= 60) return { label: '热', color: 'text-orange-400' };
  if (score >= 40) return { label: '温', color: 'text-amber-400' };
  if (score >= 20) return { label: '凉', color: 'text-blue-400' };
  return { label: '冷', color: 'text-slate-500' };
}

function App() {
  const { user, isLoading, isLoggedIn, logout } = useAuth();
  console.log('[App] Render - isLoading:', isLoading, 'isLoggedIn:', isLoggedIn, 'user:', user ? user.email : null);
  const [authPage, setAuthPage] = useState<'login' | 'register' | 'forgot'>('login');
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [keywords, setKeywords] = useState<UserKeyword[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [newKeyword, setNewKeyword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // isLoading 来自 useAuth()，isDataLoading 为数据加载状态
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'keywords' | 'search'>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<FilterState>({ ...defaultFilterState });
  const [searchFilters, setSearchFilters] = useState<FilterState>({ ...defaultFilterState });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchResults, setSearchResults] = useState<Hotspot[]>([]);
  // 展开/折叠状态
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());
  const [expandedContents, setExpandedContents] = useState<Set<string>>(new Set());
  const [allReasonsExpanded, setAllReasonsExpanded] = useState(false);
  // 关键词 tab 专用：选中关键词 & 该词热点
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [keywordHotspots, setKeywordHotspots] = useState<Hotspot[]>([]);
  const [keywordPage, setKeywordPage] = useState(1);
  const [keywordTotalPages, setKeywordTotalPages] = useState(1);
  // 系统词库
  const [libraryKeywords, setLibraryKeywords] = useState<LibraryKeyword[]>([]);
  const [selectedLibraryKeyword, setSelectedLibraryKeyword] = useState<string>('');

  // 加载数据
  const loadData = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsDataLoading(true);
    try {
      const filterParams: Record<string, string | number> = {
        limit: 20,
        page: currentPage,
      };
      // Apply dashboard filters
      if (dashboardFilters.source) filterParams.source = dashboardFilters.source;
      if (dashboardFilters.importance) filterParams.importance = dashboardFilters.importance;
      if (dashboardFilters.keywordId) filterParams.keywordId = dashboardFilters.keywordId;
      if (dashboardFilters.timeRange) filterParams.timeRange = dashboardFilters.timeRange;
      if (dashboardFilters.isReal) filterParams.isReal = dashboardFilters.isReal;
      if (dashboardFilters.sortBy) filterParams.sortBy = dashboardFilters.sortBy;
      if (dashboardFilters.sortOrder) filterParams.sortOrder = dashboardFilters.sortOrder;

      const [keywordsData, hotspotsData, statsData, notifData] = await Promise.all([
        keywordsApi.getSubscribed(),
        hotspotsApi.getAll(filterParams as any),
        hotspotsApi.getStats(),
        notificationsApi.getAll({ limit: 20 })
      ]);
      setKeywords(keywordsData);
      setHotspots(hotspotsData.data);
      setTotalPages(hotspotsData.pagination.totalPages);
      setStats(statsData);
      setNotifications(notifData.data);
      setUnreadCount(notifData.unreadCount);

      // 订阅关键词
      const activeKeywords = keywordsData.filter(k => k.isActive).map(k => k.text);
      if (activeKeywords.length > 0) {
        subscribeToKeywords(activeKeywords);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [isLoggedIn, dashboardFilters, currentPage]);

  // 加载指定关键词的热点列表
  const loadKeywordHotspots = useCallback(async (kwId: string, page = 1) => {
    setIsDataLoading(true);
    try {
      const data = await hotspotsApi.getAll({ keywordId: kwId, limit: 20, page });
      setKeywordHotspots(data.data);
      setKeywordTotalPages(data.pagination.totalPages);
      setKeywordPage(page);
    } catch (error) {
      console.error('Failed to load keyword hotspots:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  // 加载系统词库
  const loadLibraryKeywords = useCallback(async () => {
    try {
      const data = await keywordLibraryApi.getAll();
      setLibraryKeywords(data);
    } catch (error) {
      console.error('Failed to load library keywords:', error);
    }
  }, []);

  // 切换到关键词 tab 时自动选中第一个并加载热点
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === 'keywords') {
      loadLibraryKeywords();
      if (keywords.length > 0 && !selectedKeywordId) {
        const firstActive = keywords.find(k => k.isActive) || keywords[0];
        if (firstActive) {
          setSelectedKeywordId(firstActive.keywordId);
          loadKeywordHotspots(firstActive.keywordId, 1);
        }
      }
    }
  }, [isLoggedIn, activeTab, keywords, selectedKeywordId, loadKeywordHotspots, loadLibraryKeywords]);

  // 当筛选条件变化时重置页码
  useEffect(() => {
    if (!isLoggedIn) return;
    setCurrentPage(1);
  }, [isLoggedIn, dashboardFilters]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadData();
  }, [isLoggedIn, loadData]);

  // WebSocket 事件
  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubHotspot = onNewHotspot((hotspot) => {
      setHotspots(prev => [hotspot as Hotspot, ...prev.slice(0, 19)]);
      setToast({ message: '发现新热点: ' + hotspot.title.slice(0, 30), type: 'success' });
      setTimeout(() => setToast(null), 3000);
      loadData();
    });

    const unsubNotif = onNotification(() => {
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      unsubHotspot();
      unsubNotif();
    };
  }, [isLoggedIn, loadData]);

  // ✅ 所有useMemo必须无条件调用 - 移到条件返回之前
  // Client-side filtering/sorting for search results
  const filteredSearchResults = useMemo(() => {
    let results = [...searchResults];

    // Apply filters
    if (searchFilters.source) {
      results = results.filter(h => h.source === searchFilters.source);
    }
    if (searchFilters.importance) {
      results = results.filter(h => h.importance === searchFilters.importance);
    }
    if (searchFilters.isReal === 'true') {
      results = results.filter(h => h.isReal);
    } else if (searchFilters.isReal === 'false') {
      results = results.filter(h => !h.isReal);
    }
    if (searchFilters.keywordId) {
      results = results.filter(h => h.keyword?.id === searchFilters.keywordId);
    }
    if (searchFilters.timeRange) {
      const now = new Date();
      let dateFrom: Date | null = null;
      switch (searchFilters.timeRange) {
        case '1h': dateFrom = new Date(now.getTime() - 60 * 60 * 1000); break;
        case 'today': dateFrom = new Date(now); dateFrom.setHours(0, 0, 0, 0); break;
        case '7d': dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      }
      if (dateFrom) {
        results = results.filter(h => new Date(h.createdAt) >= dateFrom!);
      }
    }

    // Apply sorting using shared utility
    results = sortHotspots(results, searchFilters.sortBy || 'createdAt', (searchFilters.sortOrder || 'desc') as 'asc' | 'desc');

    return results;
  }, [searchResults, searchFilters]);

  // ✅ 所有回调函数必须无条件定义 - 移到条件返回之前
  const handleLogout = async () => {
    await logout();
  };

  const setToastAndClear = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 订阅关键词（从词库选择或新增）
  const handleSubscribeKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    try {
      const result = await keywordsApi.subscribe({ text: newKeyword.trim() });
      setKeywords(prev => {
        // 检查是否已存在
        const exists = prev.some(k => k.keywordId === result.keywordId);
        if (exists) {
          return prev;
        }
        return [result, ...prev];
      });
      setNewKeyword('');
      subscribeToKeywords([result.text]);
      
      // 立即触发后台扫描
      setToastAndClear('关键词已添加，正在扫描...', 'success');
      triggerHotspotCheck().catch(console.error);
      
      // 如果当前选中该关键词，刷新热点数据
      if (selectedKeywordId === result.id) {
        loadKeywordHotspots(result.keywordId, 1);
      }
    } catch (error: any) {
      setToastAndClear(error.message || '添加失败', 'error');
    }
  };

  // 取消订阅关键词
  const handleUnsubscribeKeyword = async (keywordId: string) => {
    try {
      await keywordsApi.unsubscribe(keywordId);
      setKeywords(prev => prev.filter(k => k.keywordId !== keywordId));
      setToastAndClear('已取消监控', 'success');
    } catch (error) {
      setToastAndClear('操作失败', 'error');
    }
  };

  // 切换关键词状态
  const handleToggleKeyword = async (id: string) => {
    try {
      const updated = await keywordsApi.toggle(id);
      setKeywords(prev => prev.map(k => k.id === id ? { ...k, isActive: updated.isActive } : k));
    } catch (error) {
      setToastAndClear('操作失败', 'error');
    }
  };

  // 从系统词库添加关键词
  const handleAddFromLibrary = async (keywordId: string) => {
    if (!keywordId) return;
    try {
      const result = await keywordsApi.subscribe({ keywordId });
      const exists = keywords.some(k => k.keywordId === result.keywordId);
      if (!exists) {
        setKeywords(prev => [{
          id: result.id,
          keywordId: result.keywordId,
          text: result.text,
          category: result.category,
          isActive: result.isActive,
          addedAt: result.addedAt,
          hotspotCount: 0
        }, ...prev]);
        setToastAndClear(`已添加 "${result.text}" 到监控词`, 'success');
        subscribeToKeywords([result.text]);
      } else {
        setToastAndClear('该关键词已在监控列表中', 'error');
      }
      setSelectedLibraryKeyword('');
    } catch (error: any) {
      setToastAndClear(error.message || '添加失败', 'error');
    }
  };

  // 手动搜索
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsDataLoading(true);
    try {
      const result = await hotspotsApi.search(searchQuery);
      setSearchResults(result.results);
      setToastAndClear(`找到 ${result.results.length} 条结果`, 'success');
    } catch (error) {
      setToastAndClear('搜索失败', 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  // 标记通知为已读
  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 展开/折叠相关性理由
  const toggleReason = (id: string) => {
    setExpandedReasons(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 展开/折叠原始内容
  const toggleContent = (id: string) => {
    setExpandedContents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 一键展开/折叠所有相关性理由
  const toggleAllReasons = (list: Hotspot[]) => {
    if (allReasonsExpanded) {
      setExpandedReasons(new Set());
    } else {
      setExpandedReasons(new Set(list.filter(h => h.relevanceReason).map(h => h.id)));
    }
    setAllReasonsExpanded(!allReasonsExpanded);
  };

  // ✅ 条件返回必须在所有hooks和函数定义之后
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    if (authPage === 'login') {
      return (
        <LoginPage
          onSwitchToRegister={() => setAuthPage('register')}
          onForgotPassword={() => setAuthPage('forgot')}
        />
      );
    }
    if (authPage === 'register') {
      return (
        <RegisterPage
          onSwitchToLogin={() => setAuthPage('login')}
        />
      );
    }
    if (authPage === 'forgot') {
      return (
        <ForgotPasswordPage
          onBack={() => setAuthPage('login')}
        />
      );
    }
  }

  // 定价页面（无需登录）
  if (showPricing) {
    return (
      <PricingPage onBack={() => setShowPricing(false)} />
    );
  }

  // 会员中心
  if (showSubscription) {
    return (
      <SubscriptionPage onBack={() => setShowSubscription(false)} />
    );
  }

  // 账单页
  if (showBilling) {
    return (
      <BillingPage onBack={() => setShowBilling(false)} />
    );
  }

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <Flame className="w-4 h-4" />;
      case 'medium': return <Zap className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'bilibili': return <Eye className="w-4 h-4" />;
      case 'weibo': return <Activity className="w-4 h-4" />;
      case 'sogou': return <Search className="w-4 h-4" />;
      case 'hackernews': return <Zap className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      twitter: 'Twitter',
      bing: 'Bing',
      google: 'Google',
      sogou: '搜狗',
      bilibili: 'Bilibili',
      weibo: '微博热搜',
      hackernews: 'HackerNews',
      duckduckgo: 'DuckDuckGo'
    };
    return labels[source] || source;
  };

  return (
    <div className="min-h-screen bg-[#050510] relative overflow-hidden">
      {/* Background Effects */}
      <BackgroundBeams className="z-0" />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#3b82f6" />
      
      {/* Subtle gradient orbs */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-6 left-1/2 z-50 px-5 py-3 rounded-xl backdrop-blur-xl flex items-center gap-3 shadow-2xl",
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            )}
          >
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Minimal & Clean */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#050510]/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src="/logo.png" alt="MFCR" className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-blue-500/20" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">MFCR-HotNews</h1>
                <p className="text-xs text-slate-500">热点监控系统</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* 管理员后台入口 */}
              {user?.role === 'admin' && (
                <motion.button
                  onClick={() => setShowAdmin(true)}
                  whileHover={{ scale: 1.02 }}
                  className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                >
                  <Crown className="w-4 h-4" />
                  管理后台
                </motion.button>
              )}

              {/* 定价入口 */}
              <button
                onClick={() => setShowPricing(true)}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white text-sm font-medium transition-all"
              >
                升级方案
              </button>

              {/* 会员中心 */}
              <button
                onClick={() => setShowSubscription(true)}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white text-sm transition-all flex items-center gap-2"
              >
                <Crown className="w-4 h-4" />
                会员
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                >
                  <Bell className="w-5 h-5 text-slate-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 top-14 w-80 bg-[#0a0a1a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <h3 className="font-medium text-white">通知</h3>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                            全部已读
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-slate-500 text-sm text-center py-8">暂无通知</p>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {notifications.slice(0, 5).map(n => (
                              <div key={n.id} className={cn("p-4 transition-colors", n.isRead ? 'opacity-50' : 'hover:bg-white/5')}>
                                <p className="text-sm font-medium text-white">{n.title}</p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 用户菜单 */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 text-sm">{user?.name || user?.email?.split('@')[0]}</span>
                </button>
              </div>

              {/* 登出 */}
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-slate-500 hover:text-red-400"
                title="登出"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 设置弹窗 */}
      {showSettings && (
        <SettingsPage onClose={() => setShowSettings(false)} />
      )}

      {/* 管理员后台弹窗 */}
      {showAdmin && (
        <AdminPage onClose={() => setShowAdmin(false)} />
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8">
          {([
            { key: 'dashboard', label: '热点雷达', icon: Activity },
            { key: 'keywords', label: '监控词', icon: Target },
            { key: 'search', label: '搜索', icon: Search },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all",
                activeTab === key 
                  ? 'bg-white/10 text-white border border-white/10' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Hero Stats */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                      <Activity className="w-4 h-4" />
                      总热点
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.total}</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="relative group p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                      <Clock className="w-4 h-4" />
                      今日新增
                    </div>
                    <p className="text-3xl font-bold text-cyan-400">{stats.today}</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative group p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/10 overflow-hidden"
                >
                  <Meteors number={6} />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      紧急热点
                    </div>
                    <p className="text-3xl font-bold text-red-400">{stats.urgent}</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="relative group p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                      <Target className="w-4 h-4" />
                      监控词
                    </div>
                    <p className="text-3xl font-bold text-emerald-400">{keywords.filter(k => k.isActive).length}</p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Hotspots Feed */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  实时热点流
                </h2>
                <span className="text-xs text-slate-600">每 30 分钟自动更新</span>
              </div>

              {/* Filter & Sort Bar */}
              <div className="mb-5">
                <FilterSortBar
                  filters={dashboardFilters}
                  onChange={setDashboardFilters}
                  keywords={keywords}
                />
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : hotspots.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <Search className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-500">尚未发现热点</p>
                  <p className="text-sm text-slate-600 mt-1">添加监控关键词开始追踪</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 一键展开/折叠所有理由 */}
                  {hotspots.some(h => h.relevanceReason) && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => toggleAllReasons(hotspots)}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                      >
                        <ChevronsUpDown className="w-3.5 h-3.5" />
                        {allReasonsExpanded ? '折叠所有理由' : '展开所有理由'}
                      </button>
                    </div>
                  )}

                  {hotspots.map((hotspot, index) => {
                    const heatScore = calcHeatScore(hotspot);
                    const heat = getHeatLevel(heatScore);
                    return (
                    <motion.div
                      key={hotspot.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Row 1: Meta badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider flex items-center",
                              hotspot.importance === 'urgent' && "bg-red-500/15 text-red-400 border border-red-500/20",
                              hotspot.importance === 'high' && "bg-orange-500/15 text-orange-400 border border-orange-500/20",
                              hotspot.importance === 'medium' && "bg-amber-500/15 text-amber-400 border border-amber-500/20",
                              hotspot.importance === 'low' && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            )}>
                              {getImportanceIcon(hotspot.importance)}
                              <span className="ml-1">{hotspot.importance}</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-600">
                              {getSourceIcon(hotspot.source)}
                              {getSourceLabel(hotspot.source)}
                            </span>
                            {hotspot.keyword && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {hotspot.keyword.text}
                              </span>
                            )}
                            {/* 真实性标记 */}
                            {!hotspot.isReal && (
                              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                                <ShieldAlert className="w-3 h-3" />
                                可疑
                              </span>
                            )}
                            {hotspot.isReal && hotspot.relevance >= 80 && (
                              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Shield className="w-3 h-3" />
                                可信
                              </span>
                            )}
                            {hotspot.keywordMentioned === true && (
                              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <Target className="w-3 h-3" />
                                直接提及
                              </span>
                            )}
                            {hotspot.keywordMentioned === false && (
                              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                <Target className="w-3 h-3" />
                                间接相关
                              </span>
                            )}
                            {/* 热度综合指标 */}
                            <span className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-medium", heat.color)}>
                              <ThermometerSun className="w-3 h-3" />
                              {heat.label} {heatScore}
                            </span>
                          </div>
                          
                          {/* Title */}
                          <h3 className="font-medium text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                            {hotspot.title}
                          </h3>
                          
                          {/* AI Summary - 标注 */}
                          {hotspot.summary && (
                            <div className="mb-3">
                              <span className="text-[10px] text-blue-400/60 font-medium mr-1.5">AI 摘要</span>
                              <span className="text-sm text-slate-500">{hotspot.summary}</span>
                            </div>
                          )}

                          {/* 作者信息 */}
                          {hotspot.authorName && (
                            <div className="flex items-center gap-2 mb-3">
                              {hotspot.authorAvatar ? (
                                <img src={hotspot.authorAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-600" />
                              )}
                              <span className="text-xs text-slate-400">
                                {hotspot.authorName}
                                {hotspot.authorUsername && <span className="text-slate-600 ml-1">@{hotspot.authorUsername}</span>}
                              </span>
                              {hotspot.authorVerified && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">✓ 认证</span>
                              )}
                              {hotspot.authorFollowers != null && hotspot.authorFollowers > 0 && (
                                <span className="text-[10px] text-slate-600">{hotspot.authorFollowers.toLocaleString()} 粉丝</span>
                              )}
                            </div>
                          )}
                          
                          {/* 互动数据 */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mb-2">
                            <span className="flex items-center gap-1">
                              <Target className="w-3.5 h-3.5" />
                              相关性 {hotspot.relevance}%
                            </span>
                            {hotspot.likeCount != null && hotspot.likeCount > 0 && (
                              <span className="flex items-center gap-1" title="点赞">
                                <Zap className="w-3.5 h-3.5" />
                                {hotspot.likeCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.retweetCount != null && hotspot.retweetCount > 0 && (
                              <span className="flex items-center gap-1" title="转发">
                                <Repeat2 className="w-3.5 h-3.5" />
                                {hotspot.retweetCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.replyCount != null && hotspot.replyCount > 0 && (
                              <span className="flex items-center gap-1" title="回复">
                                <MessageCircle className="w-3.5 h-3.5" />
                                {hotspot.replyCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.commentCount != null && hotspot.commentCount > 0 && (
                              <span className="flex items-center gap-1" title="评论">
                                <MessageCircle className="w-3.5 h-3.5" />
                                {hotspot.commentCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.quoteCount != null && hotspot.quoteCount > 0 && (
                              <span className="flex items-center gap-1" title="引用">
                                <Quote className="w-3.5 h-3.5" />
                                {hotspot.quoteCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.viewCount != null && hotspot.viewCount > 0 && (
                              <span className="flex items-center gap-1" title="浏览量">
                                <Eye className="w-3.5 h-3.5" />
                                {hotspot.viewCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.danmakuCount != null && hotspot.danmakuCount > 0 && (
                              <span className="flex items-center gap-1" title="弹幕">
                                💬 {hotspot.danmakuCount.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* 时间信息 */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                            {hotspot.publishedAt && (
                              <span className="flex items-center gap-1" title={`发布于 ${formatDateTime(hotspot.publishedAt)}`}>
                                <Clock className="w-3 h-3" />
                                发布 {relativeTime(hotspot.publishedAt)}
                              </span>
                            )}
                            <span className="flex items-center gap-1" title={`抓取于 ${formatDateTime(hotspot.createdAt)}`}>
                              <Activity className="w-3 h-3" />
                              抓取 {relativeTime(hotspot.createdAt)}
                            </span>
                          </div>

                          {/* AI 相关性理由 - 可折叠 */}
                          {hotspot.relevanceReason && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleReason(hotspot.id)}
                                className="flex items-center gap-1 text-[11px] text-blue-400/70 hover:text-blue-400 transition-colors"
                              >
                                {expandedReasons.has(hotspot.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                AI 分析理由
                              </button>
                              <AnimatePresence>
                                {expandedReasons.has(hotspot.id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <p className="text-xs text-slate-500 mt-1 pl-4 border-l-2 border-blue-500/20">
                                      {hotspot.relevanceReason}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* 原始内容 - 可折叠 */}
                          {hotspot.content && hotspot.content !== hotspot.summary && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleContent(hotspot.id)}
                                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                {expandedContents.has(hotspot.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                <FileText className="w-3 h-3" />
                                原始内容
                              </button>
                              <AnimatePresence>
                                {expandedContents.has(hotspot.id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <p className="text-xs text-slate-500 mt-1 pl-4 border-l-2 border-white/10 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                      {hotspot.content}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                        
                        {/* Link */}
                        <a
                          href={hotspot.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && !isLoading && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 7) {
                        page = i + 1;
                      } else if (currentPage <= 4) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        page = totalPages - 6 + i;
                      } else {
                        page = currentPage - 3 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                            currentPage === page
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "text-slate-500 hover:text-white hover:bg-white/5"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-600 ml-2">
                    共 {stats?.total || 0} 条
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keywords Tab */}
        {activeTab === 'keywords' && (
          <div className="flex gap-6 h-[calc(100vh-220px)]">
            {/* 左侧：关键词管理 */}
            <div className="w-80 shrink-0 flex flex-col">
              {/* 系统词库选择器 */}
              <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-purple-300">系统推荐词库</span>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedLibraryKeyword}
                    onChange={(e) => setSelectedLibraryKeyword(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                  >
                    <option value="">选择系统词...</option>
                    {libraryKeywords
                      .filter(lk => !keywords.some(k => k.keywordId === lk.id))
                      .map(lk => (
                        <option key={lk.id} value={lk.id}>
                          {lk.text} ({lk.userCount}人使用)
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => handleAddFromLibrary(selectedLibraryKeyword)}
                    disabled={!selectedLibraryKeyword}
                    className="px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 标题 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">我的监控词</h3>
                <span className="text-[10px] text-slate-600">{keywords.length} 个词</span>
              </div>

              {/* 已有词列表（直接展示，可点击选择） */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {keywords.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border border-dashed border-white/10">
                    <Target className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs">暂无监控词</p>
                    <p className="text-slate-600 text-[10px] mt-1">上方添加系统词或手动创建</p>
                  </div>
                ) : (
                  keywords.map((kw) => (
                    <div
                      key={kw.keywordId}
                      className={cn(
                        "p-3 rounded-xl border transition-all",
                        selectedKeywordId === kw.keywordId
                          ? "bg-blue-500/10 border-blue-500/30"
                          : "bg-white/[0.02] border-white/5 hover:border-white/10"
                      )}
                    >
                      {/* 第一行：开关 + 关键词名 */}
                      <div className="flex items-center justify-between gap-3">
                        <div 
                          onClick={() => {
                            setSelectedKeywordId(kw.keywordId);
                            loadKeywordHotspots(kw.keywordId, 1);
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          {/* 选中指示 */}
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            selectedKeywordId === kw.keywordId ? "bg-blue-400" : "bg-slate-600"
                          )} />
                          <span className={cn(
                            "text-sm font-medium truncate",
                            kw.isActive ? "text-white" : "text-slate-500"
                          )}>
                            {kw.text}
                          </span>
                          {/* 数据状态指示 */}
                          {(kw.hotspotCount ?? 0) > 0 ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="有存档数据" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" title="暂无数据" />
                          )}
                        </div>
                        
                        {/* 开关控制扫描 */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleKeyword(kw.id); }}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-all shrink-0",
                            kw.isActive ? "bg-blue-500" : "bg-slate-700"
                          )}
                          title={kw.isActive ? '点击暂停扫描' : '点击开始扫描'}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                            kw.isActive ? "left-[22px]" : "left-0.5"
                          )} />
                        </button>
                      </div>
                      
                      {/* 第二行：热点数量 */}
                      <div className="flex items-center justify-between mt-2 pl-4.5">
                        <span className="text-[10px] text-slate-600">
                          {kw.hotspotCount ?? 0} 条热点
                          {(kw.hotspotCount ?? 0) === 0 && " · 等待扫描"}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnsubscribeKeyword(kw.keywordId); }}
                          className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 添加新词 */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] text-slate-600 mb-2 px-1 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 添加新的监控词（添加后自动开始扫描）
                </p>
                <form onSubmit={handleSubscribeKeyword}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="输入新关键词..."
                      className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!newKeyword.trim()}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium flex items-center gap-1.5 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </motion.button>
                  </div>
                </form>
              </div>
            </div>

            {/* 右侧：选中关键词的热点 */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* 标题栏 */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <h2 className="text-base font-semibold text-white">
                    {keywords.find(k => k.keywordId === selectedKeywordId)?.text || '热点记录'}
                  </h2>
                  <span className="text-xs text-slate-600">后台自动监控</span>
                </div>
                <span className="text-xs text-slate-600">{keywordHotspots.length} 条结果</span>
              </div>

              {/* 热点列表 */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {isDataLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : keywordHotspots.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
                    <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">暂无热点记录</p>
                    <p className="text-slate-600 text-xs mt-1">后台每30分钟自动扫描</p>
                  </div>
                ) : (
                  keywordHotspots.map((hotspot, index) => {
                    const heatScore = calcHeatScore(hotspot);
                    const heat = getHeatLevel(heatScore);
                    return (
                      <motion.div
                        key={hotspot.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* 标签行 */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-semibold uppercase flex items-center",
                                hotspot.importance === 'urgent' && "bg-red-500/15 text-red-400 border border-red-500/20",
                                hotspot.importance === 'high' && "bg-orange-500/15 text-orange-400 border border-orange-500/20",
                                hotspot.importance === 'medium' && "bg-amber-500/15 text-amber-400 border border-amber-500/20",
                                hotspot.importance === 'low' && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              )}>
                                {getImportanceIcon(hotspot.importance)}
                                <span className="ml-0.5">{hotspot.importance}</span>
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-600">
                                {getSourceIcon(hotspot.source)}
                                {getSourceLabel(hotspot.source)}
                              </span>
                              {!hotspot.isReal && (
                                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                  <ShieldAlert className="w-3 h-3" />可疑
                                </span>
                              )}
                              {hotspot.isReal && hotspot.relevance >= 80 && (
                                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <Shield className="w-3 h-3" />可信
                                </span>
                              )}
                              <span className={cn("flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-medium", heat.color)}>
                                <ThermometerSun className="w-3 h-3" />{heat.label}
                              </span>
                            </div>
                            {/* 标题 */}
                            <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400 transition-colors mb-1">
                              {hotspot.title}
                            </h3>
                            {/* AI 摘要 */}
                            {hotspot.summary && (
                              <p className="text-xs text-slate-500 line-clamp-2 mb-1">{hotspot.summary}</p>
                            )}
                            {/* 元信息 */}
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />相关 {hotspot.relevance}%
                              </span>
                              {hotspot.publishedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />{relativeTime(hotspot.publishedAt)}
                                </span>
                              )}
                              {hotspot.viewCount != null && hotspot.viewCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />{hotspot.viewCount.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* 链接 */}
                          <a
                            href={hotspot.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* 分页 */}
              {keywordTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/5 shrink-0">
                  <button
                    onClick={() => selectedKeywordId && loadKeywordHotspots(selectedKeywordId, keywordPage - 1)}
                    disabled={keywordPage <= 1}
                    className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500 px-2">
                    {keywordPage} / {keywordTotalPages}
                  </span>
                  <button
                    onClick={() => selectedKeywordId && loadKeywordHotspots(selectedKeywordId, keywordPage + 1)}
                    disabled={keywordPage >= keywordTotalPages}
                    className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索热点内容..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <motion.button 
                  type="submit" 
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  搜索
                </motion.button>
              </div>
            </form>

            {/* Search Filter & Sort Bar */}
            <FilterSortBar
              filters={searchFilters}
              onChange={setSearchFilters}
              keywords={keywords}
            />

            {/* Search Results */}
            <div className="space-y-3">
              {filteredSearchResults.length === 0 && searchResults.length > 0 && (
                <div className="text-center py-12 rounded-2xl border border-dashed border-white/10">
                  <p className="text-slate-500">当前筛选条件下无结果</p>
                  <p className="text-sm text-slate-600 mt-1">尝试调整筛选条件</p>
                </div>
              )}
              {filteredSearchResults.map((hotspot, i) => {
                const heatScore = calcHeatScore(hotspot);
                const heat = getHeatLevel(heatScore);
                return (
                <motion.div 
                  key={hotspot.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase flex items-center",
                          hotspot.importance === 'urgent' && "bg-red-500/15 text-red-400 border border-red-500/20",
                          hotspot.importance === 'high' && "bg-orange-500/15 text-orange-400 border border-orange-500/20",
                          hotspot.importance === 'medium' && "bg-amber-500/15 text-amber-400 border border-amber-500/20",
                          hotspot.importance === 'low' && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        )}>
                          {getImportanceIcon(hotspot.importance)}
                          <span className="ml-1">{hotspot.importance}</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          {getSourceIcon(hotspot.source)}
                          {getSourceLabel(hotspot.source)}
                        </span>
                        {!hotspot.isReal && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            可疑
                          </span>
                        )}
                        <span className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-medium", heat.color)}>
                          <ThermometerSun className="w-3 h-3" />
                          {heat.label} {heatScore}
                        </span>
                      </div>
                      <h3 className="font-medium text-white mb-2 group-hover:text-blue-400 transition-colors">{hotspot.title}</h3>
                      {hotspot.summary && (
                        <div className="mb-2">
                          <span className="text-[10px] text-blue-400/60 font-medium mr-1.5">AI 摘要</span>
                          <span className="text-sm text-slate-500">{hotspot.summary}</span>
                        </div>
                      )}
                      {hotspot.authorName && (
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-slate-600" />
                          <span className="text-xs text-slate-400">{hotspot.authorName}</span>
                          {hotspot.authorVerified && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">✓ 认证</span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" />
                          相关性 {hotspot.relevance}%
                        </span>
                        {hotspot.likeCount != null && hotspot.likeCount > 0 && (
                          <span className="flex items-center gap-1" title="点赞">
                            <Zap className="w-3.5 h-3.5" />
                            {hotspot.likeCount.toLocaleString()}
                          </span>
                        )}
                        {hotspot.viewCount != null && hotspot.viewCount > 0 && (
                          <span className="flex items-center gap-1" title="浏览量">
                            <Eye className="w-3.5 h-3.5" />
                            {hotspot.viewCount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {hotspot.publishedAt && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-1" title={formatDateTime(hotspot.publishedAt)}>
                          <Clock className="w-3 h-3" />
                          发布 {relativeTime(hotspot.publishedAt)}
                        </div>
                      )}
                    </div>
                    <a
                      href={hotspot.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium transition-all"
                    >
                      查看
                    </a>
                  </div>
                </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWrapper;
