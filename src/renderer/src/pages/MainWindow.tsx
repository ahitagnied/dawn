import { useTranscriptions } from '../hooks/useTranscriptions'
import { SettingsIcon, InfoIcon } from '../components/icons'

interface MainWindowProps {
  onOpenSettings?: () => void
}

export function MainWindow({ onOpenSettings }: MainWindowProps) {
  const { transcriptions } = useTranscriptions()

  // Calculate stats
  const wordsIn = transcriptions.reduce((sum, t) => sum + t.wordCount, 0)
  const wordsOut = transcriptions.reduce((sum, t) => sum + t.wordCount, 0)
  const totalSeconds = transcriptions.reduce((sum, t) => sum + (t.duration || 0), 0)
  const wpm = totalSeconds > 0 ? Math.round((wordsOut / totalSeconds) * 60) : 0

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'good morning,'
    if (hour < 18) return 'good afternoon,'
    return 'good evening,'
  }

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      background: 'white', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'relative' 
    }}>
      {/* Drag region */}
      <div style={{ 
        WebkitAppRegion: 'drag', 
        height: '52px', 
        background: 'white', 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000 
      } as any} />
      
      {/* Main content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingBottom: '80px' 
      }}>
        {/* Greeting */}
        <h1 style={{ 
          fontSize: '48px', 
          fontWeight: '400', 
          color: '#1a1a1a', 
          margin: '0 0 16px 0', 
          letterSpacing: '-0.5px' 
        }}>
          {getGreeting()}
        </h1>
        
        {/* Subtitle */}
        <p style={{ 
          fontSize: '18px', 
          fontWeight: '400', 
          color: '#666', 
          margin: '0 0 64px 0' 
        }}>
          what would you like to build with dawn today?
        </p>
        
        {/* Stats */}
        <div style={{ display: 'flex', gap: '60px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '400', 
              color: '#1a1a1a', 
              marginBottom: '8px' 
            }}>
              {wordsIn}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>words in</div>
          </div>
          
          <div style={{ fontSize: '24px', color: '#e0e0e0' }}>·</div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '400', 
              color: '#1a1a1a', 
              marginBottom: '8px' 
            }}>
              {wordsOut}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>words out</div>
          </div>
          
          <div style={{ fontSize: '24px', color: '#e0e0e0' }}>·</div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '400', 
              color: '#1a1a1a', 
              marginBottom: '8px' 
            }}>
              {totalSeconds}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>seconds</div>
          </div>
          
          <div style={{ fontSize: '24px', color: '#e0e0e0' }}>·</div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '400', 
              color: '#1a1a1a', 
              marginBottom: '8px' 
            }}>
              {wpm}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>wpm</div>
          </div>
        </div>
      </div>
      
      {/* Bottom buttons */}
      <div style={{ 
        position: 'absolute', 
        bottom: '32px', 
        left: '32px', 
        right: '32px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        {/* Settings button - bottom left */}
        <button 
          onClick={onOpenSettings} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            padding: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            opacity: 0.6, 
            transition: 'opacity 0.2s' 
          }} 
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} 
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'} 
          title="Settings"
        >
          <SettingsIcon />
        </button>
        
        {/* Info button - bottom right */}
        <button 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            padding: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            opacity: 0.6, 
            transition: 'opacity 0.2s' 
          }} 
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} 
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'} 
          title="Info"
        >
          <InfoIcon />
        </button>
      </div>
    </div>
  )
}

