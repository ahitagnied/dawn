import { app, BrowserWindow, screen, ipcMain, clipboard, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { config } from 'dotenv'
import Groq from 'groq-sdk'
import { enhanceTranscription } from './services/llm-enhancer'
import { hotkeyManager, HotkeyMode } from './services/hotkey-manager'

config({ path: join(__dirname, '../../.env') })

type RecordingMode = 'push-to-talk' | 'transcription' | 'assistant' | 'idle'

// Application state
let previousVolume = 0
let autoMuteEnabled = true
let soundEffectsEnabled = false
let smartTranscriptionEnabled = false
let assistantModeEnabled = true
let assistantScreenshotEnabled = false
const assistantModel = 'meta-llama/llama-4-maverick-17b-128e-instruct'
let selectedTextBeforeRecording: string | null = null
let autoCopyEnabled = true
let pressEnterAfterEnabled = false
let lastRecordingMode: RecordingMode = 'idle'

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
    minWidth: 800,
    minHeight: 600,
    maxWidth: 1200,
    maxHeight: 800,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 20, y: 20 },
    transparent: false,
    vibrancy: 'under-window',
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
  return BrowserWindow.getAllWindows().find((win) =>
    win.webContents.getURL().includes(`window=${type}`)
  )
}

const playSound = (soundFile: string, volume: number = 0.1): void => {
  if (soundEffectsEnabled && process.platform === 'darwin') {
    execFile(
      'afplay',
      ['-v', volume.toString(), join(__dirname, '../../resources', soundFile)],
      () => {}
    )
  }
}

const getMacVolume = async (): Promise<number> => {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', 'output volume of (get volume settings)'], (err, stdout) => {
      if (err) return reject(err)
      resolve(parseInt(stdout.trim()))
    })
  })
}

const setMacVolume = async (volume: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', `set volume output volume ${volume}`], (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

const detectEditingMode = async (): Promise<{ isEditing: boolean; selectedText: string }> => {
  const originalClipboard = clipboard.readText()

  await new Promise<void>((resolve, reject) => {
    execFile(
      'osascript',
      ['-e', 'tell application "System Events" to keystroke "c" using {command down}'],
      (err) => (err ? reject(err) : resolve())
    )
  })

  await new Promise((resolve) => setTimeout(resolve, 150))

  const clipboardText = clipboard.readText()
  const isEditing = clipboardText.length > 0 && clipboardText !== originalClipboard

  return {
    isEditing,
    selectedText: isEditing ? clipboardText : ''
  }
}

const captureScreenshot = async (): Promise<string | null> => {
  if (!assistantScreenshotEnabled) {
    return null
  }

  try {
    const screenshotPath = join(tmpdir(), `screenshot-${Date.now()}.png`)

    await new Promise<void>((resolve, reject) => {
      execFile('screencapture', ['-x', screenshotPath], (err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    const fs = await import('fs')
    const imageBuffer = fs.readFileSync(screenshotPath)
    const base64Image = imageBuffer.toString('base64')
    fs.unlinkSync(screenshotPath)

    return `data:image/png;base64,${base64Image}`
  } catch (error) {
    console.error('Screenshot capture failed:', error)
    return null
  }
}

const saveTranscriptionToHistory = (
  text: string,
  wordsIn: number,
  wordsOut: number,
  duration: number
) => {
  const mainWindow = findWindowByType('main')
  if (mainWindow) {
    mainWindow.webContents.send('transcription:add', {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      timestamp: Date.now(),
      wordsIn,
      wordsOut,
      duration
    })
  }
}

// Recording event handlers
const handleRecordingStart = async (mode: HotkeyMode): Promise<void> => {
  console.log(`[Main] Recording started: ${mode}`)
  lastRecordingMode = mode

  // Handle assistant mode context capture
  if (mode === 'assistant') {
    try {
      const context = await detectEditingMode()
      selectedTextBeforeRecording = context.isEditing ? context.selectedText : null
      console.log('Assistant mode context:', {
        isEditing: context.isEditing,
        textLength: context.selectedText.length
      })
    } catch (error) {
      console.error('Failed to detect editing mode:', error)
      selectedTextBeforeRecording = null
    }
  }

  // Notify all windows to start recording
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('record:start')
  })

  playSound('bong.mp3', 0.1)

  // Auto-mute system volume on macOS
  if (autoMuteEnabled && process.platform === 'darwin') {
    getMacVolume()
      .then((volume) => {
        previousVolume = volume
        return setMacVolume(0)
      })
      .catch((error) => {
        console.error('Failed to mute system volume:', error)
      })
  }
}

const handleRecordingStop = async (mode: HotkeyMode): Promise<void> => {
  console.log(`[Main] Recording stopped: ${mode}`)

  // Notify all windows to stop recording
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('record:stop')
  })

  playSound('bing.mp3', 0.1)

  // Restore system volume on macOS
  if (autoMuteEnabled && process.platform === 'darwin') {
    setMacVolume(previousVolume).catch((error) => {
      console.error('Failed to restore system volume:', error)
    })
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  createMainWindow()
  createOverlayWindow()

  // Initialize hotkey manager
  hotkeyManager.initialize({
    onRecordingStart: handleRecordingStart,
    onRecordingStop: handleRecordingStop
  })

  // Register default hotkeys
  hotkeyManager.registerHotkey('push-to-talk', 'Option ⌥')
  hotkeyManager.registerHotkey('transcription', 'Option ⌥ + Shift ⇧ + Z')
  hotkeyManager.registerHotkey('assistant', 'Option ⌥ + Shift ⇧ + S')

  // Setup tray
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

  // IPC Handlers for settings
  ipcMain.handle('settings:update-auto-mute', async (_evt, enabled: boolean) => {
    autoMuteEnabled = enabled
  })

  ipcMain.handle('settings:update-sound-effects', async (_evt, enabled: boolean) => {
    soundEffectsEnabled = enabled
  })

  ipcMain.handle('settings:update-hotkey', async (_evt, hotkey: string) => {
    hotkeyManager.registerHotkey('push-to-talk', hotkey)
  })

  ipcMain.handle('settings:update-transcription-hotkey', async (_evt, hotkey: string) => {
    hotkeyManager.registerHotkey('transcription', hotkey)
  })

  ipcMain.handle('settings:update-smart-transcription', async (_evt, enabled: boolean) => {
    smartTranscriptionEnabled = enabled
  })

  ipcMain.handle('settings:update-assistant-mode-hotkey', async (_evt, hotkey: string) => {
    hotkeyManager.registerHotkey('assistant', hotkey)
  })

  ipcMain.handle('settings:update-assistant-screenshot', async (_evt, enabled: boolean) => {
    assistantScreenshotEnabled = enabled
    console.log('Updated assistant screenshot enabled:', assistantScreenshotEnabled)
  })

  ipcMain.handle('settings:update-assistant-mode', async (_evt, enabled: boolean) => {
    assistantModeEnabled = enabled
    console.log('Updated assistant mode enabled:', assistantModeEnabled)
  })

  ipcMain.handle('settings:update-input-device', async (_evt, deviceId: string) => {
    console.log('Updated input device:', deviceId)
  })

  ipcMain.handle('settings:get', async () => {
    return {
      autoCopy: autoCopyEnabled,
      pressEnterAfter: pressEnterAfterEnabled
    }
  })

  ipcMain.handle('settings:update-auto-copy', async (_evt, enabled: boolean) => {
    autoCopyEnabled = enabled
    console.log('Updated auto copy enabled:', autoCopyEnabled)
  })

  ipcMain.handle('settings:update-press-enter-after', async (_evt, enabled: boolean) => {
    pressEnterAfterEnabled = enabled
    console.log('Updated press enter after enabled:', pressEnterAfterEnabled)
  })

  ipcMain.handle('settings:sync', async (_evt, settings: { autoCopy: boolean; pressEnterAfter: boolean }) => {
    autoCopyEnabled = settings.autoCopy
    pressEnterAfterEnabled = settings.pressEnterAfter
    console.log('Synced settings from renderer:', { autoCopy: autoCopyEnabled, pressEnterAfter: pressEnterAfterEnabled })
  })

  // Transcription handler
  ipcMain.handle(
    'stt:transcribe',
    async (_evt, { mime, buf, duration }: { mime: string; buf: ArrayBuffer; duration: number }) => {
      const dir = mkdtempSync(join(tmpdir(), 'stt-'))
      const ext = mime.includes('webm') ? 'webm' : 'wav'
      const file = join(dir, `audio.${ext}`)
      writeFileSync(file, Buffer.from(buf))

      const fs = await import('fs')
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

      let retries = 3
      let transcription
      while (retries > 0) {
        try {
          transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(file),
            model: 'whisper-large-v3-turbo',
            temperature: 0,
            response_format: 'verbose_json'
          })
          break
        } catch (error) {
          retries--
          if (retries === 0) {
            console.error('STT failed after 3 attempts:', error)
            throw error
          }
          console.log(`STT connection failed, retrying... (${retries} attempts left)`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      if (lastRecordingMode === 'assistant') {
        let screenshot: string | null = null

        if (assistantScreenshotEnabled) {
          screenshot = await captureScreenshot()
          console.log('Screenshot captured:', screenshot ? 'yes' : 'no')
        }

        const { processAssistantRequest } = await import('./services/ai-assistant')
        const aiResponse = await processAssistantRequest({
          instructions: transcription.text ?? '',
          selectedText: selectedTextBeforeRecording,
          screenshot: screenshot,
          model: assistantModel,
          apiKey: process.env.GROQ_API_KEY
        })

        selectedTextBeforeRecording = null
        lastRecordingMode = 'idle'

        const trimmedResponse = aiResponse.trim()
        const wordsIn = (transcription.text ?? '')
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length
        const wordsOut = trimmedResponse
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length
        saveTranscriptionToHistory(trimmedResponse, wordsIn, wordsOut, duration)
        return { text: trimmedResponse }
      }

      if (lastRecordingMode === 'transcription' && smartTranscriptionEnabled) {
        const enhancedText = await enhanceTranscription(
          transcription.text ?? '',
          undefined,
          process.env.GROQ_API_KEY
        )
        lastRecordingMode = 'idle'
        const trimmed = enhancedText.trim()
        const wordsIn = (transcription.text ?? '')
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length
        const wordsOut = trimmed
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length
        saveTranscriptionToHistory(trimmed, wordsIn, wordsOut, duration)
        return { text: trimmed }
      }

      lastRecordingMode = 'idle'
      const trimmed = (transcription.text ?? '').trim()
      const wordsIn = trimmed
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length
      const wordsOut = trimmed
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length
      saveTranscriptionToHistory(trimmed, wordsIn, wordsOut, duration)
      return { text: trimmed }
    }
  )

  ipcMain.handle('stt:paste', async (_evt, { text }: { text: string }) => {
    if (!text) return false
    const previousClipboardContent = clipboard.readText()
    clipboard.writeText(text)

    await new Promise<void>((resolve, reject) => {
      execFile(
        'osascript',
        ['-e', 'tell application "System Events" to keystroke "v" using {command down}'],
        (err) => (err ? reject(err) : resolve())
      )
    })

    if (pressEnterAfterEnabled) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100)
      })
      await new Promise<void>((resolve, reject) => {
        execFile(
          'osascript',
          ['-e', 'tell application "System Events" to keystroke return'],
          (err) => (err ? reject(err) : resolve())
        )
      })
    }

    if (!autoCopyEnabled) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 500)
      })
      clipboard.writeText(previousClipboardContent)
    }

    return true
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
  hotkeyManager.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

