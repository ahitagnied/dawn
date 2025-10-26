import { ElectronAPI } from '@electron-toolkit/preload'

interface Bridge {
  onRecordStart(cb: () => void): () => void
  onRecordStop(cb: () => void): () => void
  transcribe(mime: string, arrayBuffer: ArrayBuffer): Promise<{ text: string }>
  pasteText(text: string): Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    bridge: Bridge
  }
}