/**
 * 创建短视频 - 多步骤向导
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { videoApi } from '../../../services/geoApi'
import GuideTabs from '../../../components/ui/GuideTabs'

const APPLE_BLUE = '#007AFF'
const APPLE_GREEN = '#34C759'
const GRAY_900 = '#1C1C1E'
const GRAY_600 = '#636366'
const GRAY_500 = '#8E8E93'
const GRAY_200 = '#E8E8ED'
const WHITE = '#FFFFFF'

const STEP_TITLES = ['视频类型', '脚本内容', '发布设置', '生成']

export default function VideoCreateView() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [generatedVideo, setGeneratedVideo] = useState<any>(null)
  const [form, setForm] = useState({
    type: 'knowledge',
    title: '',
    script: '',
    tags: [] as string[],
    duration: 60,
    aspectRatio: '9:16',
    publishTime: '',
    platforms: [] as string[],
    autoPublish: false,
  })

  function updateForm(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const video = await videoApi.create({ title: form.title || '未命名视频', tags: form.tags, duration: form.duration })
      setGeneratedVideo(video)
      setStep(3)
    } catch {
      setGeneratedVideo({ id: 'temp', title: form.title, status: 'draft' })
      setStep(3)
    } finally {
      setGenerating(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: WHITE,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.04)'
  }

  return (
    <div style={{ padding: '24px', background: '#F5F5F7', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: GRAY_900, margin: 0 }}>创建短视频</h3>
          <p style={{ fontSize: '13px', color: GRAY_500, margin: '2px 0 0 0' }}>多平台短视频创作与发布</p>
        </div>
        <button
          onClick={() => navigate('/geo/video')}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
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
              background: i < step ? APPLE_GREEN : i === step ? APPLE_BLUE : GRAY_200,
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

      {/* Step 0: 视频类型 */}
      {step === 0 && (
        <div style={cardStyle}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '12px' }}>选择视频类型</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { value: 'knowledge', label: '📚 知识讲解', desc: '产品知识、使用教程、行业干货' },
                { value: 'showcase', label: '🎬 产品展示', desc: '产品功能演示、开箱体验' },
                { value: 'story', label: '📖 品牌故事', desc: '品牌理念、文化内涵、用户案例' },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => updateForm('type', t.value)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    textAlign: 'left',
                    border: `1px solid ${form.type === t.value ? APPLE_BLUE : GRAY_200}`,
                    background: form.type === t.value ? 'rgba(0,122,255,0.06)' : WHITE,
                    color: form.type === t.value ? APPLE_BLUE : GRAY_600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>{t.label}</div>
                  <div style={{ fontSize: '13px', color: GRAY_500 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: 脚本内容 */}
      {step === 1 && (
        <div style={cardStyle}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>视频标题</label>
            <input
              type="text"
              value={form.title}
              onChange={e => updateForm('title', e.target.value)}
              placeholder="给视频起个吸引人的标题"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: `1px solid ${GRAY_200}`, fontSize: '14px', color: GRAY_900,
                outline: 'none', fontFamily: 'inherit', background: WHITE,
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>视频脚本</label>
            <textarea
              value={form.script}
              onChange={e => updateForm('script', e.target.value)}
              rows={8}
              placeholder="输入视频脚本内容，支持多段落..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: `1px solid ${GRAY_200}`, fontSize: '14px', color: GRAY_900,
                outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: WHITE,
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>视频标签</label>
            <input
              type="text"
              value={form.tags.join(', ')}
              onChange={e => updateForm('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              placeholder="用逗号分隔，如：户外，冲锋衣，防水"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: `1px solid ${GRAY_200}`, fontSize: '14px', color: GRAY_900,
                outline: 'none', fontFamily: 'inherit', background: WHITE,
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
            />
          </div>
        </div>
      )}

      {/* Step 2: 发布设置 */}
      {step === 2 && (
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>视频时长（秒）</label>
              <input
                type="number"
                value={form.duration}
                onChange={e => updateForm('duration', Number(e.target.value))}
                min={15} max={300}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  border: `1px solid ${GRAY_200}`, fontSize: '14px', color: GRAY_900,
                  outline: 'none', fontFamily: 'inherit', background: WHITE,
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>画面比例</label>
              <select
                value={form.aspectRatio}
                onChange={e => updateForm('aspectRatio', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  border: `1px solid ${GRAY_200}`, fontSize: '14px', color: GRAY_900,
                  outline: 'none', background: WHITE, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
              >
                <option value="9:16">竖屏 9:16（抖音/小红书）</option>
                <option value="16:9">横屏 16:9（B站/网站）</option>
                <option value="1:1">方形 1:1（朋友圈）</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '12px' }}>发布平台</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {[
                { value: 'douyin', label: '🎵 抖音' },
                { value: 'xiaohongshu', label: '📕 小红书' },
                { value: 'bilibili', label: '📺 B站' },
                { value: 'wechat', label: '💬 微信视频号' },
              ].map(p => (
                <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.platforms.includes(p.value)}
                    onChange={e => {
                      if (e.target.checked) updateForm('platforms', [...form.platforms, p.value])
                      else updateForm('platforms', form.platforms.filter(x => x !== p.value))
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: APPLE_BLUE }}
                  />
                  <span style={{ fontSize: '14px', color: GRAY_600 }}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => updateForm('autoPublish', !form.autoPublish)}
              style={{
                position: 'relative', width: '40px', height: '22px', borderRadius: '11px',
                background: form.autoPublish ? APPLE_BLUE : '#D2D2D7',
                border: 'none', cursor: 'pointer', transition: 'background 0.2s'
              }}
            >
              <div style={{
                position: 'absolute', top: '2px', width: '18px', height: '18px',
                borderRadius: '50%', background: WHITE, boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                left: form.autoPublish ? '20px' : '2px', transition: 'left 0.2s'
              }} />
            </button>
            <span style={{ fontSize: '14px', color: GRAY_600 }}>定时自动发布</span>
          </div>

          {form.autoPublish && (
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>发布时间</label>
              <input
                type="datetime-local"
                value={form.publishTime}
                onChange={e => updateForm('publishTime', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  border: `1px solid ${GRAY_200}`, fontSize: '14px', color: GRAY_900,
                  outline: 'none', fontFamily: 'inherit', background: WHITE,
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => { e.target.style.borderColor = APPLE_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = GRAY_200; e.target.style.boxShadow = 'none' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3: 生成结果 */}
      {step === 3 && (
        <div style={cardStyle}>
          {generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
              <div style={{
                width: '48px', height: '48px',
                border: '4px solid rgba(0,122,255,0.15)', borderTopColor: APPLE_BLUE,
                borderRadius: '50%', animation: 'apple-spin 0.8s linear infinite', marginBottom: '16px'
              }} />
              <p style={{ color: GRAY_500, fontSize: '14px' }}>视频生成中，请稍候...</p>
            </div>
          ) : generatedVideo ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <span style={{ fontSize: '28px', color: APPLE_GREEN }}>✓</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: GRAY_900, marginBottom: '8px' }}>视频已创建</h3>
              <p style={{ fontSize: '14px', color: GRAY_500, marginBottom: '24px' }}>视频已存入草稿箱，可前往编辑和发布</p>
              <div style={{
                background: '#FAFAFA', borderRadius: '10px',
                padding: '16px', textAlign: 'left', maxWidth: '400px',
                margin: '0 auto 24px', border: `1px solid ${GRAY_200}`
              }}>
                <div style={{ fontSize: '14px', color: GRAY_600, marginBottom: '4px' }}>标题：{generatedVideo.title}</div>
                <div style={{ fontSize: '13px', color: GRAY_500 }}>类型：{form.type} | 时长：{form.duration}s</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => navigate('/geo/video')} style={{
                  padding: '10px 24px', fontSize: '14px', borderRadius: '8px',
                  border: `1px solid ${GRAY_200}`, color: GRAY_600, background: WHITE,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease'
                }}>返回列表</button>
                <button onClick={() => navigate(`/geo/video/${generatedVideo.id}`)} style={{
                  padding: '10px 24px', fontSize: '14px', borderRadius: '8px',
                  border: 'none', color: WHITE, background: APPLE_BLUE,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease'
                }}>编辑视频</button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{
            padding: '10px 24px', fontSize: '14px', borderRadius: '8px',
            border: `1px solid ${GRAY_200}`, color: GRAY_600, background: WHITE,
            cursor: step === 0 ? 'not-allowed' : 'pointer',
            opacity: step === 0 ? 0.4 : 1, fontFamily: 'inherit', transition: 'all 0.2s ease'
          }}
        >上一步</button>

        {step < 3 ? (
          <button onClick={() => setStep(s => s + 1)} style={{
            padding: '10px 24px', fontSize: '14px', borderRadius: '8px',
            border: 'none', color: WHITE, background: APPLE_BLUE,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease'
          }}>下一步</button>
        ) : (
          <button onClick={handleGenerate} disabled={generating} style={{
            padding: '10px 24px', fontSize: '14px', borderRadius: '8px',
            border: 'none', color: WHITE, background: APPLE_GREEN,
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1, fontFamily: 'inherit', transition: 'all 0.2s ease'
          }}>{generating ? '生成中...' : '开始生成'}</button>
        )}
      </div>
      <GuideTabs />
    </div>
  )
}
