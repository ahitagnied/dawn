import { app, BrowserWindow, screen, ipcMain, clipboard, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { uIOhook } from 'uiohook-napi'
import { config } from 'dotenv'
import Groq from 'groq-sdk'

config({ path: join(__dirname, '../../.env') })

function createOverlayWindow(): void {
  const overlayWindow = new BrowserWindow({
    width: 200,
    height: 80,
    frame: false,
    transparent: true,
    resizable: false,
    focusable: true,
    alwaysOnTop: true,
    hasShadow: false,
    title: 'Dawn Overlay',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?window=overlay')
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  const display = screen.getPrimaryDisplay()
  const bounds = display.bounds
  const x = Math.round(bounds.x + (bounds.width - 200) / 2)
  const y = Math.round(bounds.y + bounds.height - 80 - 50)
  overlayWindow.setPosition(x, y)

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.show()

  if (process.platform === 'darwin') {
    ;(app as any).dock?.show()
  }
}

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 20, y: 20 },
    transparent: false,
    resizable: true,
    focusable: true,
    alwaysOnTop: false,
    hasShadow: true,
    title: '',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?window=main')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.center()
  
  mainWindow.on('blur', () => {
    mainWindow.setWindowButtonVisibility(true)
  })
}

function findWindowByType(type: 'main' | 'overlay'): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows().find(win =>
    win.webContents.getURL().includes(`window=${type}`)
  )
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  createMainWindow()
  createOverlayWindow()

  const tray = new Tray(join(__dirname, '../../resources/icon-tray.png'))
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dawn Window',
      click: () => {
        const mainWindow = findWindowByType('main')
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createMainWindow()
        }
      }
    },
    { type: 'separator' },
    { label: 'Quit Dawn', click: () => app.quit() }
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip('Dawn - Voice Recording App')

  let altDown = false
  let recording = false

  uIOhook.on('keydown', (e) => {
    if ((e.keycode === 56 || e.keycode === 3640) && !altDown && !recording) {
      altDown = true
      recording = true
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('record:start')
      })
    }
  })

  uIOhook.on('keyup', (e) => {
    if ((e.keycode === 56 || e.keycode === 3640) && altDown && recording) {
      altDown = false
      recording = false
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('record:stop')
      })
    }
  })

  uIOhook.start()

  ipcMain.handle('stt:transcribe', async (_evt, { mime, buf }: { mime: string; buf: ArrayBuffer }) => {
    const dir = mkdtempSync(join(tmpdir(), 'stt-'))
    const ext = mime.includes('webm') ? 'webm' : 'wav'
    const file = join(dir, `audio.${ext}`)
    writeFileSync(file, Buffer.from(buf))

    const fs = require('fs')
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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

  ipcMain.on('transcription:completed', (_event, { text }: { text: string }) => {
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length
    const mainWindow = findWindowByType('main')

    if (mainWindow) {
      mainWindow.webContents.send('transcription:add', {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        timestamp: Date.now(),
        wordCount
      })
    }
  })

  app.on('activate', () => {
    if (!findWindowByType('overlay')) createOverlayWindow()

    const mainWindow = findWindowByType('main')
    if (mainWindow) {
      mainWindow.focus()
      mainWindow.show()
    } else {
      createMainWindow()
    }
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
