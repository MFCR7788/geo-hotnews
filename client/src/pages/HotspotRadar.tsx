import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Search, Plus, Trash2,
  ExternalLink, X, Check, AlertTriangle,
  Zap, TrendingUp, Twitter, Globe, Eye, Activity, Clock, Target,
  ChevronLeft, ChevronRight,
  MessageCircle, Repeat2, Quote, User, Shield, ShieldAlert,
  ChevronDown, ChevronUp, ChevronsUpDown, ThermometerSun, FileText,
  Crown
} from 'lucide-react';
import { 
  keywordsApi, hotspotsApi, notificationsApi, triggerHotspotCheck,
  keywordLibraryApi,
  type Hotspot, type Stats, type Notification,
  type UserKeyword, type LibraryKeyword
} from '../services/api';
import { onNewHotspot, onNotification, subscribeToKeywords } from '../services/socket';
import { cn } from '../lib/utils';
import FilterSortBar, { defaultFilterState, type FilterState } from '../components/FilterSortBar';
import { sortHotspots } from '../utils/sortHotspots';
import { relativeTime, formatDateTime } from '../utils/relativeTime';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import GuideTabs from '../components/ui/GuideTabs'

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

function HotspotRadar() {
  const { user, isLoading, isLoggedIn } = useAuth();
  console.log('[App] Render - isLoading:', isLoading, 'isLoggedIn:', isLoggedIn, 'user:', user ? user.email : null);
  
  const [authPage, setAuthPage] = useState<'login' | 'register' | 'forgot'>('login');
  const [keywords, setKeywords] = useState<UserKeyword[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [_notifications, setNotifications] = useState<Notification[]>([]);
  const [_unreadCount, setUnreadCount] = useState(0);
  
  const [newKeyword, setNewKeyword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRegion, setSearchRegion] = useState<'global' | 'china' | 'both'>('both');
  const [resultsPerSource, setResultsPerSource] = useState<number>(5);
  // isLoading 来自 useAuth()，isDataLoading 为数据加载状态
  const [isDataLoading, setIsDataLoading] = useState(false);
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
  // 相似词搜索
  const [similarKeywords, setSimilarKeywords] = useState<LibraryKeyword[]>([]);
  const [showSimilarDropdown, setShowSimilarDropdown] = useState(false);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);

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

  // 防抖搜索相似词
  const similarSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSimilarSearch = useCallback((value: string) => {
    setNewKeyword(value);
    if (similarSearchTimer.current) clearTimeout(similarSearchTimer.current);
    if (!value.trim()) {
      setSimilarKeywords([]);
      setShowSimilarDropdown(false);
      return;
    }
    setIsSearchingSimilar(true);
    similarSearchTimer.current = setTimeout(async () => {
      try {
        const results = await keywordsApi.searchSimilar(value.trim());
        setSimilarKeywords(results);
        setShowSimilarDropdown(results.length > 0);
      } catch (error) {
        console.error('Failed to search similar keywords:', error);
        setSimilarKeywords([]);
      } finally {
        setIsSearchingSimilar(false);
      }
    }, 300); // 300ms 防抖
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

  const setToastAndClear = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 订阅关键词（从词库选择或新增）
  const handleSubscribeKeyword = async (e?: React.FormEvent, keywordId?: string) => {
    if (e) e.preventDefault();
    if (!newKeyword.trim() && !keywordId) return;

    try {
      // 如果提供了 keywordId，说明从相似词中选择
      const result = keywordId
        ? await keywordsApi.subscribe({ keywordId })
        : await keywordsApi.subscribe({ text: newKeyword.trim() });
      
      if ((result as any).alreadySubscribed) {
        setToastAndClear('该关键词已在监控列表中', 'error');
        setNewKeyword('');
        setSimilarKeywords([]);
        setShowSimilarDropdown(false);
        return;
      }

      setKeywords(prev => {
        const exists = prev.some(k => k.keywordId === result.keywordId);
        if (exists) return prev;
        return [result, ...prev];
      });
      setNewKeyword('');
      setSimilarKeywords([]);
      setShowSimilarDropdown(false);
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
      const result = await hotspotsApi.search(searchQuery, searchRegion, resultsPerSource);
      setSearchResults(result.results);
      setToastAndClear(`找到 ${result.results.length} 条结果`, 'success');
    } catch (error) {
      setToastAndClear('搜索失败', 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    if (authPage === 'login') {
      return (
        <LoginPage
          onSwitchToRegister={() => setAuthPage('register')}
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
      duckduckgo: 'DuckDuckGo',
      baidu: '百度热搜',
      douyin: '抖音热搜',
      zhihu: '知乎热榜',
      toutiao: '头条热搜'
    };
    return labels[source] || source;
  };

  return (
    <div style={{ minHeight: 'calc(100vh + 3rem)', backgroundColor: '#f5f7fa', padding: '20px' }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              zIndex: 70,
              padding: '12px 20px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              background: toast.type === 'success' ? '#f0f9eb' : '#fef0f0',
              border: `1px solid ${toast.type === 'success' ? '#67C23A' : '#F56C6C'}20`,
              color: toast.type === 'success' ? '#67C23A' : '#F56C6C'
            }}
          >
            {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {([
            { key: 'dashboard', label: '热点雷达', icon: Activity },
            { key: 'keywords', label: '监控词', icon: Target },
            { key: 'search', label: '搜索', icon: Search },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '10px 20px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === key ? '#409EFF' : '#ffffff',
                color: activeTab === key ? '#ffffff' : '#606266',
                boxShadow: activeTab === key ? 'none' : '0 1px 4px rgba(0,0,0,0.06)'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Hero Stats */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#909399', fontSize: '14px', marginBottom: '8px' }}>
                    <Activity size={16} />
                    总热点
                  </div>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#303133', margin: 0 }}>{stats.total}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#909399', fontSize: '14px', marginBottom: '8px' }}>
                    <Clock size={16} />
                    今日新增
                  </div>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#409EFF', margin: 0 }}>{stats.today}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#909399', fontSize: '14px', marginBottom: '8px' }}>
                    <AlertTriangle size={16} />
                    紧急热点
                  </div>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#F56C6C', margin: 0 }}>{stats.urgent}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#909399', fontSize: '14px', marginBottom: '8px' }}>
                    <Target size={16} />
                    监控词
                  </div>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#67C23A', margin: 0 }}>{keywords.filter(k => k.isActive).length}</p>
                </motion.div>
              </div>
            )}

            {/* Hotspots Feed */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#303133', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Flame size={20} style={{ color: '#E6A23C' }} />
                  实时热点流
                </h2>
                <span style={{ fontSize: '12px', color: '#909399' }}>每 30 分钟自动更新</span>
              </div>

              {/* Filter & Sort Bar */}
              <div style={{ marginBottom: '20px' }}>
                <FilterSortBar
                  filters={dashboardFilters}
                  onChange={setDashboardFilters}
                  keywords={keywords}
                />
              </div>

              {isDataLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '2px solid rgba(64,158,255,0.3)',
                    borderTopColor: '#409EFF',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              ) : hotspots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', background: '#ffffff', borderRadius: '8px', border: '1px dashed #dcdfe6' }}>
                  <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', borderRadius: '50%', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Search size={32} style={{ color: '#909399' }} />
                  </div>
                  <p style={{ color: '#909399', fontSize: '14px', margin: '0 0 4px 0' }}>尚未发现热点</p>
                  <p style={{ fontSize: '13px', color: '#c0c4cc', margin: 0 }}>添加监控关键词开始追踪</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* 一键展开/折叠所有理由 */}
                  {hotspots.some(h => h.relevanceReason) && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => toggleAllReasons(hotspots)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: '#909399',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#409EFF'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#909399'}
                      >
                        <ChevronsUpDown size={14} />
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
                        style={{
                          padding: '20px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid #ebeef5',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'
                          e.currentTarget.style.borderColor = '#dcdfe6'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
                          e.currentTarget.style.borderColor = '#ebeef5'
                        }}
                        onClick={() => {
                          if (hotspot.url) {
                            window.open(hotspot.url, '_blank');
                          }
                        }}
                      >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Row 1: Meta badges */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: hotspot.importance === 'urgent' ? '#fef0f0' : hotspot.importance === 'high' ? '#fdf6ec' : hotspot.importance === 'medium' ? '#fdf6ec' : '#f0f9eb',
                              color: hotspot.importance === 'urgent' ? '#F56C6C' : hotspot.importance === 'high' ? '#E6A23C' : hotspot.importance === 'medium' ? '#E6A23C' : '#67C23A',
                              border: `1px solid ${hotspot.importance === 'urgent' ? '#F56C6C20' : hotspot.importance === 'high' ? '#E6A23C20' : hotspot.importance === 'medium' ? '#E6A23C20' : '#67C23A20'}`
                            }}>
                              {getImportanceIcon(hotspot.importance)}
                              <span style={{ marginLeft: '4px' }}>{hotspot.importance}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#909399' }}>
                              {getSourceIcon(hotspot.source)}
                              {getSourceLabel(hotspot.source)}
                            </span>
                            {hotspot.keyword && (
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#ecf5ff', color: '#409EFF', border: '1px solid #409EFF20' }}>
                                {hotspot.keyword.text}
                              </span>
                            )}
                            {/* 真实性标记 */}
                            {!hotspot.isReal && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#fef0f0', color: '#F56C6C', border: '1px solid #F56C6C20' }}>
                                <ShieldAlert size={12} />
                                可疑
                              </span>
                            )}
                            {hotspot.isReal && hotspot.relevance >= 80 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#f0f9eb', color: '#67C23A', border: '1px solid #67C23A20' }}>
                                <Shield size={12} />
                                可信
                              </span>
                            )}
                            {hotspot.keywordMentioned === true && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#f0f5ff', color: '#409EFF', border: '1px solid #409EFF20' }}>
                                <Target size={12} />
                                直接提及
                              </span>
                            )}
                            {hotspot.keywordMentioned === false && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#fdf6ec', color: '#E6A23C', border: '1px solid #E6A23C20' }}>
                                <Target size={12} />
                                间接相关
                              </span>
                            )}
                            {/* 热度综合指标 */}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#f4f4f5', border: '1px solid #e4e7ed', fontWeight: 500, color: heat.color === 'text-red-400' ? '#F56C6C' : heat.color === 'text-orange-400' ? '#E6A23C' : heat.color === 'text-amber-400' ? '#E6A23C' : heat.color === 'text-blue-400' ? '#409EFF' : '#909399' }}>
                              <ThermometerSun size={12} />
                              {heat.label} {heatScore}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 style={{ fontWeight: 500, color: '#303133', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', lineHeight: 1.4 }}>
                            {hotspot.title}
                            <ExternalLink size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                          </h3>
                          
                          {/* AI Summary - 标注 */}
                          {hotspot.summary && (
                            <div style={{ marginBottom: '12px' }}>
                              <span style={{ fontSize: '10px', color: '#409EFF', fontWeight: 500, marginRight: '6px' }}>AI 摘要</span>
                              <span style={{ fontSize: '14px', color: '#606266' }}>{hotspot.summary}</span>
                            </div>
                          )}

                          {/* 作者信息 */}
                          {hotspot.authorName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              {hotspot.authorAvatar ? (
                                <img src={hotspot.authorAvatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <User size={16} style={{ color: '#c0c4cc' }} />
                              )}
                              <span style={{ fontSize: '12px', color: '#909399' }}>
                                {hotspot.authorName}
                                {hotspot.authorUsername && <span style={{ color: '#c0c4cc', marginLeft: '4px' }}>@{hotspot.authorUsername}</span>}
                              </span>
                              {hotspot.authorVerified && (
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#ecf5ff', color: '#409EFF' }}>✓ 认证</span>
                              )}
                              {hotspot.authorFollowers != null && hotspot.authorFollowers > 0 && (
                                <span style={{ fontSize: '10px', color: '#909399' }}>{hotspot.authorFollowers.toLocaleString()} 粉丝</span>
                              )}
                            </div>
                          )}

                          {/* 互动数据 */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#909399', marginBottom: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Target size={14} />
                              相关性 {hotspot.relevance}%
                            </span>
                            {hotspot.likeCount != null && hotspot.likeCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="点赞">
                                <Zap size={14} />
                                {hotspot.likeCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.retweetCount != null && hotspot.retweetCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="转发">
                                <Repeat2 size={14} />
                                {hotspot.retweetCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.replyCount != null && hotspot.replyCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="回复">
                                <MessageCircle size={14} />
                                {hotspot.replyCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.commentCount != null && hotspot.commentCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="评论">
                                <MessageCircle size={14} />
                                {hotspot.commentCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.quoteCount != null && hotspot.quoteCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="引用">
                                <Quote size={14} />
                                {hotspot.quoteCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.viewCount != null && hotspot.viewCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="浏览量">
                                <Eye size={14} />
                                {hotspot.viewCount.toLocaleString()}
                              </span>
                            )}
                            {hotspot.danmakuCount != null && hotspot.danmakuCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="弹幕">
                                💬 {hotspot.danmakuCount.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* 时间信息 */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#909399' }}>
                            {hotspot.publishedAt && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title={`发布于 ${formatDateTime(hotspot.publishedAt)}`}>
                                <Clock size={12} />
                                发布 {relativeTime(hotspot.publishedAt)}
                              </span>
                            )}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title={`抓取于 ${formatDateTime(hotspot.createdAt)}`}>
                              <Activity size={12} />
                              抓取 {relativeTime(hotspot.createdAt)}
                            </span>
                          </div>

                          {/* AI 相关性理由 - 可折叠 */}
                          {hotspot.relevanceReason && (
                            <div style={{ marginTop: '8px' }}>
                              <button
                                onClick={() => toggleReason(hotspot.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  color: '#409EFF',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                {expandedReasons.has(hotspot.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                AI 分析理由
                              </button>
                              <AnimatePresence>
                                {expandedReasons.has(hotspot.id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <p style={{ fontSize: '12px', color: '#909399', marginTop: '4px', paddingLeft: '16px', borderLeft: '2px solid #409EFF20' }}>
                                      {hotspot.relevanceReason}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* 原始内容 - 可折叠 */}
                          {hotspot.content && hotspot.content !== hotspot.summary && (
                            <div style={{ marginTop: '8px' }}>
                              <button
                                onClick={() => toggleContent(hotspot.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  color: '#909399',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                {expandedContents.has(hotspot.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                <FileText size={12} />
                                原始内容
                              </button>
                              <AnimatePresence>
                                {expandedContents.has(hotspot.id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <p style={{ fontSize: '12px', color: '#909399', marginTop: '4px', paddingLeft: '16px', borderLeft: '2px solid #ebeef5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '160px', overflowY: 'auto' }}>
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
                          className="p-2.5 rounded-xl bg-gray-100 hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100"
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
                    className="p-2 rounded-xl bg-gray-100 border border-gray-200 text-slate-400 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
                              ? "bg-blue-500 text-white border border-blue-500"
                              : "text-slate-500 hover:text-gray-900 hover:bg-gray-100"
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
                    className="p-2 rounded-xl bg-gray-100 border border-gray-200 text-slate-400 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/12 transition-all"
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
                    className="px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 标题 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">我的监控词</h3>
                <span className="text-[10px] text-slate-600">{keywords.length} 个词</span>
              </div>

              {/* 已有词列表（直接展示，可点击选择） */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {keywords.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border border-dashed border-gray-200">
                    <Target className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs">暂无监控词</p>
                    <p className="text-slate-400 text-[10px] mt-1">上方添加系统词或手动创建</p>
                  </div>
                ) : (
                  keywords.map((kw) => (
                    <div
                      key={kw.keywordId}
                      className={cn(
                        "p-3 rounded-xl border transition-all",
                        selectedKeywordId === kw.keywordId
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-gray-200 hover:border-gray-300"
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
                            kw.isActive ? "text-gray-900" : "text-slate-400"
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
                            kw.isActive ? "bg-blue-500" : "bg-gray-300"
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
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-[10px] text-slate-600 mb-2 px-1 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 添加新的监控词（输入时自动匹配词库）
                </p>
                <form onSubmit={(e) => handleSubscribeKeyword(e)}>
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => handleSimilarSearch(e.target.value)}
                          onFocus={() => similarKeywords.length > 0 && setShowSimilarDropdown(true)}
                          onBlur={() => setTimeout(() => setShowSimilarDropdown(false), 200)}
                          placeholder="输入新关键词..."
                          className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/12 transition-all"
                        />
                        {isSearchingSimilar && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
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
                    
                    {/* 相似词下拉提示 */}
                    <AnimatePresence>
                      {showSimilarDropdown && similarKeywords.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute bottom-full left-0 right-0 mb-2 bg-white backdrop-blur-xl rounded-xl border border-gray-200 shadow-lg overflow-hidden z-[70]"
                        >
                          <div className="px-3 py-2 border-b border-gray-100">
                            <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1.5">
                              <Crown className="w-3 h-3" />
                              系统词库中已有相似词，点击直接选用
                            </span>
                          </div>
                          <div className="max-h-48 overflow-y-auto py-1">
                            {similarKeywords.map(kw => (
                              <button
                                key={kw.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSubscribeKeyword(undefined, kw.id);
                                }}
                                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-blue-50 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Target className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="text-sm text-gray-900 truncate">{kw.text}</span>
                                  {kw.category && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-slate-500 shrink-0">{kw.category}</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0 ml-2">{kw.userCount}人使用</span>
                              </button>
                            ))}
                          </div>
                          <div className="px-3 py-2 border-t border-gray-100">
                            <span className="text-[10px] text-slate-400">
                              没有合适的？直接点击添加按钮创建新词
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                  <h2 className="text-base font-semibold text-gray-900">
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
                  <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200">
                    <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">暂无热点记录</p>
                    <p className="text-slate-400 text-xs mt-1">后台每30分钟自动扫描</p>
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
                        className="group p-4 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all"
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
                              <span className={cn("flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-medium", heat.color)}>
                                <ThermometerSun className="w-3 h-3" />{heat.label}
                              </span>
                            </div>
                            {/* 标题 */}
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-500 transition-colors mb-1">
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
                            className="shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-all"
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
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 shrink-0">
                  <button
                    onClick={() => selectedKeywordId && loadKeywordHotspots(selectedKeywordId, keywordPage - 1)}
                    disabled={keywordPage <= 1}
                    className="p-2 rounded-xl bg-gray-100 text-slate-400 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500 px-2">
                    {keywordPage} / {keywordTotalPages}
                  </span>
                  <button
                    onClick={() => selectedKeywordId && loadKeywordHotspots(selectedKeywordId, keywordPage + 1)}
                    disabled={keywordPage >= keywordTotalPages}
                    className="p-2 rounded-xl bg-gray-100 text-slate-400 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-30 transition-all"
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
            <form onSubmit={handleSearch} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索热点内容..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/12 transition-all"
                  />
                </div>
                <select
                  value={searchRegion}
                  onChange={(e) => setSearchRegion(e.target.value as 'global' | 'china' | 'both')}
                  className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/12 transition-all cursor-pointer"
                >
                  <option value="global">国际平台</option>
                  <option value="china">国内平台</option>
                  <option value="both">全部平台</option>
                </select>
                <select
                  value={resultsPerSource}
                  onChange={(e) => setResultsPerSource(parseInt(e.target.value))}
                  className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/12 transition-all cursor-pointer"
                >
                  <option value="3">每平台3条</option>
                  <option value="5">每平台5条</option>
                  <option value="8">每平台8条</option>
                  <option value="10">每平台10条</option>
                </select>
                <motion.button 
                  type="submit" 
                  disabled={isDataLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  {isDataLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      正在全网搜索...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      搜索
                    </>
                  )}
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
                <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-slate-500">当前筛选条件下无结果</p>
                  <p className="text-sm text-slate-400 mt-1">尝试调整筛选条件</p>
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
                  className="group p-5 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 transition-all"
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
                        <span className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 font-medium", heat.color)}>
                          <ThermometerSun className="w-3 h-3" />
                          {heat.label} {heatScore}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2 group-hover:text-blue-500 transition-colors">{hotspot.title}</h3>
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
      </div>
      <GuideTabs />
    </div>
  );
}


export default HotspotRadar;
