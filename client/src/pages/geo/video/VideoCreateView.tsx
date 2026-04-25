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

const STEP_TITLES = ['视频类型', '脚本内容', '发布设置', '生成']

export default function VideoCreateView() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [generatedVideo, setGeneratedVideo] = useState<any>(null)
  const [form, setForm] = useState({
    type: 'knowledge',  // 'knowledge' | 'showcase' | 'story'
    title: '',
    script: '',
    tags: [] as string[],
    duration: 60,
    aspectRatio: '9:16',  // '9:16' | '16:9' | '1:1'
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
      const video = await videoApi.create({
        title: form.title || '未命名视频',
        script: form.script,
        tags: form.tags,
        duration: form.duration,
        aspectRatio: form.aspectRatio,
        status: 'draft',
      })
      setGeneratedVideo(video)
      setStep(3)
    } catch {
      setGeneratedVideo({ id: 'temp', title: form.title, status: 'draft' })
      setStep(3)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">创建短视频</h1>
          <p className="text-sm text-slate-500 mt-1">多平台短视频创作与发布</p>
        </div>
        <button
          onClick={() => navigate('/geo/video')}
          className="px-4 py-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
        >
          返回列表
        </button>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_TITLES.map((title, i) => (
          <div key={i} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all
              ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-500 text-white' : 'bg-white/10 text-slate-500'}
            `}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i === step ? 'text-white font-medium' : 'text-slate-500'}`}>
              {title}
            </span>
            {i < STEP_TITLES.length - 1 && <div className="w-8 h-px bg-white/10 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 0: 视频类型 */}
      {step === 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">选择视频类型</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'knowledge', label: '📚 知识讲解', desc: '产品知识、使用教程、行业干货' },
                { value: 'showcase', label: '🎬 产品展示', desc: '产品功能演示、开箱体验' },
                { value: 'story', label: '📖 品牌故事', desc: '品牌理念、文化内涵、用户案例' },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => updateForm('type', t.value)}
                  className={`p-4 rounded-xl text-left transition-all ${
                    form.type === t.value
                      ? 'bg-blue-500/10 border border-blue-500/30 text-white'
                      : 'bg-white/[0.02] border border-white/5 text-gray-300 hover:bg-white/[0.04] hover:border-white/10'
                  }`}
                >
                  <div className="text-base font-medium mb-1">{t.label}</div>
                  <div className="text-xs text-slate-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: 脚本内容 */}
      {step === 1 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">视频标题</label>
            <input
              type="text"
              value={form.title}
              onChange={e => updateForm('title', e.target.value)}
              placeholder="给视频起个吸引人的标题"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                         placeholder-slate-600
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">视频脚本</label>
            <textarea
              value={form.script}
              onChange={e => updateForm('script', e.target.value)}
              rows={8}
              placeholder="输入视频脚本内容，支持多段落..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                         placeholder-slate-600 resize-none
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">视频标签</label>
            <input
              type="text"
              value={form.tags.join(', ')}
              onChange={e => updateForm('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              placeholder="用逗号分隔，如：户外，冲锋衣，防水"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                         placeholder-slate-600
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all"
            />
          </div>
        </div>
      )}

      {/* Step 2: 发布设置 */}
      {step === 2 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">视频时长（秒）</label>
              <input
                type="number"
                value={form.duration}
                onChange={e => updateForm('duration', Number(e.target.value))}
                min={15}
                max={300}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                           focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                           transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">画面比例</label>
              <select
                value={form.aspectRatio}
                onChange={e => updateForm('aspectRatio', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                           focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                           transition-all"
              >
                <option value="9:16">竖屏 9:16（抖音/小红书）</option>
                <option value="16:9">横屏 16:9（B站/网站）</option>
                <option value="1:1">方形 1:1（朋友圈）</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">发布平台</label>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'douyin', label: '🎵 抖音' },
                { value: 'xiaohongshu', label: '📕 小红书' },
                { value: 'bilibili', label: '📺 B站' },
                { value: 'wechat', label: '💬 微信视频号' },
              ].map(p => (
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
                    className="w-4 h-4 rounded border-white/20 text-blue-400 bg-white/5 focus:ring-blue-500/50"
                  />
                  <span className="text-sm text-gray-300">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => updateForm('autoPublish', !form.autoPublish)}
              className={`relative w-10 h-5 rounded-full transition-all ${form.autoPublish ? 'bg-blue-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.autoPublish ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            <span className="text-sm text-gray-300">定时自动发布</span>
          </div>

          {form.autoPublish && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">发布时间</label>
              <input
                type="datetime-local"
                value={form.publishTime}
                onChange={e => updateForm('publishTime', e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                           focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                           transition-all"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3: 生成结果 */}
      {step === 3 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-500">视频生成中，请稍候...</p>
            </div>
          ) : generatedVideo ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">视频已创建</h3>
              <p className="text-sm text-slate-500 mb-6">视频已存入草稿箱，可前往编辑和发布</p>
              <div className="bg-white/[0.02] rounded-xl p-4 text-left max-w-md mx-auto mb-6 border border-white/5">
                <div className="text-sm text-gray-300 mb-1">标题：{generatedVideo.title}</div>
                <div className="text-xs text-slate-500">类型：{form.type} | 时长：{form.duration}s</div>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate('/geo/video')}
                  className="px-6 py-2.5 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  返回列表
                </button>
                <button
                  onClick={() => navigate(`/geo/video/${generatedVideo.id}`)}
                  className="px-6 py-2.5 text-sm text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-all"
                >
                  编辑视频
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-6 py-2.5 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-xl
                     hover:bg-white/10 hover:border-white/20
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          上一步
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="px-6 py-2.5 text-sm text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-all"
          >
            下一步
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 text-sm text-white bg-emerald-500 rounded-xl hover:bg-emerald-600
                       disabled:opacity-60 transition-all"
          >
            {generating ? '生成中...' : '开始生成'}
          </button>
        )}
      </div>
    </div>
  )
}
