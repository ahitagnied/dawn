import { useState, useEffect } from 'react'
import { Theme, lightTheme } from '../../utils/theme'

interface AudioDevice {
  deviceId: string
  label: string
  kind: string
}

interface AudioDeviceDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (deviceId: string, deviceLabel: string) => void
  currentDeviceId?: string
  title?: string
  theme?: Theme
}

export function AudioDeviceDialog({
  isOpen,
  onClose,
  onSave,
  currentDeviceId,
  title = 'Select audio input device:',
  theme = lightTheme
}: AudioDeviceDialogProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(currentDeviceId || 'default')
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!isOpen) {
      setDevices([])
      setSelectedDeviceId(currentDeviceId || 'default')
      setLoading(true)
      return
    }

    const getAudioDevices = async () => {
      try {
        // First try to enumerate devices without requesting permission
        let deviceList = await navigator.mediaDevices.enumerateDevices()
        let audioInputDevices = deviceList.filter((device) => device.kind === 'audioinput')

        // If devices don't have labels, we need to request permission
        const needsPermission =
          audioInputDevices.length > 0 && audioInputDevices.every((d) => !d.label)

        if (needsPermission) {
          // Request microphone permission to get device labels
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          // Immediately stop the stream - we only needed it for permission
          stream.getTracks().forEach((track) => track.stop())

          // Now enumerate devices again to get labels
          deviceList = await navigator.mediaDevices.enumerateDevices()
          audioInputDevices = deviceList.filter((device) => device.kind === 'audioinput')
        }

        setDevices(audioInputDevices)

        // Set selected device to current device if it exists, otherwise default
        if (currentDeviceId && audioInputDevices.some((d) => d.deviceId === currentDeviceId)) {
          setSelectedDeviceId(currentDeviceId)
        } else {
          setSelectedDeviceId('default')
        }
      } catch (error) {
        console.error('Failed to get audio devices:', error)
        setDevices([])
      } finally {
        setLoading(false)
      }
    }

    getAudioDevices()
  }, [isOpen, currentDeviceId])

  const handleSave = () => {
    const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId)
    const deviceLabel =
      selectedDevice?.label || (selectedDeviceId === 'default' ? 'Default' : 'Unknown Device')
    onSave(selectedDeviceId, deviceLabel)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
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
    >
      <div
        style={{
          background: theme.modalBackground,
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '48px',
          minWidth: '500px',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: `1px solid ${theme.modalBorder}`
        }}
      >
        <h2
          style={{
            color: theme.text,
            fontSize: '18px',
            fontWeight: '500',
            margin: 0,
            textAlign: 'center',
            lineHeight: '1.5'
          }}
        >
          {title}
        </h2>

        <div
          style={{
            background: theme.modalSurface,
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '16px',
            width: '100%',
            maxHeight: '300px',
            overflowY: 'auto',
            border: `2px solid ${theme.modalBorder}`
          }}
        >
          {loading ? (
            <div
              style={{
                color: theme.textSecondary,
                fontSize: '16px',
                textAlign: 'center',
                padding: '20px'
              }}
            >
              Loading audio devices...
            </div>
          ) : devices.length === 0 ? (
            <div
              style={{
                color: theme.textSecondary,
                fontSize: '16px',
                textAlign: 'center',
                padding: '20px'
              }}
            >
              No audio input devices found
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {devices.map((device) => (
                <div
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device.deviceId)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedDeviceId === device.deviceId ? theme.accent : 'transparent',
                    border:
                      selectedDeviceId === device.deviceId
                        ? `2px solid ${theme.accent}`
                        : `1px solid ${theme.border}`,
                    color: selectedDeviceId === device.deviceId ? theme.toggleThumb : theme.text,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDeviceId !== device.deviceId) {
                      e.currentTarget.style.background = theme.buttonHover
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDeviceId !== device.deviceId) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${selectedDeviceId === device.deviceId ? theme.toggleThumb : theme.border}`,
                      background:
                        selectedDeviceId === device.deviceId ? theme.toggleThumb : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {selectedDeviceId === device.deviceId && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: theme.accent
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            width: '100%'
          }}
        >
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
              transition: 'all 0.2s'
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
            disabled={devices.length === 0}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: devices.length === 0 ? theme.buttonBg : theme.accent,
              backdropFilter: 'blur(8px)',
              color: devices.length === 0 ? theme.textDisabled : theme.toggleThumb,
              border: devices.length === 0 ? `1px solid ${theme.border}` : 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: devices.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (devices.length > 0) {
                e.currentTarget.style.background = theme.accentHover
              }
            }}
            onMouseLeave={(e) => {
              if (devices.length > 0) {
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
