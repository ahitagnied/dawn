import { useState, useEffect } from 'react'
import { Theme, lightTheme } from '../../utils/theme'
import { PhrasePair } from '../../hooks/useSettings'

interface PhraseReplacementDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (phrases: PhrasePair[]) => void
  currentPhrases: PhrasePair[]
  theme?: Theme
}

export function PhraseReplacementDialog({
  isOpen,
  onClose,
  onSave,
  currentPhrases,
  theme = lightTheme,
}: PhraseReplacementDialogProps) {
  const [phrases, setPhrases] = useState<PhrasePair[]>(currentPhrases)
  const [originalPhrase, setOriginalPhrase] = useState('')
  const [replacementPhrase, setReplacementPhrase] = useState('')

  useEffect(() => {
    if (isOpen) {
      setPhrases(currentPhrases)
      setOriginalPhrase('')
      setReplacementPhrase('')
    }
  }, [isOpen, currentPhrases])

  const handleAddPhrase = () => {
    if (originalPhrase.trim() && replacementPhrase.trim()) {
      const newPhrase: PhrasePair = {
        id: Date.now().toString(),
        original: originalPhrase.trim(),
        replacement: replacementPhrase.trim()
      }
      setPhrases([...phrases, newPhrase])
      setOriginalPhrase('')
      setReplacementPhrase('')
    }
  }

  const handleRemovePhrase = (id: string) => {
    setPhrases(phrases.filter(phrase => phrase.id !== id))
  }

  const handleSave = () => {
    onSave(phrases)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddPhrase()
    }
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
        padding: '32px',
        minWidth: '600px',
        maxWidth: '800px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: `1px solid ${theme.modalBorder}`,
        overflow: 'hidden',
      }}>
        <h2 style={{
          color: theme.text,
          fontSize: '20px',
          fontWeight: '600',
          margin: 0,
          textAlign: 'center',
        }}>
          Manage Phrase Replacements
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div>
            <label style={{
              color: theme.text,
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              display: 'block',
            }}>
              Phrase to replace:
            </label>
            <input
              type="text"
              value={originalPhrase}
              onChange={(e) => setOriginalPhrase(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter phrase to replace..."
              style={{
                width: '100%',
                padding: '12px 16px',
                background: theme.modalSurface,
                border: `1px solid ${theme.modalBorder}`,
                borderRadius: '8px',
                color: theme.text,
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.accent
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.modalBorder
              }}
            />
          </div>

          <div>
            <label style={{
              color: theme.text,
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              display: 'block',
            }}>
              Replace with:
            </label>
            <input
              type="text"
              value={replacementPhrase}
              onChange={(e) => setReplacementPhrase(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter replacement phrase..."
              style={{
                width: '100%',
                padding: '12px 16px',
                background: theme.modalSurface,
                border: `1px solid ${theme.modalBorder}`,
                borderRadius: '8px',
                color: theme.text,
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.accent
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.modalBorder
              }}
            />
          </div>

          <button
            onClick={handleAddPhrase}
            disabled={!originalPhrase.trim() || !replacementPhrase.trim()}
            style={{
              padding: '10px 16px',
              background: (!originalPhrase.trim() || !replacementPhrase.trim()) ? theme.buttonBg : theme.accent,
              color: (!originalPhrase.trim() || !replacementPhrase.trim()) ? theme.textDisabled : theme.toggleThumb,
              border: (!originalPhrase.trim() || !replacementPhrase.trim()) ? `1px solid ${theme.border}` : 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (!originalPhrase.trim() || !replacementPhrase.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (originalPhrase.trim() && replacementPhrase.trim()) {
                e.currentTarget.style.background = theme.accentHover
              }
            }}
            onMouseLeave={(e) => {
              if (originalPhrase.trim() && replacementPhrase.trim()) {
                e.currentTarget.style.background = theme.accent
              }
            }}
          >
            Add Phrase
          </button>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: '0',
          maxHeight: '300px',
        }}>
          <div style={{
            color: theme.textSecondary,
            fontSize: '12px',
            marginBottom: '12px',
          }}>
            {phrases.length} {phrases.length === 1 ? 'rule' : 'rules'} configured
          </div>
          
          {phrases.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: theme.textSecondary,
              fontSize: '14px',
              padding: '40px 20px',
              background: theme.modalSurface,
              borderRadius: '8px',
              border: `1px solid ${theme.modalBorder}`,
            }}>
              No phrase replacements configured yet. Add your first rule above.
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {phrases.map((phrase) => (
                <div
                  key={phrase.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: theme.modalSurface,
                    borderRadius: '8px',
                    border: `1px solid ${theme.modalBorder}`,
                  }}
                >
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}>
                    <div style={{
                      color: theme.text,
                      fontSize: '14px',
                      fontWeight: '500',
                    }}>
                      {phrase.original}
                    </div>
                    <div style={{
                      color: theme.textSecondary,
                      fontSize: '13px',
                    }}>
                      → {phrase.replacement}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePhrase(phrase.id)}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      color: theme.textSecondary,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme.buttonHover
                      e.currentTarget.style.color = theme.text
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = theme.textSecondary
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: `1px solid ${theme.modalBorder}`,
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
            style={{
              flex: 1,
              padding: '12px 24px',
              background: theme.accent,
              backdropFilter: 'blur(8px)',
              color: theme.toggleThumb,
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.accentHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.accent
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
