import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { Settings } from '../../hooks/useSettings'
import { Theme } from '../../utils/theme'

interface OutputSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  theme: Theme
}

export function OutputSettings({ settings, onUpdateSetting, theme }: OutputSettingsProps) {
  return (
    <>
      <h1 style={{ fontSize: '32px', fontWeight: '600', color: theme.text, margin: '0 0 40px 0' }}>
        Output
      </h1>
      
      <div>
        <SettingsRow title="Auto Copy" description="Copy transcriptions to clipboard automatically" theme={theme}>
          <Toggle checked={settings.autoCopy} onChange={(val) => onUpdateSetting('autoCopy', val)} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Press Enter After" description="Automatically press Enter after pasting" theme={theme}>
          <Toggle checked={settings.pressEnterAfter} onChange={(val) => onUpdateSetting('pressEnterAfter', val)} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Languages" description="Select transcription languages (1 selected)" theme={theme}>
          <Button theme={theme}>Manage Languages</Button>
        </SettingsRow>

        <SettingsRow title="Dictionary" description="Custom words for better transcription (0 words)" theme={theme}>
          <Button theme={theme}>Manage Words</Button>
        </SettingsRow>

        <SettingsRow title="Phrase Replacements" description="Replace phrases in transcriptions (0 rules)" theme={theme}>
          <Button theme={theme}>Manage Phrases</Button>
        </SettingsRow>
      </div>
    </>
  )
}

