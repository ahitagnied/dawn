import { ElectronAPI } from '@electron-toolkit/preload'
import { Transcription } from '../types/transcription'

interface Bridge {
  onRecordStart(cb: () => void): () => void
  onRecordStop(cb: () => void): () => void
  onRecordCancel(cb: () => void): () => void
  onTranscriptionAdd(cb: (transcription: Transcription) => void): () => void
  transcribe(mime: string, arrayBuffer: ArrayBuffer, duration: number): Promise<{ text: string }>
  pasteText(text: string): Promise<boolean>
  updatePushToTalkHotkey(hotkey: string): Promise<void>
  updateAutoMute(enabled: boolean): Promise<void>
  updateTranscriptionModeHotkey(hotkey: string): Promise<void>
  updateAssistantModeHotkey(hotkey: string): Promise<void>
  updateAssistantScreenshot(enabled: boolean): Promise<void>
  updateInputDevice(deviceId: string): Promise<void>
  getSettings(): Promise<{ autoCopy: boolean; pressEnterAfter: boolean }>
  updateAutoCopy(enabled: boolean): Promise<void>
  updatePressEnterAfter(enabled: boolean): Promise<void>
  syncSettings(settings: { autoCopy: boolean; pressEnterAfter: boolean }): Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    bridge: Bridge
  }
}
