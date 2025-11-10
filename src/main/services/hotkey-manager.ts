import { globalShortcut } from 'electron'
import { uIOhook } from 'uiohook-napi'

/**
 * Centralized hotkey manager using Electron's globalShortcut API for toggle modes
 * and uIOhook for push-to-talk (which requires keyup detection)
 *
 * This is a cleaner, more maintainable implementation that centralizes all hotkey logic
 */

export type HotkeyMode = 'push-to-talk' | 'transcription' | 'assistant'

interface HotkeyCallbacks {
  onRecordingStart: (mode: HotkeyMode) => void
  onRecordingStop: (mode: HotkeyMode) => void
}

class HotkeyManager {
  private registeredHotkeys: Map<HotkeyMode, string> = new Map()
  private activeToggles: Set<HotkeyMode> = new Set()
  private callbacks: HotkeyCallbacks | null = null
  private isRecording = false
  private currentMode: HotkeyMode | null = null

  // Push-to-talk specific state (requires uIOhook for keyup detection)
  private pushToTalkKeyGroups: number[][] = []
  private pressedKeys: Set<number> = new Set()
  private uiohookStarted = false

  /**
   * Convert display format hotkey to Electron accelerator format
   * Example: "Option ⌥ + Shift ⇧ + Z" -> "Alt+Shift+Z"
   */
  private convertToAccelerator(displayHotkey: string): string {
    const keyMap: Record<string, string> = {
      'Cmd ⌘': 'Command',
      'Ctrl ⌃': 'Control',
      'Option ⌥': 'Alt',
      'Shift ⇧': 'Shift',
      'Space ␣': 'Space',
      'Return ↵': 'Return',
      'Esc ⎋': 'Escape',
      'Tab ⇥': 'Tab',
      'Delete ⌫': 'Backspace',
      '↑': 'Up',
      '↓': 'Down',
      '←': 'Left',
      '→': 'Right'
    }

    const parts = displayHotkey.split(' + ').map((part) => part.trim())
    const acceleratorParts = parts.map((part) => {
      if (keyMap[part]) {
        return keyMap[part]
      }
      return part.toUpperCase()
    })

    return acceleratorParts.join('+')
  }

  /**
   * Convert display format hotkey to uIOhook keycodes (for push-to-talk)
   */
  private convertToKeycodes(displayHotkey: string): number[][] {
    const KEY_TO_KEYCODE: Record<string, number[]> = {
      'Cmd ⌘': [3675, 3676],
      'Ctrl ⌃': [29, 3613],
      'Option ⌥': [56, 3640],
      'Shift ⇧': [42, 54],
      '0': [11],
      '1': [2],
      '2': [3],
      '3': [4],
      '4': [5],
      '5': [6],
      '6': [7],
      '7': [8],
      '8': [9],
      '9': [10],
      '-': [12],
      '=': [13],
      '[': [26],
      ']': [27],
      '\\': [43],
      ';': [39],
      "'": [40],
      ',': [51],
      '.': [52],
      '/': [53],
      '`': [41],
      'Space ␣': [57],
      'Return ↵': [28],
      'Esc ⎋': [1],
      'Tab ⇥': [15],
      'Delete ⌫': [14],
      '↑': [200],
      '↓': [208],
      '←': [203],
      '→': [205],
      A: [30],
      B: [48],
      C: [46],
      D: [32],
      E: [18],
      F: [33],
      G: [34],
      H: [35],
      I: [23],
      J: [36],
      K: [37],
      L: [38],
      M: [50],
      N: [49],
      O: [24],
      P: [25],
      Q: [16],
      R: [19],
      S: [31],
      T: [20],
      U: [22],
      V: [47],
      W: [17],
      X: [45],
      Y: [21],
      Z: [44]
    }

    const parts = displayHotkey.split(' + ').map((part) => part.trim())
    const keyGroups: number[][] = []

    for (const part of parts) {
      if (KEY_TO_KEYCODE[part]) {
        keyGroups.push(KEY_TO_KEYCODE[part])
      }
    }

    return keyGroups.length > 0 ? keyGroups : [[56, 3640]] // Default to Option
  }

  /**
   * Check if all keys in the key groups are pressed
   */
  private areAllKeysPressed(keyGroups: number[][]): boolean {
    return keyGroups.every((group) => group.some((keycode) => this.pressedKeys.has(keycode)))
  }

  /**
   * Initialize the hotkey manager with callbacks
   */
  initialize(callbacks: HotkeyCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * Start uIOhook for push-to-talk functionality
   */
  private startUIOhook(): void {
    if (this.uiohookStarted) return

    uIOhook.on('keydown', (e) => {
      this.pressedKeys.add(e.keycode)

      if (
        !this.isRecording &&
        this.pushToTalkKeyGroups.length > 0 &&
        this.areAllKeysPressed(this.pushToTalkKeyGroups)
      ) {
        this.isRecording = true
        this.currentMode = 'push-to-talk'
        this.callbacks?.onRecordingStart('push-to-talk')
      }
    })

    uIOhook.on('keyup', (e) => {
      this.pressedKeys.delete(e.keycode)

      if (
        this.isRecording &&
        this.currentMode === 'push-to-talk' &&
        !this.areAllKeysPressed(this.pushToTalkKeyGroups)
      ) {
        this.isRecording = false
        this.currentMode = null
        this.callbacks?.onRecordingStop('push-to-talk')
      }
    })

    uIOhook.start()
    this.uiohookStarted = true
    console.log('[HotkeyManager] uIOhook started for push-to-talk')
  }

  /**
   * Register a hotkey for a specific mode
   */
  registerHotkey(mode: HotkeyMode, displayHotkey: string): boolean {
    try {
      console.log(`[HotkeyManager] Registering ${mode}: ${displayHotkey}`)

      if (mode === 'push-to-talk') {
        // Use uIOhook for push-to-talk (needs keyup detection)
        this.pushToTalkKeyGroups = this.convertToKeycodes(displayHotkey)
        this.startUIOhook()
        console.log(
          `[HotkeyManager] Push-to-talk registered with keycodes:`,
          this.pushToTalkKeyGroups
        )
        return true
      } else {
        // Use globalShortcut for toggle modes
        this.unregisterHotkey(mode)
        const accelerator = this.convertToAccelerator(displayHotkey)

        const success = globalShortcut.register(accelerator, () => {
          this.handleToggleHotkey(mode)
        })

        if (success) {
          this.registeredHotkeys.set(mode, accelerator)
          console.log(`[HotkeyManager] Successfully registered ${mode} hotkey: ${accelerator}`)
        } else {
          console.error(`[HotkeyManager] Failed to register ${mode} hotkey: ${accelerator}`)
        }

        return success
      }
    } catch (error) {
      console.error(`[HotkeyManager] Error registering ${mode} hotkey:`, error)
      return false
    }
  }

  /**
   * Handle toggle hotkey press (transcription, assistant)
   */
  private handleToggleHotkey(mode: HotkeyMode): void {
    if (!this.callbacks) {
      console.error('[HotkeyManager] No callbacks registered')
      return
    }

    if (this.activeToggles.has(mode)) {
      // Stop recording
      this.activeToggles.delete(mode)
      this.isRecording = false
      this.currentMode = null
      this.callbacks.onRecordingStop(mode)
    } else {
      // Start recording
      this.activeToggles.add(mode)
      this.isRecording = true
      this.currentMode = mode
      this.callbacks.onRecordingStart(mode)
    }
  }

  /**
   * Unregister a hotkey for a specific mode
   */
  unregisterHotkey(mode: HotkeyMode): void {
    if (mode === 'push-to-talk') {
      this.pushToTalkKeyGroups = []
      return
    }

    const accelerator = this.registeredHotkeys.get(mode)
    if (accelerator) {
      globalShortcut.unregister(accelerator)
      this.registeredHotkeys.delete(mode)
      console.log(`[HotkeyManager] Unregistered ${mode} hotkey`)
    }
  }

  /**
   * Unregister all hotkeys and cleanup
   */
  unregisterAll(): void {
    globalShortcut.unregisterAll()
    this.registeredHotkeys.clear()
    this.activeToggles.clear()
    this.pushToTalkKeyGroups = []
    this.isRecording = false
    this.currentMode = null

    if (this.uiohookStarted) {
      uIOhook.removeAllListeners()
      try {
        uIOhook.stop()
      } catch {
        // Ignore errors on stop
      }
      this.uiohookStarted = false
    }

    console.log('[HotkeyManager] Unregistered all hotkeys')
  }

  /**
   * Check if a specific mode is currently active
   */
  isActive(mode: HotkeyMode): boolean {
    return this.activeToggles.has(mode) || (this.isRecording && this.currentMode === mode)
  }

  /**
   * Get current recording state
   */
  getRecordingState(): { isRecording: boolean; mode: HotkeyMode | null } {
    return {
      isRecording: this.isRecording,
      mode: this.currentMode
    }
  }
}

// Export singleton instance
export const hotkeyManager = new HotkeyManager()
