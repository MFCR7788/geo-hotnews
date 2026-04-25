import { useNavigate } from 'react-router-dom'
import {
  Search, Video, BookOpen, BarChart3, Radio, FileText,
  ArrowRight, Sparkles, Target, TrendingUp, Zap,
  Shield, Eye, ListTodo, Clapperboard, CheckCircle2
} from 'lucide-react'
import { useEffect, useState } from 'react'

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

// ========== 子组件 ==========

function HeroSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-indigo-700/20 border border-white/10 px-8 py-16 md:px-16 md:py-20 text-center">
      {/* 装饰光效 */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-0" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl -z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl -z-0" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
          抓住 AI 搜索红利
          <br />
          让品牌被主动推荐
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto">
          传统 SEO 正在失效，AI 搜索占比已超{' '}
          <span className="font-bold text-yellow-400">40%</span> 且每月增长{' '}
          <span className="font-bold text-yellow-400">5%</span>。
          <br className="hidden sm:block" />
          用户不再点击链接，而是直接接受 AI 的答案。
        </p>

        {/* 统计数据 */}
        <div className="flex flex-wrap justify-center gap-8 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-white">{s.value}</div>
              <div className="text-sm font-medium text-gray-300 mt-1">{s.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA 按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('/geo/geo-check')}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5"
          >
            <Search className="w-5 h-5" />
            免费检测品牌 GEO 得分
          </button>
          <button
            onClick={() => onNavigate('/geo/content/generate')}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/5 text-white font-semibold rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5"
          >
            <Video className="w-5 h-5" />
            体验 AI 内容生成
          </button>
        </div>
      </div>
    </div>
  )
}

function ValueSection() {
  return (
    <section className="mt-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          GEO 星擎的三大核心价值
        </h2>
        <p className="mt-2 text-gray-400 text-lg">
          不只是工具，是品牌在 AI 时代的战略转型
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {values.map((v) => (
          <div
            key={v.title}
            className="group bg-white/[0.02] rounded-2xl p-7 border border-white/5 hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-1 transition-all duration-300 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-5 mx-auto group-hover:scale-110 transition-transform">
              <v.icon className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">{v.title}</h3>
            <p className="text-sm text-gray-400 mb-1 line-clamp-2">{v.desc}</p>
            <p className="text-sm font-semibold text-blue-400 mb-4">{v.highlight}</p>
            <ul className="space-y-2 text-left">
              {v.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
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
    <section className="mt-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          五步快速开始，立即见效
        </h2>
        <p className="mt-2 text-gray-400 text-lg">
          无需技术团队，可视化操作，小白也能上手
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <button
            key={step.num}
            onClick={() => onNavigate(step.route)}
            className="w-full group flex items-center gap-5 p-5 bg-white/[0.02] rounded-xl border border-white/5 hover:bg-white/[0.04] hover:border-white/10 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-lg">{step.num}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-base">{step.title}</h3>
              <p className="text-sm text-gray-400 mt-0.5 truncate">{step.desc}</p>
            </div>
            <span className="inline-flex px-3 py-1 text-xs font-medium text-blue-400 bg-blue-500/15 border border-blue-500/20 rounded-full whitespace-nowrap">
              {step.tag}
            </span>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </section>
  )
}

function FeaturesGrid({ onNavigate }: { onNavigate: (path: string) => void }) {
  const tagColors: Record<string, string> = {
    '免费试用': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    '核心基础': 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    '专业版': 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    '增值功能': 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  }

  return (
    <section className="mt-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          核心功能，解决实际痛点
        </h2>
        <p className="mt-2 text-gray-400 text-lg">
          不只是概念，是可执行、可量化的解决方案
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <button
            key={f.title}
            onClick={() => onNavigate(f.route)}
            className="group text-center p-6 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
              <f.icon className="w-6 h-6 text-gray-300" />
            </div>
            <h3 className="font-bold text-white mb-2">{f.title}</h3>
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{f.desc}</p>
            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${tagColors[f.tag] || 'bg-white/5 text-gray-400'}`}>
              {f.tag}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function TimelineSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="mt-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          可量化的预期收益
        </h2>
        <p className="mt-2 text-gray-400 text-lg">
          不只是感觉，是实实在在的数据增长
        </p>
      </div>

      {/* 时间线 */}
      <div className="max-w-2xl mx-auto space-y-0">
        {timeline.map((item) => (
          <div key={item.period} className="flex gap-5 py-6 border-b border-white/5 last:border-b-0">
            <div className="w-24 flex-shrink-0 pt-0.5">
              <span className="text-lg font-bold text-blue-400">{item.period}</span>
            </div>
            <div className="flex-1 pb-1">
              <h4 className="text-lg font-semibold text-white">{item.title}</h4>
              <p className="mt-1 text-gray-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA 卡片 */}
      <div className="mt-10 rounded-2xl bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-white/10 p-8 md:p-10 text-center">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-5">
          现在开始 GEO 优化的三大理由
        </h3>
        <ul className="max-w-lg mx-auto space-y-3 mb-8 text-left">
          {[
            { strong: '窗口期红利', text: '：AI 搜索刚兴起，竞争不激烈' },
            { strong: '成本最低时', text: '：越早开始，积累的品牌知识库价值越大' },
            { strong: '防御性布局', text: '：即使你现在不做，你的竞品可能已经在做' },
          ].map((item) => (
            <li key={item.strong} className="flex items-start gap-2 text-gray-300 py-2 border-b border-white/5 last:border-b-0">
              <span className="font-semibold text-blue-400 flex-shrink-0">{item.strong}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => onNavigate('/geo/geo-check')}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Sparkles className="w-5 h-5" />
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex justify-center bg-[#050510] min-h-[calc(100vh-3rem)] py-8 overflow-auto">
      <div className="w-full max-w-4xl px-6">
        <HeroSection onNavigate={handleNavigate} />
        <ValueSection />
        <StepsSection onNavigate={handleNavigate} />
        <FeaturesGrid onNavigate={handleNavigate} />
        <TimelineSection onNavigate={handleNavigate} />

        {/* 底部间距 */}
        <div className="h-12" />
      </div>
    </div>
  )
}