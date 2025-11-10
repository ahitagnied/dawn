import { useState, useEffect } from 'react'
import { MainWindow } from './pages/MainWindow'
import { SettingsPage } from './pages/SettingsPage'
import { OverlayWindow } from './pages/OverlayWindow'
import { useSettings } from './hooks/useSettings'
import { useTranscriptions } from './hooks/useTranscriptions'

function MainApp() {
  const [showSettings, setShowSettings] = useState(false)
  const { settings } = useSettings()
  console.log('App settings:', settings)
  console.log('Phrase replacements:', settings.phraseReplacements)
  useTranscriptions(settings.phraseReplacements)

  useEffect(() => {
    if (window.bridge) {
      window.bridge.updatePushToTalkHotkey(settings.pushToTalkHotkey)
      window.bridge.updateTranscriptionModeHotkey(settings.transcriptionModeHotkey)
      window.bridge.updateAutoMute(settings.autoMute)
      window.bridge.updateAssistantModeHotkey(settings.assistantModeHotkey)
      window.bridge.updateAssistantScreenshot(settings.assistantScreenshotEnabled)
    }

    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('settings:update-sound-effects', settings.soundEffects)
      window.electron.ipcRenderer.invoke(
        'settings:update-smart-transcription',
        settings.smartTranscription
      )
      window.electron.ipcRenderer.invoke(
        'settings:update-assistant-mode',
        settings.assistantModeEnabled
      )
    }
  }, [])

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />
  }

  return <MainWindow onOpenSettings={() => setShowSettings(true)} />
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search)
  const windowType = urlParams.get('window') || 'overlay'
  return windowType === 'main' ? <MainApp /> : <OverlayWindow />
}
