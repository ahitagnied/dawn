import { useState, useEffect } from 'react'
import { Theme, lightTheme } from '../../utils/theme'

interface HotkeyDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (hotkey: string) => void
  currentHotkey?: string
  title?: string
  theme?: Theme
}

// Key code mappings for special keys
const KEY_SYMBOLS: Record<string, string> = {
  'Meta': 'Cmd ⌘',
  'Control': 'Ctrl ⌃',
  'Alt': 'Option ⌥',
  'Shift': 'Shift ⇧',
  ' ': 'Space ␣',
  'Enter': 'Return ↵',
  'Escape': 'Esc ⎋',
  'Tab': 'Tab ⇥',
  'Backspace': 'Delete ⌫',
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
  'ArrowRight': '→',
}

const MODIFIER_KEYS = ['Meta', 'Control', 'Alt', 'Shift']
const SPECIAL_KEYS = ['Enter', 'Escape', 'Tab', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']
const CODE_KEY_MAP: Record<string, string> = {
  'Space': ' ',
  'Enter': 'Enter',
  'NumpadEnter': 'Enter',
  'Escape': 'Escape',
  'Tab': 'Tab',
  'Backspace': 'Backspace',
  'ArrowUp': 'ArrowUp',
  'ArrowDown': 'ArrowDown',
  'ArrowLeft': 'ArrowLeft',
  'ArrowRight': 'ArrowRight',
  'BracketLeft': '[',
  'BracketRight': ']',
  'Backslash': '\\',
  'Semicolon': ';',
  'Quote': '\'',
  'Comma': ',',
  'Period': '.',
  'Slash': '/',
  'Backquote': '`',
  'Minus': '-',
  'Equal': '=',
}

function formatKey(key: string): string {
  return KEY_SYMBOLS[key] || key.toUpperCase()
}

function normalizeKey(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.includes(event.key)) {
    return null
  }

  const { code } = event

  if (code.startsWith('Key')) {
    return code.slice(3).toUpperCase()
  }

  if (code.startsWith('Digit')) {
    return code.slice(5)
  }

  if (CODE_KEY_MAP[code]) {
    return CODE_KEY_MAP[code]
  }

  if (SPECIAL_KEYS.includes(event.key)) {
    return event.key
  }

  if (event.key.length === 1) {
    return event.key.toUpperCase()
  }

  return event.key
}

function sortKeys(keys: string[]): string[] {
  const modifiers: string[] = []
  const specials: string[] = []
  const alphanumeric: string[] = []

  keys.forEach(key => {
    if (MODIFIER_KEYS.includes(key)) {
      modifiers.push(key)
    } else if (SPECIAL_KEYS.includes(key)) {
      specials.push(key)
    } else {
      alphanumeric.push(key)
    }
  })

  // Sort modifiers in specific order: Meta, Control, Alt, Shift
  const modifierOrder = ['Meta', 'Control', 'Alt', 'Shift']
  modifiers.sort((a, b) => modifierOrder.indexOf(a) - modifierOrder.indexOf(b))

  return [...modifiers, ...specials, ...alphanumeric]
}

export function HotkeyDialog({
  isOpen,
  onClose,
  onSave,
  currentHotkey,
  title = 'Press the hotkey you want to use to start recording:',
  theme = lightTheme,
}: HotkeyDialogProps) {
  const [recordedKeys, setRecordedKeys] = useState<Set<string>>(new Set())
  const [displayKeys, setDisplayKeys] = useState<string[]>([])
  const [allKeysReleased, setAllKeysReleased] = useState(true)

  useEffect(() => {
    if (!isOpen) {
      setRecordedKeys(new Set())
      setDisplayKeys([])
      setAllKeysReleased(true)
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // If all keys were released and user presses a new key, reset the recording
      let keys: Set<string>
      if (allKeysReleased) {
        keys = new Set()
        setAllKeysReleased(false)
      } else {
        keys = new Set(recordedKeys)
      }
      
      if (e.key === 'Meta' || e.metaKey) keys.add('Meta')
      if (e.key === 'Control' || e.ctrlKey) keys.add('Control')
      if (e.key === 'Alt' || e.altKey) keys.add('Alt')
      if (e.key === 'Shift' || e.shiftKey) keys.add('Shift')
      
      if (!MODIFIER_KEYS.includes(e.key)) {
        const normalizedKey = normalizeKey(e)
        if (normalizedKey) {
          keys.add(normalizedKey)
        }
      }

      setRecordedKeys(keys)
      const sortedKeys = sortKeys(Array.from(keys))
      setDisplayKeys(sortedKeys)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Check if all keys are now released
      // We need to check in the next tick to allow all keyup events to process
      setTimeout(() => {
        const anyKeyPressed = e.metaKey || e.ctrlKey || e.altKey || e.shiftKey
        if (!anyKeyPressed) {
          setAllKeysReleased(true)
        }
      }, 10)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [isOpen, recordedKeys, allKeysReleased])

  const handleSave = () => {
    if (displayKeys.length > 0) {
      const formattedHotkey = displayKeys.map(formatKey).join(' + ')
      onSave(formattedHotkey)
    }
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: theme.scrim,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: theme.modalBackground,
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        padding: '48px',
        minWidth: '500px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: `1px solid ${theme.modalBorder}`,
      }}>
        <h2 style={{
          color: theme.text,
          fontSize: '18px',
          fontWeight: '500',
          margin: 0,
          textAlign: 'center',
          lineHeight: '1.5',
        }}>
          {title}
        </h2>

        <div style={{
          background: theme.modalSurface,
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          padding: '24px 32px',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          minWidth: '300px',
          border: `2px solid ${theme.modalBorder}`,
        }}>
          {displayKeys.length > 0 ? (
            <>
              {displayKeys.map((key, index) => (
                <span key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    color: theme.text,
                    fontSize: '28px',
                    fontWeight: '500',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}>
                    {formatKey(key)}
                  </span>
                  {index < displayKeys.length - 1 && (
                    <span style={{ color: theme.text, fontSize: '28px', opacity: 0.5 }}>+</span>
                  )}
                </span>
              ))}
            </>
          ) : (
            <span style={{
              color: theme.textSecondary,
              fontSize: '16px',
            }}>
              {currentHotkey ? `Current hotkey: ${currentHotkey}` : 'Press any key combination...'}
            </span>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          width: '100%',
        }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: theme.buttonBg,
              backdropFilter: 'blur(8px)',
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.buttonHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.buttonBg
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={displayKeys.length === 0}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: displayKeys.length === 0 ? theme.buttonBg : theme.accent,
              backdropFilter: 'blur(8px)',
              color: displayKeys.length === 0 ? theme.textDisabled : theme.toggleThumb,
              border: displayKeys.length === 0 ? `1px solid ${theme.border}` : 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: displayKeys.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (displayKeys.length > 0) {
                e.currentTarget.style.background = theme.accentHover
              }
            }}
            onMouseLeave={(e) => {
              if (displayKeys.length > 0) {
                e.currentTarget.style.background = theme.accent
              }
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
