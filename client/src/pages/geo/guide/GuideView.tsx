import { useNavigate } from 'react-router-dom'
import {
  Search, Video, BookOpen, Radio, FileText,
  ArrowRight, Sparkles, Target, TrendingUp, Zap,
  ListTodo, Clapperboard, CheckCircle2
} from 'lucide-react'
import { useEffect, useState } from 'react'
import GuideTabs from '../../../components/ui/GuideTabs'

// ========== 数据定义 ==========

const stats = [
  { value: '3-5倍', label: '信任度提升', desc: 'AI 推荐 vs 广告' },
  { value: '60%', label: '搜索流量', desc: '2026 年 AI 搜索占比' },
  { value: '0→1', label: '竞争机会', desc: '中小品牌 vs 巨头' },
]

const values = [
  {
    icon: Target,
    title: '从被动搜索到主动推荐',
    desc: '传统 SEO：用户搜索 → 找到你',
    highlight: 'GEO 优化：用户提问 → AI 主动推荐你',
    points: ['AI 搜索占比已超 40%，每月增长 5%', '用户对 AI 推荐的信任度比广告高 3-5 倍', '被推荐 vs 被忽略，是 0 和 1 的区别'],
  },
  {
    icon: Zap,
    title: '中小品牌的逆袭机会',
    desc: '传统搜索：大品牌垄断头部关键词',
    highlight: 'GEO 优化：AI 只看信息质量，不看品牌预算',
    points: ['AI 没有"品牌偏见"，只看"信息质量"', '只要知识库专业，AI 就会推荐你', '与巨头同台竞争，抢占 AI 搜索心智'],
  },
  {
    icon: TrendingUp,
    title: '从流量思维到心智思维',
    desc: '传统营销：比拼广告预算和点击成本',
    highlight: 'GEO 优化：比拼专业知识库和差异化价值',
    points: ['停投广告即停效 vs 内容长期存在', '价格战内卷 vs 价值战突围', '获取点击量 vs 占领用户心智'],
  },
]

const steps = [
  { num: 1, title: '完善企业信息', desc: '填写品牌名称、行业、核心卖点', tag: '5 分钟完成', route: '/geo/settings/tenant' },
  { num: 2, title: '建立品牌知识库', desc: '上传产品参数、技术规格、差异化卖点', tag: '知识库越丰富，AI 推荐越准', route: '/geo/knowledge' },
  { num: 3, title: '运行 GEO 体检', desc: '检测品牌在 AI 大模型中的表现', tag: '免费版每月 5 次', route: '/geo/geo-check' },
  { num: 4, title: '批量生成内容', desc: 'AI 自动生成知乎、小红书、B站等内容', tag: '免费版每月 5 篇', route: '/geo/content/generate' },
  { num: 5, title: '持续监测优化', desc: '追踪品牌在 AI 搜索中的排名变化', tag: '形成优化闭环', route: '/geo/monitor' },
]

const features = [
  { icon: Search, title: 'GEO 体检', desc: '多维度检测品牌在 AI 中的表现，生成详细优化报告', tag: '免费试用', route: '/geo/geo-check' },
  { icon: BookOpen, title: '品牌知识库', desc: '结构化存储品牌资料，让 AI "认识" 你的专业度', tag: '核心基础', route: '/geo/knowledge' },
  { icon: FileText, title: '内容引擎', desc: '一键生成多平台适配内容，解决素材匮乏问题', tag: '免费试用', route: '/geo/content/generate' },
  { icon: Radio, title: 'AI 监测', desc: '7×24 小时追踪品牌在 AI 搜索中的排名变化', tag: '专业版', route: '/geo/monitor' },
  { icon: ListTodo, title: '策略库', desc: '行业最佳实践、优化路线图、执行日历', tag: '专业版', route: '/geo/strategy' },
  { icon: Clapperboard, title: '短视频', desc: 'AI 辅助生成短视频脚本，抢占抖音快手流量', tag: '增值功能', route: '/geo/video' },
]

const timeline = [
  { period: '1 个月内', title: '完成基础配置', desc: 'GEO 得分提升 10-20 分，明确优化方向' },
  { period: '3 个月内', title: '建立完整知识库', desc: 'GEO 得分达到 85+，AI 推荐率提升 30%' },
  { period: '6 个月内', title: '持续内容输出', desc: 'AI 推荐率提升 50%，品牌心智份额翻倍' },
  { period: '1 年内', title: '行业影响力建立', desc: '成为 AI 搜索中的首选推荐品牌' },
]

// ========== 样式常量 ==========

const APPLE_BLUE = '#007AFF'
const APPLE_GREEN = '#34C759'
const APPLE_ORANGE = '#FF9500'
const APPLE_RED = '#FF3B30'
const APPLE_PURPLE = '#5856D6'
const APPLE_TEAL = '#64D2FF'
const GRAY_900 = '#1C1C1E'
const GRAY_600 = '#636366'
const GRAY_500 = '#8E8E93'
const GRAY_200 = '#E8E8ED'
const GRAY_300 = '#D2D2D7'
const GRAY_100 = '#F5F5F7'
const WHITE = '#FFFFFF'

const styles = {
  primaryGradient: `linear-gradient(135deg, ${APPLE_BLUE}, ${APPLE_PURPLE})`,
  cardBg: WHITE,
  cardBorder: GRAY_200,
  textPrimary: GRAY_900,
  textSecondary: GRAY_600,
  textMuted: GRAY_500,
  accentColor: APPLE_BLUE,
  borderDefault: GRAY_300,
}

// ========== 子组件 ==========

function HeroSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl px-6 py-12 md:px-12 md:py-16 lg:px-16 lg:py-20 text-center"
      style={{
        background: `linear-gradient(135deg, rgba(0,122,255,0.08), rgba(88,86,214,0.08), rgba(100,210,255,0.05))`,
        border: `1px solid ${GRAY_200}`
      }}
    >
      {/* 装饰光效 */}
      <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl -z-10 md:w-96 md:h-96" style={{ backgroundColor: 'rgba(0,122,255,0.08)' }} />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-3xl -z-10 md:w-72 md:h-72" style={{ backgroundColor: 'rgba(88,86,214,0.06)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] rounded-full blur-3xl -z-10 md:w-[600px] md:h-[400px]" style={{ backgroundColor: 'rgba(100,210,255,0.04)' }} />

      <div className="relative z-10 max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold mb-4 md:mb-6 leading-tight" style={{ color: styles.textPrimary }}>
          抓住 AI 搜索红利
          <br />
          让品牌被主动推荐
        </h1>
        <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 leading-relaxed max-w-2xl mx-auto" style={{ color: styles.textSecondary }}>
          传统 SEO 正在失效，AI 搜索占比已超{' '}
          <span className="font-bold" style={{ color: styles.accentColor }}>40%</span> 且每月增长{' '}
          <span className="font-bold" style={{ color: styles.accentColor }}>5%</span>。
          <br className="hidden sm:block" />
          用户不再点击链接，而是直接接受 AI 的答案。
        </p>

        {/* Hero Image */}
        <div className="mb-6 md:mb-8 rounded-xl overflow-hidden" style={{ height: '180px' }}>
          <img
            src="https://picsum.photos/1200/600"
            alt="AI 搜索时代的品牌增长"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center' }}
          />
        </div>

        {/* 统计数据 */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-6 md:mb-10">
          {stats.map((s) => (
            <div key={s.label} className="text-center min-w-[80px] md:min-w-[100px]">
              <div className="text-2xl md:text-3xl lg:text-4xl font-extrabold" style={{ color: styles.textPrimary }}>{s.value}</div>
              <div className="text-xs md:text-sm font-bold mt-1" style={{ color: styles.textPrimary }}>{s.label}</div>
              <div className="text-xs mt-0.5" style={{ color: styles.textMuted }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA 按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
          <button
            onClick={() => onNavigate('/geo/geo-check')}
            className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-3.5 font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
            style={{
              background: styles.primaryGradient,
              color: WHITE,
              boxShadow: '0 4px 20px rgba(0,122,255,0.25)'
            }}
            aria-label="免费检测品牌 GEO 得分"
          >
            <Search className="w-4 h-4 md:w-5 md:h-5" />
            免费检测品牌 GEO 得分
          </button>
          <button
            onClick={() => onNavigate('/geo/content/generate')}
            className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-3.5 font-semibold rounded-xl border transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
            style={{
              backgroundColor: WHITE,
              color: GRAY_600,
              borderColor: GRAY_300
            }}
            aria-label="体验 AI 内容生成"
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
            体验 AI 内容生成
          </button>
        </div>
      </div>
    </div>
  )
}

function ValueSection() {
  return (
    <section className="mt-8 md:mt-12">
      <div className="text-center mb-6 md:mb-10">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: styles.textPrimary }}>
          GEO 星擎的三大核心价值
        </h2>
        <p className="mt-2 text-sm md:text-base lg:text-lg" style={{ color: styles.textSecondary }}>
          不只是工具，是品牌在 AI 时代的战略转型
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {values.map((v) => (
          <div
            key={v.title}
            className="group rounded-2xl p-5 md:p-7 border hover:-translate-y-1 transition-all duration-300 text-center"
            style={{
              backgroundColor: styles.cardBg,
              borderColor: styles.cardBorder
            }}
          >
            <div 
              className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-4 md:mb-5 mx-auto group-hover:scale-110 transition-transform duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(0,122,255,0.08), rgba(88,86,214,0.06))'
              }}
            >
              <v.icon className="w-6 h-6 md:w-7 md:h-7" style={{ color: styles.accentColor }} />
            </div>
            <h3 className="text-base md:text-lg font-bold mb-2 md:mb-3" style={{ color: styles.textPrimary }}>{v.title}</h3>
            <p className="text-xs md:text-sm mb-1 line-clamp-2" style={{ color: styles.textSecondary }}>{v.desc}</p>
            <p className="text-xs md:text-sm font-semibold mb-3 md:mb-4" style={{ color: styles.accentColor }}>{v.highlight}</p>
            <ul className="space-y-1.5 md:space-y-2 text-left">
              {v.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs md:text-sm" style={{ color: styles.textSecondary }}>
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 flex-shrink-0" style={{ color: APPLE_GREEN }} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function StepsSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="mt-8 md:mt-16">
      <div className="text-center mb-6 md:mb-10">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: styles.textPrimary }}>
          五步快速开始，立即见效
        </h2>
        <p className="mt-2 text-sm md:text-base lg:text-lg" style={{ color: styles.textSecondary }}>
          无需技术团队，可视化操作，小白也能上手
        </p>
      </div>

      <div className="space-y-2 md:space-y-3">
        {steps.map((step) => (
          <button
            key={step.num}
            onClick={() => onNavigate(step.route)}
            className="w-full group flex items-center gap-3 md:gap-5 p-4 md:p-5 rounded-xl border hover:shadow-lg transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
            style={{
              backgroundColor: styles.cardBg,
              borderColor: styles.cardBorder
            }}
            aria-label={`步骤 ${step.num}: ${step.title}`}
          >
            <div 
              className="w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200 shadow-lg"
              style={{
                background: styles.primaryGradient,
                boxShadow: '0 4px 15px rgba(0,122,255,0.25)'
              }}
            >
              <span className="text-white font-bold text-sm md:text-lg">{step.num}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm md:text-base" style={{ color: styles.textPrimary }}>{step.title}</h3>
              <p className="text-xs md:text-sm mt-0.5 truncate" style={{ color: styles.textSecondary }}>{step.desc}</p>
            </div>
            <span 
              className="inline-flex px-2 py-0.5 md:px-3 md:py-1 text-xs font-medium rounded-full whitespace-nowrap"
              style={{
                color: APPLE_BLUE,
                backgroundColor: 'rgba(0,122,255,0.10)',
                border: `1px solid rgba(0,122,255,0.15)`
              }}
            >
              {step.tag}
            </span>
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" style={{ color: styles.textMuted }} />
          </button>
        ))}
      </div>
    </section>
  )
}

function FeaturesGrid({ onNavigate }: { onNavigate: (path: string) => void }) {
  const tagStyles: Record<string, { bg: string; text: string; border: string }> = {
    '免费试用': { bg: 'rgba(16,185,129,0.10)', text: '#10b981', border: 'rgba(16,185,129,0.15)' },
    '核心基础': { bg: 'rgba(245,158,11,0.10)', text: '#f59e0b', border: 'rgba(245,158,11,0.15)' },
    '专业版': { bg: 'rgba(0,122,255,0.10)', text: APPLE_BLUE, border: 'rgba(0,122,255,0.15)' },
    '增值功能': { bg: 'rgba(139,92,246,0.10)', text: '#8b5cf6', border: 'rgba(139,92,246,0.15)' },
  }

  return (
    <section className="mt-8 md:mt-16">
      <div className="text-center mb-6 md:mb-10">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: styles.textPrimary }}>
          核心功能，解决实际痛点
        </h2>
        <p className="mt-2 text-sm md:text-base lg:text-lg" style={{ color: styles.textSecondary }}>
          不只是概念，是可执行、可量化的解决方案
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {features.map((f) => {
          const style = tagStyles[f.tag] || { bg: 'rgba(142,142,147,0.10)', text: GRAY_500, border: 'rgba(142,142,147,0.15)' }
          return (
            <button
              key={f.title}
              onClick={() => onNavigate(f.route)}
              className="group text-center p-4 md:p-6 rounded-2xl border hover:-translate-y-1 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
              style={{
                backgroundColor: styles.cardBg,
                borderColor: styles.cardBorder
              }}
              aria-label={`${f.title}: ${f.desc}`}
            >
              <div 
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform duration-300"
                style={{
                  backgroundColor: GRAY_100,
                  border: `1px solid ${GRAY_200}`
                }}
              >
                <f.icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: styles.textSecondary }} />
              </div>
              <h3 className="font-bold text-sm md:text-base mb-1 md:mb-2" style={{ color: styles.textPrimary }}>{f.title}</h3>
              <p className="text-xs md:text-sm mb-3 md:mb-4 line-clamp-2" style={{ color: styles.textSecondary }}>{f.desc}</p>
              <span 
                className="inline-block px-2 py-0.5 md:px-3 md:py-1 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: `${style.bg}`,
                  color: style.text,
                  border: `1px solid ${style.border}`
                }}
              >
                {f.tag}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function TimelineSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="mt-8 md:mt-16">
      <div className="text-center mb-6 md:mb-10">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: styles.textPrimary }}>
          可量化的预期收益
        </h2>
        <p className="mt-2 text-sm md:text-base lg:text-lg" style={{ color: styles.textSecondary }}>
          不只是感觉，是实实在在的数据增长
        </p>
      </div>

      {/* 时间线 */}
      <div className="max-w-2xl mx-auto space-y-0">
        {timeline.map((item, index) => (
          <div key={item.period} className="flex gap-3 md:gap-5 py-4 md:py-6 border-b last:border-b-0" style={{ borderColor: styles.cardBorder }}>
            <div className="w-20 md:w-24 flex-shrink-0 pt-0.5">
              <span className="text-base md:text-lg font-bold" style={{ color: styles.textPrimary }}>{item.period}</span>
              {index < timeline.length - 1 && (
                <div className="hidden md:block w-0.5 h-full bg-gradient-to-b from-blue-400 to-transparent mt-2 ml-2" />
              )}
            </div>
            <div className="flex-1 pb-1">
              <h4 className="text-base md:text-lg font-bold" style={{ color: styles.textPrimary }}>{item.title}</h4>
              <p className="mt-1 text-xs md:text-sm" style={{ color: styles.textSecondary }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA 卡片 */}
      <div 
        className="mt-6 md:mt-10 rounded-2xl border p-6 md:p-8 lg:p-10 text-center"
        style={{
          background: `linear-gradient(135deg, rgba(0,122,255,0.08), rgba(88,86,214,0.06), rgba(100,210,255,0.04))`,
          borderColor: GRAY_200
        }}
      >
        <h3 className="text-lg md:text-xl lg:text-2xl font-bold mb-4 md:mb-5" style={{ color: styles.textPrimary }}>
          现在开始 GEO 优化的三大理由
        </h3>
        <ul className="max-w-lg mx-auto space-y-2 md:space-y-3 mb-6 md:mb-8 text-left">
          {[
            { strong: '窗口期红利', text: '：AI 搜索刚兴起，竞争不激烈' },
            { strong: '成本最低时', text: '：越早开始，积累的品牌知识库价值越大' },
            { strong: '防御性布局', text: '：即使你现在不做，你的竞品可能已经在做' },
          ].map((item) => (
            <li key={item.strong} className="flex items-start gap-2 py-2 border-b last:border-b-0" style={{ borderColor: styles.cardBorder }}>
              <span className="font-bold flex-shrink-0 text-sm md:text-base" style={{ color: styles.textPrimary }}>{item.strong}</span>
              <span className="text-xs md:text-sm" style={{ color: styles.textSecondary }}>{item.text}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => onNavigate('/geo/geo-check')}
          className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-3.5 font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
          style={{
            background: styles.primaryGradient,
            color: WHITE,
            boxShadow: '0 4px 20px rgba(0,122,255,0.25)'
          }}
          aria-label="立即免费检测"
        >
          <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
          立即免费检测
        </button>
      </div>
    </section>
  )
}

// ========== 主组件 ==========

export default function GuideView() {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleNavigate(path: string) {
    navigate(path)
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64" aria-label="页面加载中">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '0 20px 60px',
      backgroundColor: GRAY_100
    }}>
      <HeroSection onNavigate={handleNavigate} />
      <ValueSection />
      <StepsSection onNavigate={handleNavigate} />
      <FeaturesGrid onNavigate={handleNavigate} />
      <TimelineSection onNavigate={handleNavigate} />

      {/* 底部间距 */}
      <div style={{ height: '40px' }} />

      <GuideTabs />
    </div>
  )
}
