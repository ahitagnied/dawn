import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
  transcribe(mime: string, arrayBuffer: ArrayBuffer) {
    return ipcRenderer.invoke('stt:transcribe', { mime, buf: Buffer.from(arrayBuffer) })
  },
  pasteText(text: string) {
    return ipcRenderer.invoke('stt:paste', { text })
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
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.bridge = bridge
}