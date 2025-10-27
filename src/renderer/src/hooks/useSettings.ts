import { useState, useEffect } from 'react'

export interface Settings {
  // General settings
  soundEffects: boolean
  autoMute: boolean
  darkMode: boolean
  
  // Transcription settings
  smartTranscription: boolean
  pushToTalk: boolean
  pushToTalkHotkey: string
  localTranscription: boolean
  
  // Assistant settings
  autoCaptureScreenshot: boolean
  
  // Output settings
  autoCopy: boolean
  pressEnterAfter: boolean
}

const DEFAULT_SETTINGS: Settings = {
  soundEffects: false,
  autoMute: true,
  darkMode: false,
  smartTranscription: false,
  pushToTalk: true,
  pushToTalkHotkey: 'Option ⌥',
  localTranscription: true,
  autoCaptureScreenshot: false,
  autoCopy: true,
  pressEnterAfter: false,
}

const SETTINGS_STORAGE_KEY = 'dawn-settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  })

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return { settings, updateSetting }
}

