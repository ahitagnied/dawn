import { useState, useEffect } from 'react'
import { Button } from './Button'

interface HotkeyDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (hotkey: string) => void
  currentHotkey?: string
  title?: string
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

function formatKey(key: string): string {
  return KEY_SYMBOLS[key] || key.toUpperCase()
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

export function HotkeyDialog({ isOpen, onClose, onSave, currentHotkey, title = 'Press the hotkey you want to use to start recording:' }: HotkeyDialogProps) {
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
        keys.add(e.key)
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
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '16px',
        padding: '48px',
        minWidth: '500px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <h2 style={{
          color: 'white',
          fontSize: '18px',
          fontWeight: '500',
          margin: 0,
          textAlign: 'center',
          lineHeight: '1.5',
        }}>
          {title}
        </h2>

        <div style={{
          background: '#2a2a2a',
          borderRadius: '12px',
          padding: '24px 32px',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          minWidth: '300px',
          border: '2px solid #3a3a3a',
        }}>
          {displayKeys.length > 0 ? (
            <>
              {displayKeys.map((key, index) => (
                <span key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    color: 'white',
                    fontSize: '28px',
                    fontWeight: '500',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}>
                    {formatKey(key)}
                  </span>
                  {index < displayKeys.length - 1 && (
                    <span style={{ color: 'white', fontSize: '28px', opacity: 0.5 }}>+</span>
                  )}
                </span>
              ))}
            </>
          ) : (
            <span style={{
              color: '#666',
              fontSize: '16px',
            }}>
              Press any key combination...
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
              background: '#2a2a2a',
              color: 'white',
              border: '1px solid #3a3a3a',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3a3a3a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2a2a2a'
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
              background: displayKeys.length === 0 ? '#3a3a3a' : '#007AFF',
              color: displayKeys.length === 0 ? '#666' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: displayKeys.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (displayKeys.length > 0) {
                e.currentTarget.style.background = '#0056b3'
              }
            }}
            onMouseLeave={(e) => {
              if (displayKeys.length > 0) {
                e.currentTarget.style.background = '#007AFF'
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

