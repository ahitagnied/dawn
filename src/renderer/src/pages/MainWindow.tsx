import { useTranscriptions } from '../hooks/useTranscriptions'
import { useSettings } from '../hooks/useSettings'
import { SettingsIcon, InfoIcon } from '../components/icons'
import { getTheme } from '../utils/theme'

interface MainWindowProps {
  onOpenSettings?: () => void
}

export function MainWindow({ onOpenSettings }: MainWindowProps) {
  const { transcriptions } = useTranscriptions()
  const { settings } = useSettings()
  const theme = getTheme(settings.darkMode)

  const wordsIn = transcriptions.reduce((sum, t) => sum + t.wordCount, 0)
  const wordsOut = transcriptions.reduce((sum, t) => sum + t.wordCount, 0)
  const totalSeconds = transcriptions.reduce((sum, t) => sum + (t.duration || 0), 0)
  const wpm = totalSeconds > 0 ? Math.round((wordsOut / totalSeconds) * 60) : 0

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'good morning!'
    if (hour < 18) return 'good afternoon!'
    return 'good evening!'
  }

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      background: theme.background, 
      fontFamily: 'Calibri, sans-serif', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'relative',
    }}>
      <div style={{ 
        WebkitAppRegion: 'drag', 
        height: '52px', 
        background: theme.background, 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000 
      } as any} />
      
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', gap: '35px', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
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
                {wordsIn}
              </div>
              <div style={{ fontSize: '12px', color: theme.textSecondary }}>words in</div>
            </div>
            
            <div style={{ fontSize: '10px', color: theme.border }}>·</div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '25px', fontWeight: 'normal', color: theme.text, marginBottom: '10px' }}>
                {wordsOut}
              </div>
              <div style={{ fontSize: '12px', color: theme.textSecondary }}>words out</div>
            </div>
            
            <div style={{ fontSize: '10px', color: theme.border }}>·</div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '25px', fontWeight: 'normal', color: theme.text, marginBottom: '10px' }}>
                {totalSeconds}
              </div>
              <div style={{ fontSize: '12px', color: theme.textSecondary }}>seconds</div>
            </div>
            
            <div style={{ fontSize: '10px', color: theme.border }}>·</div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '25px', fontWeight: 'normal', color: theme.text, marginBottom: '10px' }}>
                {wpm}
              </div>
              <div style={{ fontSize: '12px', color: theme.textSecondary }}>wpm</div>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ 
        position: 'absolute', 
        bottom: '32px', 
        left: '32px', 
        right: '32px', 
        display: 'flex', 
        justifyContent: 'space-between'
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
        
        <button 
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
          <InfoIcon color={theme.textSecondary} />
        </button>
      </div>
    </div>
  )
}

