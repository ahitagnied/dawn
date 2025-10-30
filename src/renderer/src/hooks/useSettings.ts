import { useState, useEffect } from 'react'

export interface Settings {
  soundEffects: boolean
  autoMute: boolean
  darkMode: boolean
  smartTranscription: boolean
  pushToTalk: boolean
  pushToTalkHotkey: string
  localTranscription: boolean
  transcriptionModeHotkey: string
  assistantModeEnabled: boolean
  assistantModeHotkey: string
  assistantScreenshotEnabled: boolean
  assistantModel: string
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
  transcriptionModeHotkey: 'Option ⌥ + Shift ⇧ + Z',
  assistantModeEnabled: true,
  assistantModeHotkey: 'Option ⌥ + Shift ⇧ + S',
  assistantScreenshotEnabled: false,
  assistantModel: 'meta-llama/llama-4-maverick-17b-128e-instruct',
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

