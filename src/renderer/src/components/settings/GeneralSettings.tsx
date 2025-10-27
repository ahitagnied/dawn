import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { Settings } from '../../hooks/useSettings'

interface GeneralSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export function GeneralSettings({ settings, onUpdateSetting }: GeneralSettingsProps) {
  return (
    <>
      <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 40px 0' }}>
        General
      </h1>
      
      <div>
        <SettingsRow title="Sound Effects" description="Play audio feedback for recording and typing">
          <Toggle checked={settings.soundEffects} onChange={(val) => onUpdateSetting('soundEffects', val)} />
        </SettingsRow>

        <SettingsRow title="Auto-Mute System" description="Mute system volume during recording">
          <Toggle checked={settings.autoMute} onChange={(val) => onUpdateSetting('autoMute', val)} />
        </SettingsRow>

        <SettingsRow title="Dark Mode" description="Use dark theme for the interface">
          <Toggle checked={settings.darkMode} onChange={(val) => onUpdateSetting('darkMode', val)} />
        </SettingsRow>

        <SettingsRow title="API Key" description="Configure your Groq API key">
          <Button>Set Key</Button>
        </SettingsRow>

        <SettingsRow title="Input Device" description="Select microphone for recording">
          <Button>Select Device</Button>
        </SettingsRow>

        <SettingsRow title="Data Location" description="Access your app data and recordings">
          <Button>Open Folder</Button>
        </SettingsRow>

        <SettingsRow title="App Updates" description="Check for the latest version">
          <Button>Check Updates</Button>
        </SettingsRow>
      </div>
    </>
  )
}

