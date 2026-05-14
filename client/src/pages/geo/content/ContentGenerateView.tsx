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
import GuideTabs from '../../../components/ui/GuideTabs'

/* ===== Apple Design Colors ===== */
const APPLE_BLUE = '#007AFF'
const APPLE_GREEN = '#34C759'
const APPLE_ORANGE = '#FF9500'
const APPLE_RED = '#FF3B30'
const GRAY_900 = '#1C1C1E'
const GRAY_600 = '#636366'
const GRAY_500 = '#8E8E93'
const GRAY_200 = '#E8E8ED'
const GRAY_100 = '#F5F5F7'
const GRAY_50 = '#FAFAFA'
const WHITE = '#FFFFFF'
const CARD_SHADOW = '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'
const INPUT_BORDER = `1px solid ${GRAY_200}`
const INPUT_FOCUS = `1px solid ${APPLE_BLUE}`

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

const TEMPLATE_CATEGORIES: { label: string; value: string }[] = [
  { label: '季节营销', value: 'seasonal' },
  { label: '产品推广', value: 'product' },
  { label: '竞品分析', value: 'competitor' },
  { label: '平台专属', value: 'platform' },
]

const STEP_TITLES = ['基本信息', '品牌信息', '高级设置', '生成结果']

function parseVariables(variables: string | null | undefined): string {
  if (!variables) return '无'
  try {
    const parsed = JSON.parse(variables)
    if (Array.isArray(parsed)) return parsed.join('、')
    return String(parsed)
  } catch {
    return variables.replace(/[\[\]]/g, '').replace(/,/g, '、')
  }
}

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

  useEffect(() => {
    setTemplateCategories([])
    contentApi.getTemplates(form.industry ? { category: form.industry } : undefined)
      .then(items => {
        setTemplates(items)
        setFilteredTemplates(items)
      })
      .catch(() => setTemplates([]))
  }, [form.industry])

  useEffect(() => {
    if (templateCategories.length === 0) {
      setFilteredTemplates(templates)
    } else {
      const categoryValues = TEMPLATE_CATEGORIES
        .filter(cat => templateCategories.includes(cat.label))
        .map(cat => cat.value)
      setFilteredTemplates(templates.filter(t => categoryValues.includes(t.category)))
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
    <div style={{ padding: '24px', background: GRAY_100, minHeight: '100%' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: GRAY_900, margin: 0 }}>AI内容生成</h3>
          <p style={{ fontSize: '13px', color: GRAY_500, margin: '2px 0 0 0' }}>多平台智能内容创作</p>
        </div>
        <button
          onClick={() => navigate('/geo/content/list')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${GRAY_200}`,
            fontSize: '14px',
            color: GRAY_600,
            background: WHITE,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease'
          }}
        >
          返回列表
        </button>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        {STEP_TITLES.map((title, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '14px',
              fontWeight: 500,
              background: i < step ? APPLE_GREEN : i === step ? APPLE_BLUE : GRAY_100,
              color: i <= step ? WHITE : GRAY_500,
              transition: 'all 0.2s ease'
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{
              marginLeft: '8px',
              fontSize: '14px',
              fontWeight: i === step ? 500 : 400,
              color: i === step ? GRAY_900 : GRAY_500
            }}>
              {title}
            </span>
            {i < STEP_TITLES.length - 1 && (
              <div style={{ width: '32px', height: '1px', backgroundColor: GRAY_200, margin: '0 8px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: 基本信息 */}
      {step === 0 && (
        <div style={{
          background: WHITE,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: CARD_SHADOW,
          border: '1px solid rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {/* 品牌名 */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>
                品牌名
              </label>
              <input
                type="text"
                value={form.brandName}
                onChange={e => updateForm('brandName', e.target.value)}
                placeholder="如：超人户外"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: INPUT_BORDER,
                  fontSize: '14px',
                  color: GRAY_900,
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  fontFamily: 'inherit',
                  background: WHITE
                }}
                onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* 行业 */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>
                行业
              </label>
              <select
                value={form.industry}
                onChange={e => updateForm('industry', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: INPUT_BORDER,
                  fontSize: '14px',
                  color: GRAY_900,
                  outline: 'none',
                  background: WHITE,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
              >
                <option value="">选择行业</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* 关键词 */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>
              核心关键词
            </label>
            <TagInput
              tags={form.keywords}
              onChange={tags => updateForm('keywords', tags)}
              placeholder="输入关键词后按回车添加"
            />
          </div>

          {/* 目标平台 */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '12px' }}>
              目标平台
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {PLATFORMS.map(p => (
                <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
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
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: APPLE_BLUE }}
                  />
                  <span style={{ fontSize: '14px', color: GRAY_600 }}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 内容模板 */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>
              内容模板
            </label>
            {/* Category filter */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => {
                    if (templateCategories.includes(cat.label)) {
                      setTemplateCategories(templateCategories.filter(x => x !== cat.label))
                    } else {
                      setTemplateCategories([...templateCategories, cat.label])
                    }
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: templateCategories.includes(cat.label) ? APPLE_BLUE : GRAY_100,
                    color: templateCategories.includes(cat.label) ? WHITE : GRAY_500,
                    fontFamily: 'inherit'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <select
              value={form.templateId}
              onChange={e => updateForm('templateId', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: INPUT_BORDER,
                fontSize: '14px',
                color: GRAY_900,
                outline: 'none',
                background: WHITE,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <option value="">选择内容模板</option>
              {filteredTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}（{t.contentType}）</option>
              ))}
            </select>

            {/* Template preview */}
            {selectedTemplate && (
              <div style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '10px',
                border: `1px solid ${GRAY_200}`,
                background: GRAY_50
              }}>
                {selectedTemplate.description && (
                  <div style={{ fontSize: '13px', marginBottom: '4px', color: GRAY_600 }}>
                    <span style={{ fontWeight: 500 }}>描述：</span>{selectedTemplate.description}
                  </div>
                )}
                <div style={{ fontSize: '12px', marginBottom: '4px', color: GRAY_500 }}>
                  <span style={{ fontWeight: 500 }}>变量：</span>{parseVariables(selectedTemplate.variables)}</div>
                <div style={{ fontSize: '12px', color: APPLE_BLUE }}>
                  <span style={{ fontWeight: 500 }}>提示词：</span><span style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>{selectedTemplate.prompt}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: 品牌信息 */}
      {step === 1 && (
        <div style={{
          background: WHITE,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: CARD_SHADOW,
          border: '1px solid rgba(0,0,0,0.04)'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>
              品牌卖点
            </label>
            <p style={{ fontSize: '12px', color: GRAY_500, marginBottom: '12px' }}>定义品牌独特价值，便于AI精准表达</p>
            <TagInput
              tags={form.sellingPoints}
              onChange={tags => updateForm('sellingPoints', tags)}
              placeholder="输入卖点后按回车"
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>
              竞品品牌
            </label>
            <p style={{ fontSize: '12px', color: GRAY_500, marginBottom: '12px' }}>AI会对比分析差异化优势</p>
            <TagInput
              tags={form.competitors}
              onChange={tags => updateForm('competitors', tags)}
              placeholder="输入竞品名称后按回车"
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>
              官网URL
            </label>
            <p style={{ fontSize: '12px', color: GRAY_500, marginBottom: '12px' }}>AI可抓取品牌信息自动补充内容</p>
            <input
              type="url"
              value={form.websiteUrl}
              onChange={e => updateForm('websiteUrl', e.target.value)}
              placeholder="https://www.example.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: INPUT_BORDER,
                fontSize: '14px',
                color: GRAY_900,
                outline: 'none',
                fontFamily: 'inherit',
                background: WHITE,
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
            />
          </div>
        </div>
      )}

      {/* Step 2: 高级设置 */}
      {step === 2 && (
        <div style={{
          background: WHITE,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: CARD_SHADOW,
          border: '1px solid rgba(0,0,0,0.04)'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>
              自定义提示词
            </label>
            <p style={{ fontSize: '12px', color: GRAY_500, marginBottom: '12px' }}>给AI的额外指令，如"重点强调面料工艺"</p>
            <textarea
              value={form.customPrompt}
              onChange={e => updateForm('customPrompt', e.target.value)}
              rows={3}
              placeholder="给AI的额外指令（可选）"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: INPUT_BORDER,
                fontSize: '14px',
                color: GRAY_900,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                background: WHITE,
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '12px' }}>
              语气风格
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {TONE_OPTIONS.map(t => (
                <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="tone"
                    value={t.value}
                    checked={form.tone === t.value}
                    onChange={e => updateForm('tone', e.target.value)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: APPLE_BLUE }}
                  />
                  <span style={{ fontSize: '14px', color: GRAY_600 }}>{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '12px' }}>
              字数范围：{form.wordCount} 字
            </label>
            <input
              type="range"
              min={300}
              max={5000}
              step={100}
              value={form.wordCount}
              onChange={e => updateForm('wordCount', Number(e.target.value))}
              style={{ width: '100%', accentColor: APPLE_BLUE }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: GRAY_500, marginTop: '4px' }}>
              <span>300字</span>
              <span>5000字</span>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '12px' }}>
              生成数量：{form.count} 篇
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => updateForm('count', n)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: form.count === n ? APPLE_BLUE : GRAY_100,
                    color: form.count === n ? WHITE : GRAY_500,
                    fontFamily: 'inherit'
                  }}
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
        <div style={{
          background: WHITE,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: CARD_SHADOW,
          border: '1px solid rgba(0,0,0,0.04)'
        }}>
          {generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(0,122,255,0.15)',
                borderTopColor: APPLE_BLUE,
                borderRadius: '50%',
                animation: 'apple-spin 0.8s linear infinite',
                marginBottom: '16px'
              }} />
              <p style={{ color: GRAY_500, fontSize: '14px' }}>AI正在创作中，请稍候...</p>
            </div>
          ) : generatedContent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: GRAY_900, margin: 0 }}>{generatedContent.title}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedContent.body || generatedContent.content || '')
                    }}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      border: `1px solid ${GRAY_200}`,
                      borderRadius: '8px',
                      color: GRAY_600,
                      background: WHITE,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    复制内容
                  </button>
                  <button
                    onClick={() => navigate(`/geo/content/${generatedContent.id}/edit`)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      border: 'none',
                      borderRadius: '8px',
                      color: WHITE,
                      background: APPLE_BLUE,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    编辑排版
                  </button>
                </div>
              </div>
              <div style={{
                padding: '20px',
                borderRadius: '10px',
                border: `1px solid ${GRAY_200}`,
                background: GRAY_50
              }}>
                <div style={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: GRAY_600,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {(generatedContent.body || generatedContent.content || '').slice(0, 800)}
                  {(generatedContent.body || generatedContent.content || '').length > 800 && '...'}
                </div>
              </div>
              {generatedContent.complianceScore != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <span style={{ color: GRAY_500 }}>合规评分：</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: (generatedContent.complianceScore) >= 60 ? 'rgba(52,199,89,0.10)' : 'rgba(255,59,48,0.10)',
                    color: (generatedContent.complianceScore) >= 60 ? APPLE_GREEN : APPLE_RED
                  }}>
                    {generatedContent.complianceScore}
                  </span>
                </div>
              )}
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
              <p style={{ color: APPLE_RED, fontSize: '14px', marginBottom: '16px' }}>{error}</p>
              <button
                onClick={handleGenerate}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  border: 'none',
                  borderRadius: '8px',
                  color: WHITE,
                  background: APPLE_BLUE,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                重新生成
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px' }}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            border: `1px solid ${GRAY_200}`,
            borderRadius: '8px',
            color: GRAY_600,
            background: WHITE,
            cursor: step === 0 ? 'not-allowed' : 'pointer',
            opacity: step === 0 ? 0.5 : 1,
            fontFamily: 'inherit',
            transition: 'all 0.2s ease'
          }}
        >
          上一步
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '8px',
              color: WHITE,
              background: APPLE_BLUE,
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              opacity: canProceed() ? 1 : 0.4,
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
          >
            下一步
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '8px',
              color: WHITE,
              background: APPLE_GREEN,
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.6 : 1,
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
          >
            {generating ? '生成中...' : '开始生成'}
          </button>
        )}
      </div>
      <GuideTabs />
    </div>
  )
}
