import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { AudioDeviceDialog } from '../ui/AudioDeviceDialog'
import { Settings } from '../../hooks/useSettings'
import { Theme } from '../../utils/theme'
import { useState, useEffect } from 'react'

interface GeneralSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  theme: Theme
}

export function GeneralSettings({ settings, onUpdateSetting, theme }: GeneralSettingsProps) {
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false)
  const [selectedDeviceName, setSelectedDeviceName] = useState('Default')

  // Initialize device name on component mount (only once, without activating microphone)
  useEffect(() => {
    // Only set device name if we haven't already set it from a previous selection
    if (selectedDeviceName === 'Default' && settings.inputDevice !== 'default') {
      // Try to get device label without requesting microphone access
      // This will only work if we already have permission
      navigator.mediaDevices
        .enumerateDevices()
        .then((deviceList) => {
          const device = deviceList.find(
            (d) => d.deviceId === settings.inputDevice && d.kind === 'audioinput'
          )
          if (device?.label) {
            setSelectedDeviceName(device.label)
          }
        })
        .catch(() => {
          // Silently fail - we'll get the device name when the dialog is opened
        })
    }
  }, []) // Empty dependency array means this runs only once on mount

  const handleAutoMuteChange = (val: boolean) => {
    onUpdateSetting('autoMute', val)
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('settings:update-auto-mute', val)
    }
  }

  const handleSoundEffectsChange = (val: boolean) => {
    onUpdateSetting('soundEffects', val)
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('settings:update-sound-effects', val)
    }
  }

  const handleInputDeviceClick = () => {
    setIsDeviceDialogOpen(true)
  }

  const handleInputDeviceSave = (deviceId: string, deviceLabel: string) => {
    onUpdateSetting('inputDevice', deviceId)
    if (window.bridge?.updateInputDevice) {
      window.bridge.updateInputDevice(deviceId)
    }

    // Update the displayed device name immediately
    setSelectedDeviceName(deviceLabel)
  }

  return (
    <>
      <div>
        <SettingsRow
          title="Sound Effects"
          description="Play audio feedback for recording and typing"
          theme={theme}
        >
          <Toggle
            checked={settings.soundEffects}
            onChange={handleSoundEffectsChange}
            theme={theme}
          />
        </SettingsRow>

        <SettingsRow
          title="Auto-Mute System"
          description="Mute system volume during recording"
          theme={theme}
        >
          <Toggle checked={settings.autoMute} onChange={handleAutoMuteChange} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Dark Mode" description="Use dark theme for the interface" theme={theme}>
          <Toggle
            checked={settings.darkMode}
            onChange={(val) => onUpdateSetting('darkMode', val)}
            theme={theme}
          />
        </SettingsRow>

        <SettingsRow title="API Key" description="Configure your Groq API key" theme={theme}>
          <Button theme={theme}>Set Key</Button>
        </SettingsRow>

        <SettingsRow
          title="Input Device"
          description="Select microphone for recording"
          theme={theme}
        >
          <Button theme={theme} onClick={handleInputDeviceClick}>
            {selectedDeviceName}
          </Button>
        </SettingsRow>

        <SettingsRow
          title="Data Location"
          description="Access your app data and recordings"
          theme={theme}
        >
          <Button theme={theme}>Open Folder</Button>
        </SettingsRow>
      </div>

      <AudioDeviceDialog
        isOpen={isDeviceDialogOpen}
        onClose={() => setIsDeviceDialogOpen(false)}
        onSave={handleInputDeviceSave}
        currentDeviceId={settings.inputDevice}
        theme={theme}
      />
    </>
  )
}
