/**
 * 创建短视频 - 多步骤向导
 * Step1: 选择视频类型
 * Step2: 输入内容
 * Step3: 配置参数
 * Step4: 生成
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { videoApi } from '../../../services/geoApi'
import PageHeader from '../../../components/ui/PageHeader'
import { INDUSTRIES } from '../../../lib/constants'
import TagInput from '../../../components/ui/TagInput'

const VIDEO_METHODS = [
  { type: 'script', icon: '📝', name: '脚本生成', desc: '输入脚本，AI生成配音+画面' },
  { type: 'text_to_video', icon: '🎬', name: '文案转视频', desc: '输入文案，AI自动生成视频' },
  { type: 'image_to_video', icon: '🖼️', name: '图片转视频', desc: '选择图片，AI生成动态效果' },
  { type: 'ai_generate', icon: '✨', name: 'AI图文成片', desc: '输入主题，AI全自动创作' },
]

const VOICE_OPTIONS = [
  { value: 'zh-CN male', label: '中文男声' },
  { value: 'zh-CN female', label: '中文女声' },
  { value: 'en-US male', label: '英文男声' },
  { value: 'en-US female', label: '英文女声' },
]

const STEP_TITLES = ['选择方式', '输入内容', '配置参数', '生成视频']

export default function VideoCreateView() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    type: 'script',
    brandName: '',
    industry: '',
    keywords: [] as string[],
    scriptText: '',
    topic: '',
    targetAudience: '',
    duration: 60,
    ttsVoice: 'zh-CN female',
    ttsSpeed: 1,
    transition: 'fade',
    perImageDuration: 5,
  })

  function updateForm(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function canProceed() {
    if (step === 0) return !!form.type
    if (step === 1) {
      if (form.type === 'script' || form.type === 'text_to_video') return form.brandName && form.industry && form.scriptText.length > 10
      if (form.type === 'ai_generate') return form.brandName && form.industry && form.topic
      return true
    }
    return true
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const metadata = {
        type: form.type,
        scriptText: form.scriptText,
        topic: form.topic,
        targetAudience: form.targetAudience,
        duration: form.duration,
        ttsVoice: form.ttsVoice,
        ttsSpeed: form.ttsSpeed,
        transition: form.transition,
        perImageDuration: form.perImageDuration,
      }
      await videoApi.create({
        title: `${form.brandName || '视频'}-${form.type}`,
        platform: 'local',
        tags: form.keywords,
        metadata,
      })
      navigate('/geo/video')
    } catch {
      // silent - stay on page
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="创建短视频" subtitle="AI智能视频创作" onBack={() => navigate('/geo/video')} />

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_TITLES.map((title, i) => (
          <div key={i} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
              i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i === step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{title}</span>
            {i < STEP_TITLES.length - 1 && <div className="w-8 h-px bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 0: 选择方式 */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VIDEO_METHODS.map(m => (
              <div
                key={m.type}
                onClick={() => updateForm('type', m.type)}
                className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${
                  form.type === m.type
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="text-3xl mb-2">{m.icon}</div>
                <div className="text-sm font-medium text-gray-800 mb-1">{m.name}</div>
                <div className="text-xs text-gray-400">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: 输入内容 */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">品牌名</label>
              <input
                value={form.brandName}
                onChange={e => updateForm('brandName', e.target.value)}
                placeholder="如：超人户外"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">行业</label>
              <select
                value={form.industry}
                onChange={e => updateForm('industry', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择行业</option>
                {INDUSTRIES.map((i: string) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {(form.type === 'script' || form.type === 'text_to_video') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文案内容 <span className="text-xs text-gray-400">（建议500字以上）</span>
              </label>
              <textarea
                value={form.scriptText}
                onChange={e => updateForm('scriptText', e.target.value)}
                rows={8}
                placeholder="输入视频文案内容..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="text-xs text-gray-400 mt-1">{form.scriptText.length} 字</div>
            </div>
          )}

          {form.type === 'ai_generate' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">视频主题</label>
                <input
                  value={form.topic}
                  onChange={e => updateForm('topic', e.target.value)}
                  placeholder="如：冲锋衣怎么选"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标人群</label>
                <input
                  value={form.targetAudience}
                  onChange={e => updateForm('targetAudience', e.target.value)}
                  placeholder="如：户外爱好者"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">关键词（辅助AI理解）</label>
            <TagInput
              tags={form.keywords}
              onChange={(tags: string[]) => updateForm('keywords', tags)}
              placeholder="输入关键词后按回车"
            />
          </div>
        </div>
      )}

      {/* Step 2: 配置参数 */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">配音声音</label>
              <select
                value={form.ttsVoice}
                onChange={e => updateForm('ttsVoice', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {VOICE_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                语速：{form.ttsSpeed}x
              </label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={form.ttsSpeed}
                onChange={e => updateForm('ttsSpeed', Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0.5x</span><span>2x</span>
              </div>
            </div>
          </div>

          {form.type === 'image_to_video' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  每张图片时长：{form.perImageDuration} 秒
                </label>
                <input
                  type="range"
                  min={3}
                  max={15}
                  step={1}
                  value={form.perImageDuration}
                  onChange={e => updateForm('perImageDuration', Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">转场效果</label>
                <select
                  value={form.transition}
                  onChange={e => updateForm('transition', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fade">淡入淡出</option>
                  <option value="slide">滑动</option>
                  <option value="zoom">缩放</option>
                  <option value="none">无</option>
                </select>
              </div>
            </>
          )}

          {form.type === 'ai_generate' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                目标时长：{form.duration} 秒
              </label>
              <input
                type="range"
                min={15}
                max={180}
                step={15}
                value={form.duration}
                onChange={e => updateForm('duration', Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>15秒</span><span>180秒</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: 生成 */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          {generating ? (
            <div className="text-center py-16">
              <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500">视频生成中，请稍候...</p>
              <p className="text-xs text-gray-400 mt-2">预计需要 1-3 分钟</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">准备就绪</h3>
              <p className="text-sm text-gray-500 mb-6">
                点击下方按钮开始生成视频，AI将自动完成创作
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
                <div className="text-xs text-gray-400 space-y-1">
                  <div>类型：{VIDEO_METHODS.find(m => m.type === form.type)?.name}</div>
                  <div>品牌：{form.brandName}</div>
                  <div>配音：{VOICE_OPTIONS.find(v => v.value === form.ttsVoice)?.label}</div>
                  {form.keywords.length > 0 && <div>关键词：{form.keywords.join('、')}</div>}
                </div>
              </div>
              <button
                onClick={handleGenerate}
                className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                开始生成
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
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
            {generating ? '生成中...' : '生成视频'}
          </button>
        )}
      </div>
    </div>
  )
}
