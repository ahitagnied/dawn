import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { Settings } from '../../hooks/useSettings'
import { Theme } from '../../utils/theme'

interface AssistantSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  theme: Theme
}

export function AssistantSettings({ settings, onUpdateSetting, theme }: AssistantSettingsProps) {
  return (
    <>
      <h1 style={{ fontSize: '32px', fontWeight: '600', color: theme.text, margin: '0 0 40px 0' }}>
        Assistant
      </h1>
      
      <div>
        <SettingsRow title="Assistant Hotkey" description="Keyboard shortcut to activate AI assistant" theme={theme}>
          <Button theme={theme}>Option ⌥ + Shift ⇧ + S</Button>
        </SettingsRow>

        <SettingsRow title="Auto-capture Screenshot" description="Take screenshot when assistant hotkey is pressed for visual context" theme={theme}>
          <Toggle checked={settings.autoCaptureScreenshot} onChange={(val) => onUpdateSetting('autoCaptureScreenshot', val)} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Assistant Model" description="Select AI model for assistant responses" theme={theme}>
          <Button theme={theme}>Llama 3.3 70B Versatile</Button>
        </SettingsRow>
      </div>
    </>
  )
}

