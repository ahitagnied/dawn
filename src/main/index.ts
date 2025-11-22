import { app, BrowserWindow, screen, ipcMain, clipboard, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { config } from 'dotenv'
import Groq from 'groq-sdk'
import { enhanceTranscription } from './services/llm-enhancer'
import { hotkeyManager, HotkeyMode } from './services/hotkey-manager'
import { whisperKitService } from './services/whisperkit-service'
import { modelDownloadService } from './services/model-download-service'
import { shell } from 'electron'

config({ path: join(__dirname, '../../.env') })

// Settings persistence
interface AppSettings {
  autoCopy?: boolean
  pressEnterAfter?: boolean
  selectedModelId?: string
}

const getSettingsPath = (): string => {
  return join(app.getPath('userData'), 'settings.json')
}

const loadSettings = (): AppSettings => {
  try {
    const settingsPath = getSettingsPath()
    if (existsSync(settingsPath)) {
      const data = readFileSync(settingsPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('[Settings] Failed to load settings:', error)
  }
  return {}
}

const saveSettings = (settings: AppSettings): void => {
  try {
    const settingsPath = getSettingsPath()
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (error) {
    console.error('[Settings] Failed to save settings:', error)
  }
}

type RecordingMode = 'push-to-talk' | 'transcription' | 'assistant' | 'idle'

// Application state
let previousVolume = 0
let autoMuteEnabled = true
let soundEffectsEnabled = false
let smartTranscriptionEnabled = false
let cloudTranscriptionEnabled = false
let localTranscriptionEnabled = true
let assistantModeEnabled = true
let assistantScreenshotEnabled = false
const assistantModel = 'meta-llama/llama-4-maverick-17b-128e-instruct'
let selectedTextBeforeRecording: string | null = null
let autoCopyEnabled = true
let pressEnterAfterEnabled = false
let lastRecordingMode: RecordingMode = 'idle'
let selectedModelId = 'openai_whisper-base' // Default model

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
): void => {
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

const handleRecordingCancel = async (mode: HotkeyMode): Promise<void> => {
  console.log(`[Main] Recording canceled (quick release): ${mode}`)

  // Notify all windows to cancel recording (won't send to API)
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('record:cancel')
  })

  // Don't play the stop sound for canceled recordings
  // Just restore system volume if needed
  if (autoMuteEnabled && process.platform === 'darwin') {
    setMacVolume(previousVolume).catch((error) => {
      console.error('Failed to restore system volume:', error)
    })
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  // Load persisted settings
  const settings = loadSettings()
  if (settings.autoCopy !== undefined) {
    autoCopyEnabled = settings.autoCopy
  }
  if (settings.pressEnterAfter !== undefined) {
    pressEnterAfterEnabled = settings.pressEnterAfter
  }
  if (settings.selectedModelId !== undefined) {
    selectedModelId = settings.selectedModelId
    console.log('[Main] Loaded persisted model selection:', selectedModelId)
  }

  createMainWindow()
  createOverlayWindow()

  // Initialize hotkey manager
  hotkeyManager.initialize({
    onRecordingStart: handleRecordingStart,
    onRecordingStop: handleRecordingStop,
    onRecordingCancel: handleRecordingCancel
  })

  // Register default hotkeys
  hotkeyManager.registerHotkey('push-to-talk', 'Option ⌥')
  hotkeyManager.registerHotkey('transcription', 'Option ⌥ + Shift ⇧ + Z')
  hotkeyManager.registerHotkey('assistant', 'Option ⌥ + Shift ⇧ + S')

  // Initialize WhisperKit if available and local transcription is enabled
  // Start base model and selected model in parallel (or just base if that's selected)
  if (localTranscriptionEnabled && whisperKitService.isAvailable()) {
    console.log('[Main] WhisperKit is available, starting servers in background...')
    console.log('[Main] Selected model:', selectedModelId)
    
    if (selectedModelId === 'openai_whisper-base') {
      // Only start base model
      whisperKitService.startServerForModel('openai_whisper-base')
        .then(() => {
          console.log('[Main] Base model server started successfully')
        })
        .catch((error) => {
          console.error('[Main] Failed to start base model server:', error)
        })
    } else {
      // Start both base (fallback) and selected model in parallel
      whisperKitService.startServerForModel('openai_whisper-base')
        .then(() => {
          console.log('[Main] Base model server started successfully')
        })
        .catch((error) => {
          console.error('[Main] Failed to start base model server:', error)
        })
      
      // Set the selected model as current and start it
      whisperKitService.switchModel(selectedModelId)
        .then(() => {
          console.log('[Main] Selected model server started successfully')
        })
        .catch((error) => {
          console.error('[Main] Failed to start selected model server:', error)
          console.log('[Main] Will fall back to base model or Groq API for transcription')
        })
    }
  } else if (localTranscriptionEnabled) {
    console.log(
      '[Main] WhisperKit not available locally; enable Cloud Transcription to use Groq API fallback'
    )
  }

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

  ipcMain.handle('settings:update-cloud-transcription', async (_evt, enabled: boolean) => {
    cloudTranscriptionEnabled = enabled
    console.log('Updated cloud transcription enabled:', cloudTranscriptionEnabled)
  })

  ipcMain.handle('settings:update-local-transcription', async (_evt, enabled: boolean) => {
    localTranscriptionEnabled = enabled
    console.log('Updated local transcription enabled:', localTranscriptionEnabled)
    
    // Start or stop WhisperKit servers based on setting
    if (enabled && whisperKitService.isAvailable()) {
      try {
        // Start base model as fallback
        await whisperKitService.startServerForModel('openai_whisper-base')
        console.log('[Main] Base model server started')
        
        // Start current model if different
        const currentModel = whisperKitService.getCurrentModel()
        if (currentModel !== 'openai_whisper-base') {
          await whisperKitService.startServer()
          console.log('[Main] Current model server started')
        }
      } catch (error) {
        console.error('[Main] Failed to start WhisperKit servers:', error)
      }
    } else if (!enabled) {
      whisperKitService.stopServer()
      console.log('[Main] WhisperKit servers stopped')
    }
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
      pressEnterAfter: pressEnterAfterEnabled,
      selectedModelId
    }
  })

  ipcMain.handle('settings:update-auto-copy', async (_evt, enabled: boolean) => {
    autoCopyEnabled = enabled
    console.log('Updated auto copy enabled:', autoCopyEnabled)
    saveSettings({ autoCopy: autoCopyEnabled, pressEnterAfter: pressEnterAfterEnabled, selectedModelId })
  })

  ipcMain.handle('settings:update-press-enter-after', async (_evt, enabled: boolean) => {
    pressEnterAfterEnabled = enabled
    console.log('Updated press enter after enabled:', pressEnterAfterEnabled)
    saveSettings({ autoCopy: autoCopyEnabled, pressEnterAfter: pressEnterAfterEnabled, selectedModelId })
  })

  ipcMain.handle(
    'settings:sync',
    async (_evt, settings: { autoCopy: boolean; pressEnterAfter: boolean }) => {
      autoCopyEnabled = settings.autoCopy
      pressEnterAfterEnabled = settings.pressEnterAfter
      console.log('Synced settings from renderer:', {
        autoCopy: autoCopyEnabled,
        pressEnterAfter: pressEnterAfterEnabled
      })
      saveSettings({ autoCopy: autoCopyEnabled, pressEnterAfter: pressEnterAfterEnabled, selectedModelId })
    }
  )

  // Model management IPC handlers
  ipcMain.handle('models:get-installed', async () => {
    try {
      const installedModels = await modelDownloadService.getInstalledModels()
      console.log('[Models] Installed models:', installedModels)
      return installedModels
    } catch (error) {
      console.error('[Models] Failed to get installed models:', error)
      return []
    }
  })

  ipcMain.handle('models:download', async (_evt, modelId: string) => {
    try {
      console.log('[Models] Starting download for:', modelId)
      
      // Register progress callback
      const mainWindow = findWindowByType('main')
      if (mainWindow) {
        modelDownloadService.onProgress(modelId, (progress) => {
          mainWindow.webContents.send('models:download-progress', progress)
        })
      }

      await modelDownloadService.downloadModel(modelId)
      
      // Cleanup progress callback
      modelDownloadService.offProgress(modelId)
      
      console.log('[Models] Download completed:', modelId)
    } catch (error) {
      console.error('[Models] Download failed:', error)
      modelDownloadService.offProgress(modelId)
      throw error
    }
  })

  ipcMain.handle('models:delete', async (_evt, modelId: string) => {
    try {
      console.log('[Models] Deleting model:', modelId)
      await modelDownloadService.deleteModel(modelId)
      console.log('[Models] Model deleted:', modelId)
    } catch (error) {
      console.error('[Models] Delete failed:', error)
      throw error
    }
  })

  ipcMain.handle('models:switch', async (_evt, modelId: string) => {
    // Start the switch in the background, don't wait for it
    console.log('[Models] Starting background switch to model:', modelId)
    
    // Update and persist selected model
    selectedModelId = modelId
    saveSettings({ autoCopy: autoCopyEnabled, pressEnterAfter: pressEnterAfterEnabled, selectedModelId })
    console.log('[Models] Persisted model selection:', selectedModelId)
    
    // Fire and forget - the switch will happen in the background
    whisperKitService.switchModel(modelId).then(() => {
      console.log('[Models] Background model switch completed successfully')
      
      // Ensure base model stays running as fallback (unless base is selected)
      if (modelId !== 'openai_whisper-base' && !whisperKitService.isServerReady('openai_whisper-base')) {
        whisperKitService.startServerForModel('openai_whisper-base').catch((err) => {
          console.error('[Models] Failed to ensure base model running:', err)
        })
      }
    }).catch((error) => {
      console.error('[Models] Background switch failed:', error)
      // Server will fall back to Groq or base model during this time
    })
    
    // Return immediately so UI isn't blocked
    return Promise.resolve()
  })

  ipcMain.handle('models:get-info', async (_evt, modelId: string) => {
    try {
      const info = await modelDownloadService.getModelInfo(modelId)
      return info
    } catch (error) {
      console.error('[Models] Failed to get model info:', error)
      throw error
    }
  })

  ipcMain.handle('models:get-current', async () => {
    return selectedModelId
  })

  ipcMain.handle('models:open-folder', async () => {
    try {
      const modelsPath = modelDownloadService.getModelsBasePath()
      console.log('[Models] Opening models folder:', modelsPath)
      await shell.openPath(modelsPath)
    } catch (error) {
      console.error('[Models] Failed to open models folder:', error)
      throw error
    }
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
      const canUseLocal = localTranscriptionEnabled && whisperKitService.isAvailable()
      const primaryLocalModel =
        whisperKitService.getCurrentModel() || selectedModelId || 'openai_whisper-base'
      let transcriptionText = ''

      const transcribeWithLocal = async (modelId: string): Promise<string | null> => {
        try {
          console.log(`[Main] Ensuring server for ${modelId} is ready...`)
          await whisperKitService.startServerForModel(modelId)
          const result = await whisperKitService.transcribe(
            file,
            {
              temperature: 0
            },
            modelId
          )
          console.log(`[Main] Local transcription successful using ${modelId}`)
          return result.text
        } catch (error) {
          console.error(`[Main] Local transcription failed for ${modelId}:`, error)
          return null
        }
      }

      const transcribeWithGroq = async (): Promise<string | null> => {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

        let retries = 3
        while (retries > 0) {
          try {
            const groqResult = await groq.audio.transcriptions.create({
              file: fs.createReadStream(file),
              model: 'whisper-large-v3-turbo',
              temperature: 0,
              response_format: 'verbose_json'
            })
            console.log('[Main] Groq transcription successful')
            return groqResult.text
          } catch (error) {
            retries--
            if (retries === 0) {
              console.error('STT failed after 3 attempts:', error)
              break
            } else {
              console.log(`STT connection failed, retrying... (${retries} attempts left)`)
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }
          }
        }

        return null
      }

      if (cloudTranscriptionEnabled) {
        console.log('[Main] Cloud transcription enabled, trying Groq first...')
        const groqText = await transcribeWithGroq()
        if (groqText) {
          transcriptionText = groqText
        } else {
          console.log('[Main] Groq transcription failed, falling back to local models')
        }
      }

      if (!transcriptionText && canUseLocal) {
        console.log(`[Main] Using local model ${primaryLocalModel} for transcription...`)
        const localText = await transcribeWithLocal(primaryLocalModel)
        if (localText) {
          transcriptionText = localText
        }
      }

      if (!transcriptionText && canUseLocal && primaryLocalModel !== 'openai_whisper-base') {
        console.log('[Main] Local model failed, attempting base model fallback...')
        const baseText = await transcribeWithLocal('openai_whisper-base')
        if (baseText) {
          transcriptionText = baseText
        }
      }

      if (!transcriptionText && !cloudTranscriptionEnabled && !canUseLocal) {
        throw new Error(
          'Transcription failed: cloud transcription is off and local transcription is unavailable'
        )
      }

      if (!transcriptionText && cloudTranscriptionEnabled && !canUseLocal) {
        throw new Error(
          'Transcription failed: cloud transcription failed and local transcription is unavailable'
        )
      }

      if (!transcriptionText) {
        throw new Error('All transcription methods failed')
      }

      const transcription = { text: transcriptionText }

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
    // Add space after punctuation for natural continuation
    const textWithSpace = text + ' '
    clipboard.writeText(textWithSpace)

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
  whisperKitService.stopServer()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
