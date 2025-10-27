import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { Settings } from '../../hooks/useSettings'

interface TranscriptionSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export function TranscriptionSettings({ settings, onUpdateSetting }: TranscriptionSettingsProps) {
  return (
    <>
      <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 40px 0' }}>
        Transcription
      </h1>
      
      <div>
        <SettingsRow title="Transcription Hotkey" description="Keyboard shortcut to start transcription">
          <Button>Option ⌥ + Shift ⇧ + Z</Button>
        </SettingsRow>

        <SettingsRow title="Push to Talk Hotkey" description="Hold this key for push-to-talk recording">
          <Button>Option ⌥ + ~</Button>
        </SettingsRow>

        <SettingsRow title="Smart Transcription" description="Enhance transcriptions with formatting and emoji conversion">
          <Toggle checked={settings.smartTranscription} onChange={(val) => onUpdateSetting('smartTranscription', val)} />
        </SettingsRow>

        <SettingsRow title="Push to Talk" description="Hold hotkey to record, release to transcribe">
          <Toggle checked={settings.pushToTalk} onChange={(val) => onUpdateSetting('pushToTalk', val)} />
        </SettingsRow>

        <SettingsRow title="Local Transcription" description="Use offline models for transcription">
          <Toggle checked={settings.localTranscription} onChange={(val) => onUpdateSetting('localTranscription', val)} />
        </SettingsRow>

        <SettingsRow title="Local Model" description="Select offline transcription model">
          <Button>Base</Button>
        </SettingsRow>
      </div>
    </>
  )
}

