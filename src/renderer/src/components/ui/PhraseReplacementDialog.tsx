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
        borderRadius: '20px',
        padding: '32px',
        width: '700px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: `1px solid ${theme.modalBorder}`,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <h2 style={{
            color: theme.text,
            fontSize: '24px',
            fontWeight: '700',
            margin: 0,
          }}>
            Phrase Replacements
          </h2>
          <div style={{
            color: theme.textSecondary,
            fontSize: '14px',
            fontWeight: '500',
            background: theme.modalSurface,
            padding: '6px 12px',
            borderRadius: '20px',
            border: `1px solid ${theme.modalBorder}`,
          }}>
            {phrases.length} {phrases.length === 1 ? 'rule' : 'rules'}
          </div>
        </div>

        <div style={{
          background: theme.modalSurface,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${theme.modalBorder}`,
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
          }}>
            <div style={{ flex: 1 }}>
              <label style={{
                color: theme.text,
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '8px',
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Replace
              </label>
              <input
                type="text"
                value={originalPhrase}
                onChange={(e) => setOriginalPhrase(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter phrase to replace..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: theme.modalBackground,
                  border: `2px solid ${theme.modalBorder}`,
                  borderRadius: '12px',
                  color: theme.text,
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.accent
                  e.target.style.boxShadow = `0 0 0 3px ${theme.accent}20`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.modalBorder
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{
                color: theme.text,
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '8px',
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                With
              </label>
              <input
                type="text"
                value={replacementPhrase}
                onChange={(e) => setReplacementPhrase(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter replacement phrase..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: theme.modalBackground,
                  border: `2px solid ${theme.modalBorder}`,
                  borderRadius: '12px',
                  color: theme.text,
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.accent
                  e.target.style.boxShadow = `0 0 0 3px ${theme.accent}20`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.modalBorder
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <button
              onClick={handleAddPhrase}
              disabled={!originalPhrase.trim() || !replacementPhrase.trim()}
              style={{
                padding: '14px 20px',
                background: (!originalPhrase.trim() || !replacementPhrase.trim()) ? theme.buttonBg : theme.accent,
                color: (!originalPhrase.trim() || !replacementPhrase.trim()) ? theme.textDisabled : theme.toggleThumb,
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (!originalPhrase.trim() || !replacementPhrase.trim()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
              onMouseEnter={(e) => {
                if (originalPhrase.trim() && replacementPhrase.trim()) {
                  e.currentTarget.style.background = theme.accentHover
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                if (originalPhrase.trim() && replacementPhrase.trim()) {
                  e.currentTarget.style.background = theme.accent
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>+</span>
              Add
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: '0',
          maxHeight: '350px',
          paddingRight: '4px',
        }}>
          {phrases.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: theme.textSecondary,
              fontSize: '15px',
              padding: '60px 20px',
              background: theme.modalSurface,
              borderRadius: '16px',
              border: `2px dashed ${theme.modalBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                fontSize: '48px',
                opacity: 0.3,
              }}>
                📝
              </div>
              <div>
                No phrase replacements yet
              </div>
              <div style={{
                fontSize: '13px',
                opacity: 0.7,
              }}>
                Add your first replacement rule above
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {phrases.map((phrase, index) => (
                <div
                  key={phrase.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    background: theme.modalSurface,
                    borderRadius: '12px',
                    border: `1px solid ${theme.modalBorder}`,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.accent
                    e.currentTarget.style.boxShadow = `0 4px 12px ${theme.accent}15`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.modalBorder
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '24px',
                    height: '24px',
                    background: theme.accent,
                    color: theme.toggleThumb,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    {index + 1}
                  </div>
                  
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginLeft: '20px',
                  }}>
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{
                        color: theme.text,
                        fontSize: '15px',
                        fontWeight: '500',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }}>
                        {phrase.original}
                      </div>
                    </div>
                    
                    <div style={{
                      color: theme.accent,
                      fontSize: '18px',
                      fontWeight: '600',
                    }}>
                      →
                    </div>
                    
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{
                        color: theme.text,
                        fontSize: '15px',
                        fontWeight: '500',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }}>
                        {phrase.replacement}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemovePhrase(phrase.id)}
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      color: theme.textSecondary,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ef4444'
                      e.currentTarget.style.color = 'white'
                      e.currentTarget.style.borderColor = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = theme.textSecondary
                      e.currentTarget.style.borderColor = theme.border
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>×</span>
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
          paddingTop: '20px',
          borderTop: `1px solid ${theme.modalBorder}`,
        }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: '14px 24px',
              background: theme.buttonBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.buttonHover
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.buttonBg
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px 24px',
              background: theme.accent,
              color: theme.toggleThumb,
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.accentHover
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.accent
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
