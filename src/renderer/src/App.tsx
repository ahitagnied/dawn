import { useState } from 'react'
import { MainWindow } from './pages/MainWindow'
import { SettingsPage } from './pages/SettingsPage'
import { OverlayWindow } from './pages/OverlayWindow'

function MainApp() {
  const [showSettings, setShowSettings] = useState(false)

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
