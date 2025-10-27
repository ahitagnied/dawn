import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { Settings } from '../../hooks/useSettings'

interface AssistantSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export function AssistantSettings({ settings, onUpdateSetting }: AssistantSettingsProps) {
  return (
    <>
      <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 40px 0' }}>
        Assistant
      </h1>
      
      <div>
        <SettingsRow title="Assistant Hotkey" description="Keyboard shortcut to activate AI assistant">
          <Button>Option ⌥ + Shift ⇧ + S</Button>
        </SettingsRow>

        <SettingsRow title="Auto-capture Screenshot" description="Take screenshot when assistant hotkey is pressed for visual context">
          <Toggle checked={settings.autoCaptureScreenshot} onChange={(val) => onUpdateSetting('autoCaptureScreenshot', val)} />
        </SettingsRow>

        <SettingsRow title="Assistant Model" description="Select AI model for assistant responses">
          <Button>Llama 3.3 70B Versatile</Button>
        </SettingsRow>
      </div>
    </>
  )
}

