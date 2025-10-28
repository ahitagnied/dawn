import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { Settings } from '../../hooks/useSettings'
import { Theme } from '../../utils/theme'

interface GeneralSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  theme: Theme
}

export function GeneralSettings({ settings, onUpdateSetting, theme }: GeneralSettingsProps) {
  const handleAutoMuteChange = (val: boolean) => {
    onUpdateSetting('autoMute', val)
    // Notify main process
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('settings:update-auto-mute', val)
    }
  }

  return (
    <>
      <div>
        <SettingsRow title="Sound Effects" description="Play audio feedback for recording and typing" theme={theme}>
          <Toggle checked={settings.soundEffects} onChange={(val) => onUpdateSetting('soundEffects', val)} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Auto-Mute System" description="Mute system volume during recording" theme={theme}>
          <Toggle checked={settings.autoMute} onChange={handleAutoMuteChange} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Dark Mode" description="Use dark theme for the interface" theme={theme}>
          <Toggle checked={settings.darkMode} onChange={(val) => onUpdateSetting('darkMode', val)} theme={theme} />
        </SettingsRow>

        <SettingsRow title="API Key" description="Configure your Groq API key" theme={theme}>
          <Button theme={theme}>Set Key</Button>
        </SettingsRow>

        <SettingsRow title="Input Device" description="Select microphone for recording" theme={theme}>
          <Button theme={theme}>Select Device</Button>
        </SettingsRow>

        <SettingsRow title="Data Location" description="Access your app data and recordings" theme={theme}>
          <Button theme={theme}>Open Folder</Button>
        </SettingsRow>

        <SettingsRow title="App Updates" description="Check for the latest version" theme={theme}>
          <Button theme={theme}>Check Updates</Button>
        </SettingsRow>
      </div>
    </>
  )
}

