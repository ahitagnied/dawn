import { useState, useEffect } from 'react'
import { MainWindow } from './pages/MainWindow'
import { SettingsPage } from './pages/SettingsPage'
import { OverlayWindow } from './pages/OverlayWindow'
import { useSettings } from './hooks/useSettings'

function MainApp() {
  const [showSettings, setShowSettings] = useState(false)
  const { settings } = useSettings()

  // Initialize main process with current settings on startup
  useEffect(() => {
    if (window.bridge) {
      window.bridge.updatePushToTalkHotkey(settings.pushToTalkHotkey)
      window.bridge.updateAutoMute(settings.autoMute)
    }
  }, []) // Only run on mount

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
