/**
 * 内容生成 - 多步骤向导
 * Step1: 基本信息 (品牌/行业/关键词/平台/模板)
 * Step2: 品牌信息 (卖点/竞品/网站)
 * Step3: 高级设置 (语气/字数/数量)
 * Step4: 生成结果
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { contentApi } from '../../../services/geoApi'
import type { ContentTemplate } from '../../../services/geoApi'
import { INDUSTRIES } from '../../../lib/constants'
import TagInput from '../../../components/ui/TagInput'
import PageHeader from '../../../components/ui/PageHeader'

const PLATFORMS = [
  { value: 'zhihu', label: '知乎' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'bilibili', label: 'B站' },
  { value: 'wechat', label: '微信公众号' },
  { value: 'douyin', label: '抖音' },
  { value: 'weibo', label: '微博' },
  { value: 'website', label: '网站/博客' },
]

const TONE_OPTIONS = [
  { value: 'professional', label: '专业' },
  { value: 'casual', label: '轻松' },
  { value: 'humorous', label: '幽默' },
  { value: 'rigorous', label: '严谨' },
]

const TEMPLATE_CATEGORIES = ['seasonal', 'product', 'competitor', 'platform']

const STEP_TITLES = ['基本信息', '品牌信息', '高级设置', '生成结果']

export default function ContentGenerateView() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    brandName: '',
    industry: '',
    keywords: [] as string[],
    platforms: [] as string[],
    templateId: '',
    // Step2
    sellingPoints: [] as string[],
    competitors: [] as string[],
    websiteUrl: '',
    // Step3
    customPrompt: '',
    tone: 'professional',
    wordCount: 1500,
    count: 1,
  })

  const [templates, setTemplates] = useState<ContentTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<ContentTemplate[]>([])
  const [templateCategories, setTemplateCategories] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null)

  // Load templates on industry change
  useEffect(() => {
    if (!form.industry) return
    contentApi.getTemplates({ category: form.industry })
      .then(items => {
        setTemplates(items)
        setFilteredTemplates(items)
      })
      .catch(() => setTemplates([]))
  }, [form.industry])

  // Filter templates by category
  useEffect(() => {
    if (templateCategories.length === 0) {
      setFilteredTemplates(templates)
    } else {
      setFilteredTemplates(templates.filter(t => templateCategories.includes(t.category)))
    }
  }, [templateCategories, templates])

  useEffect(() => {
    const t = templates.find(t => t.id === form.templateId)
    setSelectedTemplate(t || null)
  }, [form.templateId, templates])

  function updateForm(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const content = await contentApi.create({
        templateId: form.templateId || undefined,
        title: `${form.brandName} - ${form.industry}内容`,
        platform: form.platforms[0] || 'xiaohongshu',
        industry: form.industry,
        brandName: form.brandName,
        keywords: form.keywords,
        // AI生成参数
        useAI: true,
        templatePrompt: selectedTemplate?.prompt || '',
        sellingPoints: form.sellingPoints,
        competitors: form.competitors,
        tone: form.tone,
        wordCount: form.wordCount,
        customPrompt: form.customPrompt,
      })
      setGeneratedContent(content)
      setStep(3)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '生成失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  function canProceed() {
    if (step === 0) return form.brandName && form.industry && form.keywords.length > 0 && form.templateId
    return true
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="AI内容生成"
        subtitle="多平台智能内容创作"
        onBack={() => navigate('/geo/content/list')}
      />

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_TITLES.map((title, i) => (
          <div key={i} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all
              ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}
            `}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i === step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {title}
            </span>
            {i < STEP_TITLES.length - 1 && <div className="w-8 h-px bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 0: 基本信息 */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 品牌名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">品牌名</label>
              <input
                type="text"
                value={form.brandName}
                onChange={e => updateForm('brandName', e.target.value)}
                placeholder="如：超人户外"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 行业 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">行业</label>
              <select
                value={form.industry}
                onChange={e => updateForm('industry', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择行业</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* 关键词 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">核心关键词</label>
            <TagInput
              tags={form.keywords}
              onChange={tags => updateForm('keywords', tags)}
              placeholder="输入关键词后按回车添加"
            />
          </div>

          {/* 目标平台 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">目标平台</label>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map(p => (
                <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.platforms.includes(p.value)}
                    onChange={e => {
                      if (e.target.checked) {
                        updateForm('platforms', [...form.platforms, p.value])
                      } else {
                        updateForm('platforms', form.platforms.filter(x => x !== p.value))
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 内容模板 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">内容模板</label>
            {/* Category filter */}
            <div className="flex flex-wrap gap-2 mb-3">
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    if (templateCategories.includes(cat)) {
                      setTemplateCategories(templateCategories.filter(x => x !== cat))
                    } else {
                      setTemplateCategories([...templateCategories, cat])
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    templateCategories.includes(cat)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <select
              value={form.templateId}
              onChange={e => updateForm('templateId', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择内容模板</option>
              {filteredTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}（{t.contentType}）</option>
              ))}
            </select>

            {/* Template preview */}
            {selectedTemplate && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                {selectedTemplate.description && (
                  <div className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">描述：</span>{selectedTemplate.description}
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-1">
                  <span className="font-medium">变量：</span>{selectedTemplate.variables ? JSON.parse(selectedTemplate.variables).join('、') : '无'}
                </div>
                <div className="text-xs text-blue-600">
                  <span className="font-medium">提示词：</span><span className="line-clamp-2">{selectedTemplate.prompt}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: 品牌信息 */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">品牌卖点</label>
            <p className="text-xs text-gray-400 mb-3">定义品牌独特价值，便于AI精准表达</p>
            <TagInput
              tags={form.sellingPoints}
              onChange={tags => updateForm('sellingPoints', tags)}
              placeholder="输入卖点后按回车"
              variant="default"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">竞品品牌</label>
            <p className="text-xs text-gray-400 mb-3">AI会对比分析差异化优势</p>
            <TagInput
              tags={form.competitors}
              onChange={tags => updateForm('competitors', tags)}
              placeholder="输入竞品名称后按回车"
              variant="warning"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">官网URL</label>
            <p className="text-xs text-gray-400 mb-3">AI可抓取品牌信息自动补充内容</p>
            <input
              type="url"
              value={form.websiteUrl}
              onChange={e => updateForm('websiteUrl', e.target.value)}
              placeholder="https://www.example.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Step 2: 高级设置 */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">自定义提示词</label>
            <p className="text-xs text-gray-400 mb-3">给AI的额外指令，如"重点强调面料工艺"</p>
            <textarea
              value={form.customPrompt}
              onChange={e => updateForm('customPrompt', e.target.value)}
              rows={3}
              placeholder="给AI的额外指令（可选）"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">语气风格</label>
            <div className="flex gap-3">
              {TONE_OPTIONS.map(t => (
                <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tone"
                    value={t.value}
                    checked={form.tone === t.value}
                    onChange={e => updateForm('tone', e.target.value)}
                    className="w-4 h-4 border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              字数范围：{form.wordCount} 字
            </label>
            <input
              type="range"
              min={300}
              max={5000}
              step={100}
              value={form.wordCount}
              onChange={e => updateForm('wordCount', Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>300字</span>
              <span>5000字</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              生成数量：{form.count} 篇
            </label>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => updateForm('count', n)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    form.count === n
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: 生成结果 */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          {generating ? (
            <div className="text-center py-16">
              <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500">AI正在创作中，请稍候...</p>
            </div>
          ) : generatedContent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{generatedContent.title}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedContent.body || generatedContent.content || '')
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    复制内容
                  </button>
                  <button
                    onClick={() => navigate(`/geo/content/${generatedContent.id}/edit`)}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    编辑排版
                  </button>
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                  {(generatedContent.body || generatedContent.content || '').slice(0, 800)}
                  {(generatedContent.body || generatedContent.content || '').length > 800 && '...'}
                </div>
              </div>
              {generatedContent.complianceScore != null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">合规评分：</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    (generatedContent.complianceScore) >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {generatedContent.complianceScore}
                  </span>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={handleGenerate}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                重新生成
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-6 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          上一步
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="px-6 py-2.5 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一步
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-60 transition-colors"
          >
            {generating ? '生成中...' : '开始生成'}
          </button>
        )}
      </div>
    </div>
  )
}
