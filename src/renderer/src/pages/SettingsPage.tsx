import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { GeneralSettings } from '../components/settings/GeneralSettings'
import { TranscriptionSettings } from '../components/settings/TranscriptionSettings'
import { AssistantSettings } from '../components/settings/AssistantSettings'
import { OutputSettings } from '../components/settings/OutputSettings'
import { BackIcon, SettingsIcon, MicrophoneIcon, DocumentIcon, OutputIcon, InfoIcon } from '../components/icons'
import { Button } from '../components/ui/Button'

type SettingsTab = 'general' | 'transcription' | 'assistant' | 'output'

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')
  const { settings, updateSetting } = useSettings()

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
      
      {/* Settings content */}
      <div style={{ 
        flex: 1, 
        padding: '100px 120px 100px 120px', 
        overflowY: 'auto' 
      }}>
        {settingsTab === 'general' && (
          <GeneralSettings settings={settings} onUpdateSetting={updateSetting} />
        )}

        {settingsTab === 'transcription' && (
          <TranscriptionSettings settings={settings} onUpdateSetting={updateSetting} />
        )}

        {settingsTab === 'assistant' && (
          <AssistantSettings settings={settings} onUpdateSetting={updateSetting} />
        )}

        {settingsTab === 'output' && (
          <OutputSettings settings={settings} onUpdateSetting={updateSetting} />
        )}
      </div>
      
      {/* Bottom navigation */}
      <div style={{ 
        position: 'absolute', 
        bottom: '32px', 
        left: '32px', 
        right: '32px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Back button */}
          <Button 
            onClick={onBack} 
            variant="icon"
            style={{ 
              border: '1px solid #e0e0e0', 
              background: 'white' 
            }}
            title="Back"
          >
            <BackIcon />
          </Button>
          
          {/* Settings tab - General */}
          <Button 
            onClick={() => setSettingsTab('general')} 
            variant="icon"
            active={settingsTab === 'general'}
            title="General"
          >
            <SettingsIcon 
              color={settingsTab === 'general' ? '#1a1a1a' : '#999'} 
              size={20} 
            />
          </Button>
          
          {/* Transcription tab */}
          <Button 
            onClick={() => setSettingsTab('transcription')} 
            variant="icon"
            active={settingsTab === 'transcription'}
            title="Transcription"
          >
            <MicrophoneIcon 
              color={settingsTab === 'transcription' ? '#1a1a1a' : '#999'} 
            />
          </Button>
          
          {/* Assistant tab */}
          <Button 
            onClick={() => setSettingsTab('assistant')} 
            variant="icon"
            active={settingsTab === 'assistant'}
            title="Assistant"
          >
            <DocumentIcon 
              color={settingsTab === 'assistant' ? '#1a1a1a' : '#999'} 
            />
          </Button>
          
          {/* Output tab */}
          <Button 
            onClick={() => setSettingsTab('output')} 
            variant="icon"
            active={settingsTab === 'output'}
            title="Output"
          >
            <OutputIcon 
              color={settingsTab === 'output' ? '#1a1a1a' : '#999'} 
            />
          </Button>
        </div>
        
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

