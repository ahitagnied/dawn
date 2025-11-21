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
  onRecordCancel(cb: () => void) {
    const handler = () => cb()
    ipcRenderer.on('record:cancel', handler)
    return () => ipcRenderer.removeListener('record:cancel', handler)
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
  },
  updateInputDevice(deviceId: string) {
    return ipcRenderer.invoke('settings:update-input-device', deviceId)
  },
  getSettings() {
    return ipcRenderer.invoke('settings:get')
  },
  updateAutoCopy(enabled: boolean) {
    return ipcRenderer.invoke('settings:update-auto-copy', enabled)
  },
  updatePressEnterAfter(enabled: boolean) {
    return ipcRenderer.invoke('settings:update-press-enter-after', enabled)
  },
  syncSettings(settings: { autoCopy: boolean; pressEnterAfter: boolean }) {
    return ipcRenderer.invoke('settings:sync', settings)
  },
  updateLocalTranscription(enabled: boolean) {
    return ipcRenderer.invoke('settings:update-local-transcription', enabled)
  },
  // Model management methods
  getInstalledModels() {
    return ipcRenderer.invoke('models:get-installed')
  },
  downloadModel(modelId: string) {
    return ipcRenderer.invoke('models:download', modelId)
  },
  deleteModel(modelId: string) {
    return ipcRenderer.invoke('models:delete', modelId)
  },
  switchModel(modelId: string) {
    return ipcRenderer.invoke('models:switch', modelId)
  },
  getCurrentModel() {
    return ipcRenderer.invoke('models:get-current')
  },
  getModelInfo(modelId: string) {
    return ipcRenderer.invoke('models:get-info', modelId)
  },
  openModelsFolder() {
    return ipcRenderer.invoke('models:open-folder')
  },
  onDownloadProgress(cb: (progress: any) => void) {
    const handler = (_event: any, progress: any) => cb(progress)
    ipcRenderer.on('models:download-progress', handler)
    return () => ipcRenderer.removeListener('models:download-progress', handler)
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
