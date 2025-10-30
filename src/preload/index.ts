import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Transcription } from '../types/transcription'

const bridge = {
  onRecordStart(cb: () => void) {
    const handler = () => cb()
    ipcRenderer.on('record:start', handler)
    return () => ipcRenderer.removeListener('record:start', handler)
  },
  onRecordStop(cb: () => void) {
    const handler = () => cb()
    ipcRenderer.on('record:stop', handler)
    return () => ipcRenderer.removeListener('record:stop', handler)
  },
  onTranscriptionAdd(cb: (transcription: Transcription) => void) {
    const handler = (_event: any, transcription: Transcription) => cb(transcription)
    ipcRenderer.on('transcription:add', handler)
    return () => ipcRenderer.removeListener('transcription:add', handler)
  },
  transcribe(mime: string, arrayBuffer: ArrayBuffer, duration: number) {
    return ipcRenderer.invoke('stt:transcribe', { mime, buf: Buffer.from(arrayBuffer), duration })
  },
  pasteText(text: string) {
    return ipcRenderer.invoke('stt:paste', { text })
  },
  updatePushToTalkHotkey(hotkey: string) {
    return ipcRenderer.invoke('settings:update-hotkey', hotkey)
  },
  updateAutoMute(enabled: boolean) {
    return ipcRenderer.invoke('settings:update-auto-mute', enabled)
  },
  updateTranscriptionModeHotkey(hotkey: string) {
    return ipcRenderer.invoke('settings:update-transcription-hotkey', hotkey)
  },
  updateAssistantModeHotkey(hotkey: string) {
    return ipcRenderer.invoke('settings:update-assistant-mode-hotkey', hotkey)
  },
  updateAssistantScreenshot(enabled: boolean) {
    return ipcRenderer.invoke('settings:update-assistant-screenshot', enabled)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('bridge', bridge)
  } catch (error) {
    console.error(error)
  }
} else {
  ;(window as any).electron = electronAPI
  ;(window as any).bridge = bridge
}
