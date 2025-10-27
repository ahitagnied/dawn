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
  transcribe(mime: string, arrayBuffer: ArrayBuffer) {
    return ipcRenderer.invoke('stt:transcribe', { mime, buf: Buffer.from(arrayBuffer) })
  },
  pasteText(text: string) {
    return ipcRenderer.invoke('stt:paste', { text })
  },
  sendTranscription(text: string) {
    ipcRenderer.send('transcription:completed', { text })
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
