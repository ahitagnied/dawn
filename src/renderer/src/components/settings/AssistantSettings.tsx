import { useState } from 'react'
import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { HotkeyDialog } from '../ui/HotkeyDialog'
import { Settings } from '../../hooks/useSettings'
import { Theme } from '../../utils/theme'

interface AssistantSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  theme: Theme
}

export function AssistantSettings({ settings, onUpdateSetting, theme }: AssistantSettingsProps) {
  const [showHotkeyDialog, setShowHotkeyDialog] = useState(false)

  return (
    <>
      <div>
        <SettingsRow title="Enable Assistant Mode" description="Use AI to edit or generate text based on voice commands" theme={theme}>
          <Toggle checked={settings.assistantModeEnabled} onChange={(val) => onUpdateSetting('assistantModeEnabled', val)} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Assistant Hotkey" description="Keyboard shortcut to activate AI assistant" theme={theme}>
          <Button onClick={() => setShowHotkeyDialog(true)} theme={theme}>{settings.assistantModeHotkey}</Button>
        </SettingsRow>

        <SettingsRow title="Screenshot Context" description="Include screenshot for visual context" theme={theme}>
          <Toggle checked={settings.assistantScreenshotEnabled} onChange={(val) => {
            onUpdateSetting('assistantScreenshotEnabled', val)
            window.bridge.updateAssistantScreenshot(val)
          }} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Assistant Model" description="Select AI model for assistant responses" theme={theme}>
          <Button theme={theme}>Llama 4 Maverick</Button>
        </SettingsRow>
      </div>

      <HotkeyDialog
        isOpen={showHotkeyDialog}
        onClose={() => setShowHotkeyDialog(false)}
        onSave={(hotkey) => {
          onUpdateSetting('assistantModeHotkey', hotkey)
          window.bridge.updateAssistantModeHotkey(hotkey)
        }}
        currentHotkey={settings.assistantModeHotkey}
        title="Press the hotkey you want to use for assistant mode:"
      />
    </>
  )
}
