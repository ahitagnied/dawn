import { useState, useEffect, useMemo } from 'react'
import { useTranscriptions } from '../hooks/useTranscriptions'
import { useSettings } from '../hooks/useSettings'
import { SettingsIcon, CopyIcon } from '../components/icons'
import { getTheme } from '../utils/theme'

interface MainWindowProps {
  onOpenSettings?: () => void
}

export function MainWindow({ onOpenSettings }: MainWindowProps) {
  const { transcriptions } = useTranscriptions()
  const { settings } = useSettings()
  const theme = getTheme(settings.darkMode)

  const stats = useMemo(() => {
    return transcriptions.reduce(
      (acc, t) => {
        const wordsIn = Number.isFinite(t.wordsIn) ? t.wordsIn : Number(t.wordsIn) || 0
        const wordsOut = Number.isFinite(t.wordsOut) ? t.wordsOut : Number(t.wordsOut) || 0
        const duration = Number.isFinite(t.duration) ? t.duration : Number(t.duration) || 0

        acc.wordsIn += wordsIn
        acc.wordsOut += wordsOut
        acc.seconds += duration
        return acc
      },
      { wordsIn: 0, wordsOut: 0, seconds: 0 }
    )
  }, [transcriptions])

  const totalSecondsFormatted = stats.seconds.toFixed(2)
  const wpm = stats.seconds > 0 ? ((stats.wordsOut / stats.seconds) * 60) : 0
  const wpmFormatted = wpm.toFixed(2)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'good morning!'
    if (hour < 18) return 'good afternoon!'
    return 'good evening!'
  }

  const getDateLabel = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'TODAY'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'YESTERDAY'
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
    }
  }

  const groups = useMemo(() => {
    const sorted = [...transcriptions].sort((a, b) => b.timestamp - a.timestamp)

    const byLabel: Record<string, typeof transcriptions> = {}
    for (const t of sorted) {
      const label = getDateLabel(t.timestamp)
      ;(byLabel[label] ||= []).push(t)
    }
    return byLabel
  }, [transcriptions])

  const groupLabels = useMemo(() => Object.keys(groups), [groups])

  const [currentDateLabel, setCurrentDateLabel] = useState<string>(() => groupLabels[0] ?? '')

  useEffect(() => {
    if (!currentDateLabel && groupLabels[0]) {
      setCurrentDateLabel(groupLabels[0])
    }
  }, [groupLabels, currentDateLabel])

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      background: theme.background, 
      backdropFilter: 'blur(8px)',
      fontFamily: 'Calibri, sans-serif', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'relative',
    }}>
      <div style={{ 
        WebkitAppRegion: 'drag', 
        height: '52px', 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000 
      } as any} />

      <div style={{ 
        position: 'absolute',
        top: '100px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', gap: '35px', alignItems: 'center' }}>
          <div style={{ 
            fontSize: '25px', 
            color: theme.text, 
            margin: 0
          }}>
            {getGreeting()}
          </div>

          <div style={{ width: '1px', height: '40px', background: theme.border }}></div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '25px', fontWeight: 'normal', color: theme.text, marginBottom: '10px' }}>
                {stats.wordsIn.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: theme.textSecondary }}>words in</div>
            </div>
            
            <div style={{ fontSize: '10px', color: theme.border }}>·</div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '25px', fontWeight: 'normal', color: theme.text, marginBottom: '10px' }}>
                {stats.wordsOut.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: theme.textSecondary }}>words out</div>
            </div>
            
            <div style={{ fontSize: '10px', color: theme.border }}>·</div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '25px', fontWeight: 'normal', color: theme.text, marginBottom: '10px' }}>
                {totalSecondsFormatted}
              </div>
              <div style={{ fontSize: '12px', color: theme.textSecondary }}>seconds</div>
            </div>
            
            <div style={{ fontSize: '10px', color: theme.border }}>·</div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '25px', fontWeight: 'normal', color: theme.text, marginBottom: '10px' }}>
                {wpmFormatted}
              </div>
              <div style={{ fontSize: '12px', color: theme.textSecondary }}>wpm</div>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ 
        position: 'absolute',
        top: '200px',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 60px'
      }}>
        <div style={{ 
          width: '60vw',
          minWidth: '600px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {currentDateLabel && (
            <div style={{
              padding: '12px 20px',
              fontSize: '11px',
              fontWeight: 'normal',
              color: theme.textSecondary,
              letterSpacing: '0.5px',
            }}>
              {currentDateLabel}
            </div>
          )}
          <div 
            style={{ 
              flex: 1,
              background: theme.surface,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${theme.border}`,
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              borderBottom: 'none',
              overflow: 'auto',
              overflowX: 'hidden',
              position: 'relative'
            }}
            onScroll={(e) => {
              const container = e.currentTarget
              const containerTop = container.getBoundingClientRect().top

              const sections = Array.from(
                container.querySelectorAll<HTMLElement>('[data-date-section]')
              )

              const STICKY_MARGIN = 8
              const candidates = sections
                .map((el) => ({
                  el,
                  topWithin: el.getBoundingClientRect().top - containerTop
                }))
                .filter((x) => x.topWithin <= STICKY_MARGIN)
                .sort((a, b) => b.topWithin - a.topWithin)

              const next =
                (candidates[0]?.el.getAttribute('data-date-section')) ||
                sections[0]?.getAttribute('data-date-section') ||
                ''

              if (next && next !== currentDateLabel) {
                setCurrentDateLabel(next)
              }
            }}
          >
            {groupLabels.map((dateLabel, groupIndex) => {
              const items = groups[dateLabel]
              return (
                <div key={dateLabel} data-date-section={dateLabel}>
                  {items.map((transcription, index) => (
                    <div key={transcription.id}>
                      <div style={{ 
                        display: 'flex',
                        gap: '16px',
                        padding: '16px 20px',
                        background: theme.surface,
                        backdropFilter: 'blur(8px)',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          color: theme.textSecondary,
                          minWidth: '70px',
                          flexShrink: 0
                        }}>
                          {new Date(transcription.timestamp).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                        <div style={{ 
                          flex: 1,
                          fontSize: '14px', 
                          color: theme.text,
                          lineHeight: '1.5',
                          wordWrap: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {transcription.text}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(transcription.text)
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.4,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
                        >
                          <CopyIcon color={theme.textSecondary} size={16} />
                        </button>
                      </div>
                      {(index < items.length - 1 || groupIndex < groupLabels.length - 1) && (
                        <div style={{ 
                          height: '1px', 
                          background: theme.border
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      <div style={{ 
        position: 'absolute', 
        bottom: '32px', 
        left: '32px'
      }}>
        <button 
          onClick={onOpenSettings} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            padding: '8px', 
            opacity: 0.6, 
            transition: 'opacity 0.2s' 
          }} 
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} 
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        >
          <SettingsIcon color={theme.textSecondary} />
        </button>
      </div>
    </div>
  )
}
