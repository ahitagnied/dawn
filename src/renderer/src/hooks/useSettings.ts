import { useState, useEffect } from 'react'

export interface PhrasePair {
  id: string
  original: string
  replacement: string
}

export interface Settings {
  soundEffects: boolean
  autoMute: boolean
  darkMode: boolean
  smartTranscription: boolean
  pushToTalk: boolean
  pushToTalkHotkey: string
  localTranscription: boolean
  selectedModel: string
  transcriptionModeHotkey: string
  assistantModeEnabled: boolean
  assistantModeHotkey: string
  assistantScreenshotEnabled: boolean
  assistantModel: string
  autoCopy: boolean
  pressEnterAfter: boolean
  inputDevice: string
  phraseReplacements: PhrasePair[]
}

const DEFAULT_SETTINGS: Settings = {
  soundEffects: false,
  autoMute: true,
  darkMode: false,
  smartTranscription: false,
  pushToTalk: true,
  pushToTalkHotkey: 'Option ⌥',
  localTranscription: true,
  selectedModel: 'openai_whisper-base',
  transcriptionModeHotkey: 'Option ⌥ + Shift ⇧ + Z',
  assistantModeEnabled: true,
  assistantModeHotkey: 'Option ⌥ + Shift ⇧ + S',
  assistantScreenshotEnabled: false,
  assistantModel: 'meta-llama/llama-4-maverick-17b-128e-instruct',
  autoCopy: true,
  pressEnterAfter: false,
  inputDevice: 'default',
  phraseReplacements: []
}

const SETTINGS_STORAGE_KEY = 'dawn-settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  })

  // Sync selectedModel from main process on mount
  useEffect(() => {
    const syncModel = async () => {
      if (window.bridge?.getCurrentModel) {
        try {
          const currentModel = await window.bridge.getCurrentModel()
          if (currentModel && currentModel !== settings.selectedModel) {
            console.log('[Settings] Syncing model from main process:', currentModel)
            setSettings((prev) => ({ ...prev, selectedModel: currentModel }))
          }
        } catch (error) {
          console.error('[Settings] Failed to sync model from main process:', error)
        }
      }
    }
    syncModel()
  }, []) // Only run on mount

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return { settings, updateSetting }
}
