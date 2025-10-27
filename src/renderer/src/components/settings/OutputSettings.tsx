import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { Settings } from '../../hooks/useSettings'

interface OutputSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export function OutputSettings({ settings, onUpdateSetting }: OutputSettingsProps) {
  return (
    <>
      <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 40px 0' }}>
        Output
      </h1>
      
      <div>
        <SettingsRow title="Auto Copy" description="Copy transcriptions to clipboard automatically">
          <Toggle checked={settings.autoCopy} onChange={(val) => onUpdateSetting('autoCopy', val)} />
        </SettingsRow>

        <SettingsRow title="Press Enter After" description="Automatically press Enter after pasting">
          <Toggle checked={settings.pressEnterAfter} onChange={(val) => onUpdateSetting('pressEnterAfter', val)} />
        </SettingsRow>

        <SettingsRow title="Languages" description="Select transcription languages (1 selected)">
          <Button>Manage Languages</Button>
        </SettingsRow>

        <SettingsRow title="Dictionary" description="Custom words for better transcription (0 words)">
          <Button>Manage Words</Button>
        </SettingsRow>

        <SettingsRow title="Phrase Replacements" description="Replace phrases in transcriptions (0 rules)">
          <Button>Manage Phrases</Button>
        </SettingsRow>
      </div>
    </>
  )
}

