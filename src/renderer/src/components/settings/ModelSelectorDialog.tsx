import { useState, useEffect } from 'react'
import { Theme, lightTheme } from '../../utils/theme'

interface ModelSelectorDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (modelId: string) => void
  currentModelId: string
  theme?: Theme
}

interface ModelOption {
  id: string
  name: string
  description: string
  size: string
  quality: string
  speed: string
  bundled: boolean
  huggingfaceFolder: string
}

const MODELS: ModelOption[] = [
  {
    id: 'openai_whisper-base',
    name: 'Base',
    description: 'Lightweight model for basic transcription',
    size: '~150 MB',
    quality: 'Basic',
    speed: 'Very Fast',
    bundled: true,
    huggingfaceFolder: 'openai_whisper-base'
  },
  {
    id: 'openai_whisper-large-v3-v20240930_turbo_632MB',
    name: 'Turbo',
    description: 'High-quality model optimized for speed',
    size: '~632 MB',
    quality: 'Excellent',
    speed: 'Fast',
    bundled: false,
    huggingfaceFolder: 'openai_whisper-large-v3-v20240930_turbo_632MB'
  },
  {
    id: 'openai_whisper-large-v3_947MB',
    name: 'Large',
    description: 'Best quality for accurate transcription',
    size: '~947 MB',
    quality: 'Excellent',
    speed: 'Fast',
    bundled: false,
    huggingfaceFolder: 'openai_whisper-large-v3_947MB'
  }
]

interface DownloadProgress {
  modelId: string
  percent: number
  downloadedFormatted: string
  totalFormatted: string
}

export function ModelSelectorDialog({
  isOpen,
  onClose,
  onSave,
  currentModelId,
  theme = lightTheme
}: ModelSelectorDialogProps) {
  const [selectedModelId, setSelectedModelId] = useState(currentModelId)
  const [installedModels, setInstalledModels] = useState<Set<string>>(new Set(['openai_whisper-base']))
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadInstalledModels()
      setSelectedModelId(currentModelId)
      setError(null)
    }
  }, [isOpen, currentModelId])

  useEffect(() => {
    if (!isOpen) return

    // Listen for download progress
    const removeListener = window.bridge?.onDownloadProgress?.((progress: DownloadProgress) => {
      setDownloadProgress(progress)
    })

    return () => {
      if (removeListener) removeListener()
    }
  }, [isOpen])

  const loadInstalledModels = async () => {
    try {
      if (window.bridge?.getInstalledModels) {
        const models = await window.bridge.getInstalledModels()
        setInstalledModels(new Set(['openai_whisper-base', ...models]))
      }
    } catch (err) {
      console.error('Failed to load installed models:', err)
    }
  }

  const handleDownload = async (modelId: string) => {
    try {
      setError(null)
      setDownloadingModel(modelId)
      setDownloadProgress(null)

      if (window.bridge?.downloadModel) {
        await window.bridge.downloadModel(modelId)
        await loadInstalledModels()
      }
    } catch (err) {
      console.error('Download failed:', err)
      setError(`Failed to download ${MODELS.find(m => m.id === modelId)?.name}: ${err}`)
    } finally {
      setDownloadingModel(null)
      setDownloadProgress(null)
    }
  }

  const handleDelete = async (modelId: string) => {
    if (modelId === currentModelId) {
      setError('Cannot delete the currently active model')
      return
    }

    try {
      setError(null)
      if (window.bridge?.deleteModel) {
        await window.bridge.deleteModel(modelId)
        await loadInstalledModels()
        if (selectedModelId === modelId) {
          setSelectedModelId('openai_whisper-base')
        }
      }
    } catch (err) {
      console.error('Delete failed:', err)
      setError(`Failed to delete model: ${err}`)
    }
  }

  const handleSave = async () => {
    if (selectedModelId === currentModelId) {
      onClose()
      return
    }

    // Close dialog immediately and switch in background
    onSave(selectedModelId)
    onClose()

    // Start the switch in the background (non-blocking)
    if (window.bridge?.switchModel) {
      window.bridge.switchModel(selectedModelId).catch((err) => {
        console.error('Background model switch failed:', err)
        // Error will be handled by main process, user will see fallback behavior
      })
    }
  }

  const handleOpenModelsFolder = async () => {
    try {
      if (window.bridge?.openModelsFolder) {
        await window.bridge.openModelsFolder()
      }
    } catch (err) {
      console.error('Failed to open models folder:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
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
        backdropFilter: 'blur(8px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !downloadingModel && !switching) {
          onClose()
        }
      }}
    >
      <div
        style={{
          background: theme.modalBackground,
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '32px',
          minWidth: '600px',
          maxWidth: '700px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: `1px solid ${theme.modalBorder}`
        }}
      >
        <h2
          style={{
            color: theme.text,
            fontSize: '20px',
            fontWeight: '600',
            margin: 0
          }}
        >
          Select Model
        </h2>

        {/* Model Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {MODELS.map((model) => {
            const isInstalled = installedModels.has(model.id)
            const isSelected = selectedModelId === model.id
            const isDownloading = downloadingModel === model.id
            const isCurrent = currentModelId === model.id
            const showProgress = isDownloading && downloadProgress?.modelId === model.id

            return (
              <div
                key={model.id}
                style={{
                  background: isSelected ? theme.modalSurface : theme.buttonBg,
                  border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: isInstalled ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  opacity: !isInstalled && !isDownloading ? 0.7 : 1
                }}
                onClick={() => {
                  if (isInstalled && !isDownloading && !switching) {
                    setSelectedModelId(model.id)
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  {/* Radio Button */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                      background: isSelected ? theme.accent : 'transparent',
                      flexShrink: 0,
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: theme.toggleThumb
                        }}
                      />
                    )}
                  </div>

                  {/* Model Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3
                        style={{
                          color: theme.text,
                          fontSize: '18px',
                          fontWeight: '600',
                          margin: 0
                        }}
                      >
                        {model.name}
                      </h3>
                      {model.name === 'Turbo' && (
                        <span
                          style={{
                            background: theme.accent,
                            color: theme.toggleThumb,
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase'
                          }}
                        >
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        color: theme.textSecondary,
                        fontSize: '14px',
                        margin: '0 0 12px 0'
                      }}
                    >
                      {model.description}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: theme.textSecondary }}>
                      <span>💾 {model.size}</span>
                      <span>⚙️ {model.quality}</span>
                      <span>⚡ {model.speed}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isInstalled ? (
                      <>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: theme.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.toggleThumb,
                            fontSize: '16px'
                          }}
                        >
                          ✓
                        </div>
                        {!model.bundled && !isCurrent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(model.id)
                            }}
                            disabled={switching}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: theme.buttonBg,
                              border: `1px solid ${theme.border}`,
                              color: theme.text,
                              fontSize: '16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = theme.buttonHover
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = theme.buttonBg
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(model.id)
                        }}
                        disabled={isDownloading || switching}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          background: isDownloading ? theme.buttonBg : theme.accent,
                          border: 'none',
                          color: isDownloading ? theme.textSecondary : theme.toggleThumb,
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: isDownloading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          if (!isDownloading) {
                            e.currentTarget.style.background = theme.accentHover
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDownloading) {
                            e.currentTarget.style.background = theme.accent
                          }
                        }}
                      >
                        {isDownloading ? 'Downloading...' : 'Download'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {showProgress && downloadProgress && (
                  <div style={{ marginTop: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: theme.textSecondary
                      }}
                    >
                      <span>Downloading...</span>
                      <span>
                        {downloadProgress.downloadedFormatted} / {downloadProgress.totalFormatted} (
                        {downloadProgress.percent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        background: theme.buttonBg,
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${downloadProgress.percent}%`,
                          height: '100%',
                          background: theme.accent,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(255, 59, 48, 0.1)',
              border: '1px solid rgba(255, 59, 48, 0.3)',
              color: '#ff3b30',
              fontSize: '13px'
            }}
          >
            {error}
          </div>
        )}

        {/* Switching Message */}
        {switching && (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: theme.modalSurface,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              fontSize: '13px',
              textAlign: 'center'
            }}
          >
            Switching model...
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleOpenModelsFolder}
            disabled={switching || downloadingModel !== null}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: theme.buttonBg,
              backdropFilter: 'blur(8px)',
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: switching || downloadingModel ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!switching && !downloadingModel) {
                e.currentTarget.style.background = theme.buttonHover
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.buttonBg
            }}
          >
            Open Models Folder
          </button>
          <button
            onClick={onClose}
            disabled={switching || downloadingModel !== null}
            style={{
              padding: '12px 24px',
              background: theme.buttonBg,
              backdropFilter: 'blur(8px)',
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: switching || downloadingModel ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!switching && !downloadingModel) {
                e.currentTarget.style.background = theme.buttonHover
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.buttonBg
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={switching || downloadingModel !== null || !installedModels.has(selectedModelId)}
            style={{
              padding: '12px 24px',
              background:
                switching || downloadingModel || !installedModels.has(selectedModelId)
                  ? theme.buttonBg
                  : theme.accent,
              backdropFilter: 'blur(8px)',
              color:
                switching || downloadingModel || !installedModels.has(selectedModelId)
                  ? theme.textDisabled
                  : theme.toggleThumb,
              border:
                switching || downloadingModel || !installedModels.has(selectedModelId)
                  ? `1px solid ${theme.border}`
                  : 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor:
                switching || downloadingModel || !installedModels.has(selectedModelId)
                  ? 'not-allowed'
                  : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!switching && !downloadingModel && installedModels.has(selectedModelId)) {
                e.currentTarget.style.background = theme.accentHover
              }
            }}
            onMouseLeave={(e) => {
              if (!switching && !downloadingModel && installedModels.has(selectedModelId)) {
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

