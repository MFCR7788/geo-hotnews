import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, Target, Lightbulb, AlertTriangle, ChevronRight } from 'lucide-react'
import { guideDataMap } from './guideDataMap'

const APPLE_BLUE = '#007AFF'
const APPLE_GREEN = '#34C759'
const APPLE_ORANGE = '#FF9500'
const GRAY_900 = '#1C1C1E'
const GRAY_600 = '#636366'
const GRAY_500 = '#8E8E93'
const GRAY_200 = '#E8E8ED'
const GRAY_100 = '#F5F5F7'
const WHITE = '#FFFFFF'

export interface Scenario {
  title: string
  desc: string
}

export interface Step {
  title: string
  description: string
  points?: string[]
}

export interface GuideData {
  title: string
  description: string
  features?: string[]
  scenarios?: Scenario[]
  steps?: Step[]
  notes?: string[]
}

type TabKey = 'description' | 'guide'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'description', label: '功能说明' },
  { key: 'guide', label: '操作方法' },
]

export default function GuideTabs({ overrideData }: { overrideData?: GuideData }) {
  const [activeTab, setActiveTab] = useState<TabKey>('description')
  const location = useLocation()

  let guideData: GuideData | null = overrideData || null

  if (!guideData) {
    for (const key of Object.keys(guideDataMap)) {
      if (location.pathname.startsWith(key)) {
        guideData = guideDataMap[key]
        break
      }
    }
    if (!guideData) {
      return null
    }
  }

  const hasContent =
    (guideData.features && guideData.features.length > 0) ||
    (guideData.scenarios && guideData.scenarios.length > 0) ||
    (guideData.steps && guideData.steps.length > 0) ||
    (guideData.notes && guideData.notes.length > 0)

  if (!hasContent) return null

  return (
    <div style={{
      marginTop: '24px',
      padding: '24px',
      background: WHITE,
      borderRadius: '16px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      border: '1px solid rgba(0,0,0,0.04)'
    }}>
      {/* Tab Headers */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${GRAY_200}`,
        gap: '4px'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? APPLE_BLUE : GRAY_500,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${APPLE_BLUE}` : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '20px 0' }}>
        {/* ===== 功能说明 Tab ===== */}
        {activeTab === 'description' && (
          <>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: GRAY_900, marginBottom: '10px' }}>
              {guideData.title}
            </h3>
            <p style={{ fontSize: '14px', color: GRAY_600, lineHeight: 1.7, marginBottom: '24px' }}>
              {guideData.description}
            </p>

            {/* 核心特性 */}
            {guideData.features && guideData.features.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{
                  fontSize: '15px', fontWeight: 600, color: GRAY_900,
                  marginBottom: '14px', paddingLeft: '10px',
                  borderLeft: `3px solid ${APPLE_BLUE}`
                }}>核心特性</h4>
                <ul style={{
                  listStyle: 'none', padding: 0, margin: 0,
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px'
                }}>
                  {guideData.features.map((feature, i) => (
                    <li key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 16px',
                      background: 'rgba(52,199,89,0.08)',
                      borderRadius: '10px',
                      border: '1px solid rgba(52,199,89,0.18)',
                      transition: 'all 0.2s ease',
                      color: GRAY_900, fontSize: '14px'
                    }}>
                      <Check size={16} strokeWidth={2.5} style={{ color: APPLE_GREEN, flexShrink: 0 }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 适用场景 */}
            {guideData.scenarios && guideData.scenarios.length > 0 && (
              <div>
                <h4 style={{
                  fontSize: '15px', fontWeight: 600, color: GRAY_900,
                  marginBottom: '14px', paddingLeft: '10px',
                  borderLeft: `3px solid ${APPLE_BLUE}`
                }}>适用场景</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '16px'
                }}>
                  {guideData.scenarios.map((scenario, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: '14px', padding: '18px',
                      background: 'rgba(0,122,255,0.06)',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,122,255,0.12)',
                      transition: 'all 0.2s ease'
                    }}>
                      <Target size={22} style={{ color: APPLE_BLUE, flexShrink: 0 }} />
                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: 600, color: GRAY_900, margin: '0 0 4px 0' }}>{scenario.title}</h5>
                        <p style={{ fontSize: '13px', color: APPLE_BLUE, margin: 0, lineHeight: 1.5 }}>{scenario.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== 操作方法 Tab ===== */}
        {activeTab === 'guide' && (
          <>
            {/* 操作步骤 */}
            {guideData.steps && guideData.steps.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                {guideData.steps.map((step, index) => (
                  <div key={index} style={{
                    display: 'flex', gap: '18px',
                    marginBottom: '24px', paddingBottom: '24px',
                    borderBottom: index < guideData.steps!.length - 1 ? `2px dashed ${GRAY_200}` : 'none'
                  }}>
                    <div style={{
                      width: '36px', height: '36px', minWidth: '36px',
                      background: `linear-gradient(135deg, ${APPLE_BLUE} 0%, #5856D6 100%)`,
                      color: WHITE, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700, flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(0,122,255,0.30)'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, paddingTop: '2px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 600, color: GRAY_900, margin: '0 0 8px 0' }}>
                        {step.title}
                      </h4>
                      <p style={{ fontSize: '14px', color: GRAY_600, lineHeight: 1.6, margin: '0 0 12px 0' }}>
                        {step.description}
                      </p>
                      {step.points && step.points.length > 0 && (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {step.points.map((point, pi) => (
                            <li key={pi} style={{
                              display: 'flex', alignItems: 'flex-start', gap: '8px',
                              fontSize: '13px', color: GRAY_500,
                              padding: '8px 12px',
                              background: 'rgba(255,149,0,0.08)',
                              borderRadius: '8px', lineHeight: 1.5
                            }}>
                              <Lightbulb size={13} style={{ color: APPLE_ORANGE, flexShrink: 0, marginTop: '2px' }} />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 注意事项 */}
            {guideData.notes && guideData.notes.length > 0 && (
              <div>
                <h4 style={{
                  fontSize: '15px', fontWeight: 600, color: GRAY_900,
                  marginBottom: '14px', paddingLeft: '10px',
                  borderLeft: `3px solid ${APPLE_ORANGE}`
                }}>注意事项</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {guideData.notes.map((note, i) => (
                    <li key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '14px 18px',
                      background: 'rgba(255,149,0,0.06)',
                      borderRadius: '10px',
                      borderLeft: `4px solid ${APPLE_ORANGE}`,
                      fontSize: '14px', color: '#92400E', lineHeight: 1.5
                    }}>
                      <AlertTriangle size={16} style={{ color: APPLE_ORANGE, flexShrink: 0, marginTop: '2px' }} />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
