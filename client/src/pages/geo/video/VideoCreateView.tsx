import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { videoApi } from '../../../services/geoApi'
import GuideTabs from '../../../components/ui/GuideTabs'

const BLUE = '#409EFF'
const GREEN = '#67C23A'
const ORANGE = '#E6A23C'
const RED = '#F56C6C'
const TEXT_PRIMARY = '#303133'
const TEXT_REGULAR = '#606266'
const TEXT_SECONDARY = '#909399'
const TEXT_PLACEHOLDER = '#C0C4CC'
const BORDER = '#DCDFE6'
const BG_LIGHT = '#F5F7FA'
const WHITE = '#FFFFFF'

const STEP_TITLES = ['选择方式', '输入内容', '配置参数', '生成']

const VIDEO_METHODS = [
  { type: 'text_to_video', name: '文案转视频', icon: '📝', desc: '输入文案，AI自动拆分镜头' },
  { type: 'image_to_video', name: '图片转视频', icon: '🖼️', desc: '选择图片素材，配字幕配音' },
  { type: 'video_mashup', name: '视频混剪', icon: '🎬', desc: '多段视频精华混剪' },
  { type: 'ai_image_video', name: 'AI图文成片', icon: '🤖', desc: 'AI全流程：脚本+配图+配音' },
]

const INDUSTRIES = ['B2B工业', '本地生活', '医疗健康', '教育培训', '户外运动', '电商', '3C数码', '金融', '餐饮', '旅游', '美妆', '母婴', '汽车', '其他']

const TTS_VOICES = [
  { id: 'zh_female_qingxin', name: '小清新', gender: 'female', style: '清新自然' },
  { id: 'zh_female_zhiyin', name: '知音', gender: 'female', style: '温柔甜美' },
  { id: 'zh_male_chenshui', name: '沉稳', gender: 'male', style: '沉稳大气' },
  { id: 'zh_male_yangguang', name: '阳光', gender: 'male', style: '阳光活力' },
  { id: 'zh_female_ganxing', name: '感性', gender: 'female', style: '感性深情' },
  { id: 'zh_male_boyin', name: '播音', gender: 'male', style: '专业播音' },
]

const BGM_LIST = [
  { id: 'bgm_upbeat', name: '活力节拍', mood: '欢快' },
  { id: 'bgm_calm', name: '宁静致远', mood: '舒缓' },
  { id: 'bgm_epic', name: '磅礴大气', mood: '激昂' },
  { id: 'bgm_warm', name: '温暖时光', mood: '温馨' },
  { id: 'bgm_tech', name: '科技未来', mood: '科技感' },
  { id: 'bgm_nature', name: '自然之声', mood: '自然' },
]

const VIDEO_TEMPLATES = [
  { id: 'tpl_product', name: '产品展示模板' },
  { id: 'tpl_tutorial', name: '教程讲解模板' },
  { id: 'tpl_story', name: '品牌故事模板' },
  { id: 'tpl_comparison', name: '对比评测模板' },
  { id: 'tpl_news', name: '资讯播报模板' },
]

const TARGET_PLATFORMS = [
  { value: 'douyin', label: '抖音' },
  { value: 'wechat_video', label: '视频号' },
  { value: 'kuaishou', label: '快手' },
  { value: 'bilibili', label: 'B站' },
  { value: 'xiaohongshu', label: '小红书' },
]

const TRANSITIONS = [
  { value: 'fade', label: '淡入淡出' },
  { value: 'slide', label: '滑动' },
  { value: 'zoom', label: '缩放' },
  { value: 'none', label: '无' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '4px',
  border: `1px solid ${BORDER}`, fontSize: '14px', color: TEXT_PRIMARY,
  outline: 'none', fontFamily: 'inherit', background: WHITE,
  transition: 'border-color 0.2s',
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '4px',
  border: `1px solid ${BORDER}`, fontSize: '14px', color: TEXT_PRIMARY,
  outline: 'none', background: WHITE, cursor: 'pointer', fontFamily: 'inherit',
}

function FormItem({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start' }}>
      <label style={{ width: '120px', flexShrink: 0, fontSize: '14px', color: TEXT_REGULAR, lineHeight: '32px', textAlign: 'right', paddingRight: '12px' }}>
        {required && <span style={{ color: RED, marginRight: '4px' }}>*</span>}
        {label}
      </label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

export default function VideoCreateView() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)

  const [form, setForm] = useState({
    type: 'text_to_video',
    title: '',
    brandName: '',
    industry: '',
    keywords: [] as string[],
    scriptText: '',
    scriptSource: 'manual_input',
    assetIds: [] as number[],
    perImageDuration: 5,
    transition: 'fade',
    topic: '',
    targetAudience: '',
    duration: 60,
    ttsVoice: 'zh_female_qingxin',
    ttsSpeedSlider: 100,
    bgmId: '',
    bgmVolume: 30,
    templateId: '',
    targetPlatforms: [] as string[],
    watermarkEnabled: true,
  })

  const [kwVisible, setKwVisible] = useState(false)
  const [kwInput, setKwInput] = useState('')

  function updateForm(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function addKw() {
    if (kwInput && !form.keywords.includes(kwInput)) {
      updateForm('keywords', [...form.keywords, kwInput])
    }
    setKwVisible(false)
    setKwInput('')
  }

  function removeKw(idx: number) {
    updateForm('keywords', form.keywords.filter((_, i) => i !== idx))
  }

  function togglePlatform(value: string) {
    if (form.targetPlatforms.includes(value)) {
      updateForm('targetPlatforms', form.targetPlatforms.filter(p => p !== value))
    } else {
      updateForm('targetPlatforms', [...form.targetPlatforms, value])
    }
  }

  async function handleCreate() {
    if (!form.brandName || !form.industry) {
      alert('请填写品牌名和行业')
      return
    }
    setGenerating(true)
    setStep(3)
    setProgress(0)
    setProgressMsg('正在创建项目...')

    try {
      const res = await videoApi.create({
        title: form.title || `${form.brandName}视频`,
        tags: form.keywords,
        duration: form.duration,
        metadata: {
          type: form.type,
          brandName: form.brandName,
          industry: form.industry,
          scriptText: form.scriptText,
          scriptSource: form.scriptSource,
          assetIds: form.assetIds,
          perImageDuration: form.perImageDuration,
          transition: form.transition,
          topic: form.topic,
          targetAudience: form.targetAudience,
          ttsVoice: form.ttsVoice,
          ttsSpeed: form.ttsSpeedSlider / 100,
          bgmId: form.bgmId,
          bgmVolume: form.bgmVolume,
          templateId: form.templateId,
          targetPlatforms: form.targetPlatforms,
          watermarkEnabled: form.watermarkEnabled,
        },
      })
      const id = (res as any)?.id || 'temp'
      setProjectId(id)

      setProgressMsg('正在启动AI生成...')
      setProgress(10)

      const pollTimer = setInterval(() => {
        setProgress(prev => {
          const next = Math.min(prev + 8, 95)
          if (next >= 30 && next < 50) setProgressMsg('AI正在生成脚本...')
          else if (next >= 50 && next < 70) setProgressMsg('AI正在匹配素材...')
          else if (next >= 70 && next < 90) setProgressMsg('AI正在合成视频...')
          else if (next >= 90) setProgressMsg('即将完成...')
          return next
        })
      }, 2000)

      setTimeout(() => {
        clearInterval(pollTimer)
        setProgress(100)
        setProgressMsg('视频生成完成')
        setGenerating(false)
      }, 12000)
    } catch {
      setGenerating(false)
      alert('创建失败')
    }
  }

  function resetForm() {
    setStep(0)
    setGenerating(false)
    setProgress(0)
    setProjectId(null)
  }

  return (
    <div style={{ padding: '20px', background: BG_LIGHT, minHeight: '100%' }}>
      <div style={{ background: WHITE, borderRadius: '8px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: TEXT_PRIMARY, marginBottom: '24px' }}>创建短视频</h2>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          {STEP_TITLES.map((title, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '50%', fontSize: '13px', fontWeight: 500,
                background: i < step ? GREEN : i === step ? BLUE : '#E4E7ED',
                color: i <= step ? WHITE : TEXT_SECONDARY,
                transition: 'all 0.2s',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{
                marginLeft: '6px', fontSize: '13px',
                fontWeight: i === step ? 500 : 400,
                color: i === step ? TEXT_PRIMARY : TEXT_SECONDARY,
              }}>
                {title}
              </span>
              {i < STEP_TITLES.length - 1 && (
                <div style={{ width: '40px', height: '1px', background: '#E4E7ED', margin: '0 12px' }} />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {VIDEO_METHODS.map(m => (
                <div
                  key={m.type}
                  onClick={() => updateForm('type', m.type)}
                  style={{
                    textAlign: 'center', padding: '24px 12px',
                    background: form.type === m.type ? '#ECF5FF' : BG_LIGHT,
                    borderRadius: '8px', cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: `2px solid ${form.type === m.type ? BLUE : 'transparent'}`,
                  }}
                  onMouseEnter={(e) => { if (form.type !== m.type) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
                >
                  <div style={{ fontSize: '32px' }}>{m.icon}</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '8px', color: TEXT_PRIMARY }}>{m.name}</div>
                  <div style={{ fontSize: '12px', color: TEXT_SECONDARY, marginTop: '4px' }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ maxWidth: '700px' }}>
            <FormItem label="品牌名" required>
              <input
                type="text"
                value={form.brandName}
                onChange={e => updateForm('brandName', e.target.value)}
                placeholder="输入品牌名"
                style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = BLUE}
                onBlur={(e) => e.currentTarget.style.borderColor = BORDER}
              />
            </FormItem>
            <FormItem label="行业" required>
              <select
                value={form.industry}
                onChange={e => updateForm('industry', e.target.value)}
                style={selectStyle}
              >
                <option value="">请选择行业</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </FormItem>

            {form.type === 'text_to_video' && (
              <>
                <FormItem label="文案来源">
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {[
                      { value: 'manual_input', label: '手动输入' },
                      { value: 'content_engine', label: '从内容引擎选择' },
                    ].map(r => (
                      <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: TEXT_REGULAR }}>
                        <input
                          type="radio"
                          name="scriptSource"
                          value={r.value}
                          checked={form.scriptSource === r.value}
                          onChange={e => updateForm('scriptSource', e.target.value)}
                          style={{ accentColor: BLUE }}
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                </FormItem>
                {form.scriptSource === 'manual_input' && (
                  <FormItem label="文案内容">
                    <textarea
                      value={form.scriptText}
                      onChange={e => updateForm('scriptText', e.target.value)}
                      rows={8}
                      placeholder="输入500-5000字文案"
                      style={{ ...inputStyle, resize: 'vertical' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = BLUE}
                      onBlur={(e) => e.currentTarget.style.borderColor = BORDER}
                    />
                  </FormItem>
                )}
              </>
            )}

            {form.type === 'image_to_video' && (
              <>
                <FormItem label="选择图片">
                  <div>
                    <button
                      type="button"
                      style={{
                        padding: '8px 16px', borderRadius: '4px',
                        border: `1px solid ${BORDER}`, background: WHITE,
                        color: TEXT_REGULAR, fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      从素材库选择
                    </button>
                    {form.assetIds.length > 0 && (
                      <span style={{ marginLeft: '8px', fontSize: '13px', color: TEXT_SECONDARY }}>
                        已选 {form.assetIds.length} 张图片
                      </span>
                    )}
                  </div>
                </FormItem>
                <FormItem label="每张时长">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={form.perImageDuration}
                      onChange={e => updateForm('perImageDuration', Number(e.target.value))}
                      min={3} max={15}
                      style={{ ...inputStyle, width: '120px' }}
                    />
                    <span style={{ fontSize: '14px', color: TEXT_REGULAR }}>秒</span>
                  </div>
                </FormItem>
                <FormItem label="转场效果">
                  <select
                    value={form.transition}
                    onChange={e => updateForm('transition', e.target.value)}
                    style={selectStyle}
                  >
                    {TRANSITIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </FormItem>
              </>
            )}

            {form.type === 'video_mashup' && (
              <FormItem label="选择视频">
                <div>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px', borderRadius: '4px',
                      border: `1px solid ${BORDER}`, background: WHITE,
                      color: TEXT_REGULAR, fontSize: '14px', cursor: 'pointer',
                    }}
                  >
                    从素材库选择
                  </button>
                  {form.assetIds.length > 0 && (
                    <span style={{ marginLeft: '8px', fontSize: '13px', color: TEXT_SECONDARY }}>
                      已选 {form.assetIds.length} 段视频
                    </span>
                  )}
                </div>
              </FormItem>
            )}

            {form.type === 'ai_image_video' && (
              <>
                <FormItem label="视频主题" required>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={e => updateForm('topic', e.target.value)}
                    placeholder="如：冲锋衣怎么选"
                    style={inputStyle}
                    onFocus={(e) => e.currentTarget.style.borderColor = BLUE}
                    onBlur={(e) => e.currentTarget.style.borderColor = BORDER}
                  />
                </FormItem>
                <FormItem label="目标人群">
                  <input
                    type="text"
                    value={form.targetAudience}
                    onChange={e => updateForm('targetAudience', e.target.value)}
                    placeholder="如：户外爱好者"
                    style={inputStyle}
                    onFocus={(e) => e.currentTarget.style.borderColor = BLUE}
                    onBlur={(e) => e.currentTarget.style.borderColor = BORDER}
                  />
                </FormItem>
                <FormItem label="目标时长">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={form.duration}
                      onChange={e => updateForm('duration', Number(e.target.value))}
                      min={30} max={180}
                      style={{ ...inputStyle, width: '120px' }}
                    />
                    <span style={{ fontSize: '14px', color: TEXT_REGULAR }}>秒</span>
                  </div>
                </FormItem>
              </>
            )}

            <FormItem label="关键词">
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                {form.keywords.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 8px', borderRadius: '4px',
                      background: '#ECF5FF', color: BLUE, fontSize: '13px',
                      border: `1px solid ${BLUE}33`,
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => removeKw(idx)}
                      style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {kwVisible ? (
                  <input
                    type="text"
                    value={kwInput}
                    onChange={e => setKwInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKw() } }}
                    onBlur={addKw}
                    placeholder="输入关键词"
                    autoFocus
                    style={{ width: '100px', padding: '2px 8px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '4px', outline: 'none' }}
                  />
                ) : (
                  <button
                    onClick={() => setKwVisible(true)}
                    style={{ padding: '2px 8px', fontSize: '13px', border: `1px solid ${BORDER}`, borderRadius: '4px', background: WHITE, color: TEXT_REGULAR, cursor: 'pointer' }}
                  >
                    + 添加
                  </button>
                )}
              </div>
            </FormItem>
          </div>
        )}

        {step === 2 && (
          <div style={{ maxWidth: '700px' }}>
            <FormItem label="配音音色">
              <select
                value={form.ttsVoice}
                onChange={e => updateForm('ttsVoice', e.target.value)}
                style={selectStyle}
              >
                {TTS_VOICES.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.gender === 'female' ? '女' : '男'}·{v.style})
                  </option>
                ))}
              </select>
            </FormItem>
            <FormItem label="语速">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min={80} max={150} step={5}
                  value={form.ttsSpeedSlider}
                  onChange={e => updateForm('ttsSpeedSlider', Number(e.target.value))}
                  style={{ flex: 1, accentColor: BLUE }}
                />
                <span style={{ fontSize: '14px', color: TEXT_REGULAR, minWidth: '40px' }}>
                  {(form.ttsSpeedSlider / 100).toFixed(1)}x
                </span>
              </div>
            </FormItem>
            <FormItem label="BGM">
              <select
                value={form.bgmId}
                onChange={e => updateForm('bgmId', e.target.value)}
                style={selectStyle}
              >
                <option value="">选择背景音乐</option>
                {BGM_LIST.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.mood})</option>
                ))}
              </select>
            </FormItem>
            <FormItem label="BGM音量">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min={0} max={100}
                  value={form.bgmVolume}
                  onChange={e => updateForm('bgmVolume', Number(e.target.value))}
                  style={{ flex: 1, accentColor: BLUE }}
                />
                <span style={{ fontSize: '14px', color: TEXT_REGULAR, minWidth: '40px' }}>{form.bgmVolume}%</span>
              </div>
            </FormItem>
            <FormItem label="视频模板">
              <select
                value={form.templateId}
                onChange={e => updateForm('templateId', e.target.value)}
                style={selectStyle}
              >
                <option value="">选择视频模板</option>
                {VIDEO_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </FormItem>
            <FormItem label="目标平台">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {TARGET_PLATFORMS.map(p => (
                  <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: TEXT_REGULAR }}>
                    <input
                      type="checkbox"
                      checked={form.targetPlatforms.includes(p.value)}
                      onChange={() => togglePlatform(p.value)}
                      style={{ accentColor: BLUE }}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </FormItem>
            <FormItem label="水印">
              <button
                onClick={() => updateForm('watermarkEnabled', !form.watermarkEnabled)}
                style={{
                  position: 'relative', width: '40px', height: '22px', borderRadius: '11px',
                  background: form.watermarkEnabled ? BLUE : '#D2D2D7',
                  border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: '2px', width: '18px', height: '18px',
                  borderRadius: '50%', background: WHITE, boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  left: form.watermarkEnabled ? '20px' : '2px', transition: 'left 0.2s',
                }} />
              </button>
            </FormItem>
          </div>
        )}

        {step === 3 && (
          <div>
            {generating ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '40px', height: '40px',
                  border: '3px solid rgba(64,158,255,0.2)', borderTopColor: BLUE,
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 16px',
                }} />
                <p style={{ color: TEXT_REGULAR, fontSize: '14px', marginBottom: '20px' }}>视频生成中，预计1-3分钟...</p>
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                  <div style={{
                    height: '20px', borderRadius: '10px', background: '#E4E7ED', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '10px',
                      background: `linear-gradient(90deg, ${BLUE}, #79BBFF)`,
                      width: `${progress}%`,
                      transition: 'width 0.5s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: WHITE, fontSize: '12px', fontWeight: 500,
                    }}>
                      {progress > 10 ? `${progress}%` : ''}
                    </div>
                  </div>
                </div>
                <p style={{ color: TEXT_SECONDARY, fontSize: '13px', marginTop: '12px' }}>{progressMsg}</p>
              </div>
            ) : projectId ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'rgba(103,194,58,0.08)', border: '1px solid rgba(103,194,58,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <span style={{ fontSize: '28px', color: GREEN }}>✓</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: TEXT_PRIMARY, marginBottom: '8px' }}>视频创建成功</h3>
                <p style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '24px' }}>视频项目已创建，可以查看进度或继续操作</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => navigate(`/geo/video/${projectId}`)}
                    style={{
                      padding: '10px 24px', fontSize: '14px', borderRadius: '4px',
                      border: 'none', color: WHITE, background: BLUE,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    查看视频
                  </button>
                  <button
                    onClick={resetForm}
                    style={{
                      padding: '10px 24px', fontSize: '14px', borderRadius: '4px',
                      border: `1px solid ${BORDER}`, color: TEXT_REGULAR, background: WHITE,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    继续创建
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {step < 3 && (
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  padding: '8px 20px', fontSize: '14px', borderRadius: '4px',
                  border: `1px solid ${BORDER}`, color: TEXT_REGULAR, background: WHITE,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                上一步
              </button>
            )}
            <button
              onClick={() => {
                if (step < 2) setStep(s => s + 1)
                else handleCreate()
              }}
              style={{
                padding: '8px 20px', fontSize: '14px', borderRadius: '4px',
                border: 'none', color: WHITE, background: BLUE,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {step < 2 ? '下一步' : '开始生成'}
            </button>
          </div>
        )}
      </div>
      <GuideTabs />
    </div>
  )
}
