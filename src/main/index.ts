import { app, BrowserWindow, screen, ipcMain, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import axios from 'axios'
import { uIOhook } from 'uiohook-napi'

try {
  const envPath = join(__dirname, '../../.env')
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch {}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 200,
    height: 80,
    frame: false,
    transparent: true,
    resizable: false,
    focusable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
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
  const y = Math.round(bounds.y + bounds.height - 80 - 20)
  mainWindow.setPosition(x, y)

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
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

    const FormData = require('form-data')
    const fs = require('fs')
    const form = new FormData()
    form.append('file', fs.createReadStream(file))
    form.append('model', 'whisper-1')

    const resp = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    })

    return { text: resp.data?.text ?? '' }
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