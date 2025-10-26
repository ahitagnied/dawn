import { app, BrowserWindow, screen, ipcMain, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { uIOhook } from 'uiohook-napi'
import { config } from 'dotenv'
import Groq from 'groq-sdk'

// Load environment variables from .env file
const envPath = join(__dirname, '../../.env')
config({ path: envPath })

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 200,
    height: 80,
    frame: false,
    transparent: true,
    resizable: false,
    focusable: true,
    alwaysOnTop: true,
    hasShadow: false,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  const display = screen.getPrimaryDisplay()
  const bounds = display.bounds
  const x = Math.round(bounds.x + (bounds.width - 200) / 2)
  const y = Math.round(bounds.y + bounds.height - 80 - 50)
  mainWindow.setPosition(x, y)

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setAlwaysOnTop(true, 'screen-saver')

  // Ensure dock icon is visible on macOS
  if (process.platform === 'darwin') {
    ;(app as any).dock?.show()
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  
  createWindow()

  let altDown = false
  let recording = false

  uIOhook.on('keydown', (e) => {
    if (e.keycode === 56 || e.keycode === 3640) {
      if (!altDown && !recording) {
        altDown = true
        recording = true
        const w = BrowserWindow.getAllWindows()[0]
        if (w) w.webContents.send('record:start')
      }
    }
  })

  uIOhook.on('keyup', (e) => {
    if (e.keycode === 56 || e.keycode === 3640) {
      if (altDown && recording) {
        altDown = false
        recording = false
        const w = BrowserWindow.getAllWindows()[0]
        if (w) w.webContents.send('record:stop')
      }
    }
  })

  uIOhook.start()

  ipcMain.handle('stt:transcribe', async (_evt, { mime, buf }: { mime: string; buf: ArrayBuffer }) => {
    const dir = mkdtempSync(join(tmpdir(), 'stt-'))
    const ext = mime.includes('webm') ? 'webm' : 'wav'
    const file = join(dir, `audio.${ext}`)
    writeFileSync(file, Buffer.from(buf))

    const fs = require('fs')
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(file),
      model: "whisper-large-v3-turbo",
      temperature: 0,
      response_format: "verbose_json",
    })

    return { text: transcription.text ?? '' }
  })

  ipcMain.handle('stt:paste', async (_evt, { text }: { text: string }) => {
    if (!text) return false
    clipboard.writeText(text)

    await new Promise<void>((resolve, reject) => {
      execFile(
        'osascript',
        ['-e', 'tell application "System Events" to keystroke "v" using {command down}'],
        (err) => (err ? reject(err) : resolve())
      )
    })

    return true
  })

  ipcMain.on('record:stop', () => {
    const w = BrowserWindow.getAllWindows()[0]
    if (w) {
      w.webContents.send('record:stop')
    }
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  uIOhook.removeAllListeners()
  try {
    uIOhook.stop()
  } catch {}
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})