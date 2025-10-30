import { useState } from 'react'
import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { HotkeyDialog } from '../ui/HotkeyDialog'
import { Settings } from '../../hooks/useSettings'
import { Theme } from '../../utils/theme'

interface TranscriptionSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  theme: Theme
}

export function TranscriptionSettings({ settings, onUpdateSetting, theme }: TranscriptionSettingsProps) {
  const [showHotkeyDialog, setShowHotkeyDialog] = useState(false)
  const [showTranscriptionHotkeyDialog, setShowTranscriptionHotkeyDialog] = useState(false)

  return (
    <>
      <div>
        <SettingsRow title="Transcription Hotkey" description="Keyboard shortcut to start transcription" theme={theme}>
          <Button onClick={() => setShowTranscriptionHotkeyDialog(true)} theme={theme}>{settings.transcriptionModeHotkey}</Button>
        </SettingsRow>

        <SettingsRow title="Push to Talk Hotkey" description="Hold this key for push-to-talk recording" theme={theme}>
          <Button onClick={() => setShowHotkeyDialog(true)} theme={theme}>{settings.pushToTalkHotkey}</Button>
        </SettingsRow>

        <SettingsRow title="Smart Transcription" description="Enhance transcriptions with formatting and emoji conversion" theme={theme}>
          <Toggle checked={settings.smartTranscription} onChange={(val) => {
            onUpdateSetting('smartTranscription', val)
            if (window.electron?.ipcRenderer) {
              window.electron.ipcRenderer.invoke('settings:update-smart-transcription', val)
            }
          }} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Local Transcription" description="Use offline models for transcription" theme={theme}>
          <Toggle checked={settings.localTranscription} onChange={(val) => onUpdateSetting('localTranscription', val)} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Local Model" description="Select offline transcription model" theme={theme}>
          <Button theme={theme}>Base</Button>
        </SettingsRow>
      </div>

      <HotkeyDialog
        isOpen={showHotkeyDialog}
        onClose={() => setShowHotkeyDialog(false)}
        onSave={(hotkey) => {
          onUpdateSetting('pushToTalkHotkey', hotkey)
          window.bridge.updatePushToTalkHotkey(hotkey)
        }}
        currentHotkey={settings.pushToTalkHotkey}
      />

      <HotkeyDialog
        isOpen={showTranscriptionHotkeyDialog}
        onClose={() => setShowTranscriptionHotkeyDialog(false)}
        onSave={(hotkey) => {
          onUpdateSetting('transcriptionModeHotkey', hotkey)
          window.bridge.updateTranscriptionModeHotkey(hotkey)
        }}
        currentHotkey={settings.transcriptionModeHotkey}
        title="Press the hotkey you want to use for transcription mode:"
      />
    </>
  )
}

