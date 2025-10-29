import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { GeneralSettings } from '../components/settings/GeneralSettings'
import { TranscriptionSettings } from '../components/settings/TranscriptionSettings'
import { AssistantSettings } from '../components/settings/AssistantSettings'
import { OutputSettings } from '../components/settings/OutputSettings'
import { BackIcon, SettingsIcon, MicrophoneIcon, DocumentIcon, OutputIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { getTheme } from '../utils/theme'

type SettingsTab = 'general' | 'transcription' | 'assistant' | 'output'

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')
  const { settings, updateSetting } = useSettings()
  const theme = getTheme(settings.darkMode)

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      background: theme.background, 
      backdropFilter: 'blur(8px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'relative' 
    }}>
      {/* Drag region */}
      <div style={{ 
        WebkitAppRegion: 'drag', 
        height: '52px', 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000 
      } as any} />
      
      {/* Settings content */}
      <div style={{ 
        flex: 1, 
        padding: '60px 120px 100px 120px', 
        overflowY: 'auto' 
      }}>
        {settingsTab === 'general' && (
          <GeneralSettings settings={settings} onUpdateSetting={updateSetting} theme={theme} />
        )}

        {settingsTab === 'transcription' && (
          <TranscriptionSettings settings={settings} onUpdateSetting={updateSetting} theme={theme} />
        )}

        {settingsTab === 'assistant' && (
          <AssistantSettings theme={theme} />
        )}

        {settingsTab === 'output' && (
          <OutputSettings settings={settings} onUpdateSetting={updateSetting} theme={theme} />
        )}
      </div>
      
      {/* Bottom navigation */}
      <div style={{ 
        position: 'absolute', 
        bottom: '32px', 
        left: '32px', 
        display: 'flex', 
        flexDirection: 'column-reverse',
        gap: '12px', 
        alignItems: 'flex-start' 
      }}>
        <Button 
          onClick={onBack} 
          variant="icon"
          style={{ 
            border: `1px solid ${theme.border}`, 
            background: theme.background,
            backdropFilter: 'blur(8px)'
          }}
          title="Back"
        >
          <BackIcon color={theme.text} />
        </Button>
        
        <Button 
          onClick={() => setSettingsTab('output')} 
          variant="icon"
          active={settingsTab === 'output'}
          title="Output"
          style={{
            background: settingsTab === 'output' ? theme.surface : 'transparent',
            backdropFilter: settingsTab === 'output' ? 'blur(8px)' : 'none'
          }}
        >
          <OutputIcon 
            color={settingsTab === 'output' ? theme.text : theme.textSecondary} 
          />
        </Button>
        
        <Button 
          onClick={() => setSettingsTab('assistant')} 
          variant="icon"
          active={settingsTab === 'assistant'}
          title="Assistant"
          style={{
            background: settingsTab === 'assistant' ? theme.surface : 'transparent',
            backdropFilter: settingsTab === 'assistant' ? 'blur(8px)' : 'none'
          }}
        >
          <DocumentIcon 
            color={settingsTab === 'assistant' ? theme.text : theme.textSecondary} 
          />
        </Button>
        
        <Button 
          onClick={() => setSettingsTab('transcription')} 
          variant="icon"
          active={settingsTab === 'transcription'}
          title="Transcription"
          style={{
            background: settingsTab === 'transcription' ? theme.surface : 'transparent',
            backdropFilter: settingsTab === 'transcription' ? 'blur(8px)' : 'none'
          }}
        >
          <MicrophoneIcon 
            color={settingsTab === 'transcription' ? theme.text : theme.textSecondary} 
          />
        </Button>
        
        <Button 
          onClick={() => setSettingsTab('general')} 
          variant="icon"
          active={settingsTab === 'general'}
          title="General"
          style={{
            background: settingsTab === 'general' ? theme.surface : 'transparent',
            backdropFilter: settingsTab === 'general' ? 'blur(8px)' : 'none'
          }}
        >
          <SettingsIcon 
            color={settingsTab === 'general' ? theme.text : theme.textSecondary} 
            size={20} 
          />
        </Button>
      </div>
    </div>
  )
}