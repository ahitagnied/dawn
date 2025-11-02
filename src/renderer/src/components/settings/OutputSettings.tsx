import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { Settings } from '../../hooks/useSettings'
import { Theme } from '../../utils/theme'
import { useEffect } from 'react'

interface OutputSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  theme: Theme
}

export function OutputSettings({ settings, onUpdateSetting, theme }: OutputSettingsProps) {
  // Sync settings to main process on component mount
  useEffect(() => {
    if (window.bridge?.syncSettings) {
      window.bridge.syncSettings({
        autoCopy: settings.autoCopy,
        pressEnterAfter: settings.pressEnterAfter
      })
    }
  }, [settings.autoCopy, settings.pressEnterAfter])

  const handleAutoCopyChange = (val: boolean) => {
    onUpdateSetting('autoCopy', val)
    if (window.bridge?.updateAutoCopy) {
      window.bridge.updateAutoCopy(val)
    }
  }

  const handlePressEnterAfterChange = (val: boolean) => {
    onUpdateSetting('pressEnterAfter', val)
    if (window.bridge?.updatePressEnterAfter) {
      window.bridge.updatePressEnterAfter(val)
    }
  }

  return (
    <>
      <div>
        <SettingsRow title="Auto Copy" description="Keep transcriptions in clipboard after pasting" theme={theme}>
          <Toggle checked={settings.autoCopy} onChange={handleAutoCopyChange} theme={theme} />
        </SettingsRow>

        <SettingsRow title="Press Enter After" description="Press Enter key automatically after pasting" theme={theme}>
          <Toggle checked={settings.pressEnterAfter} onChange={handlePressEnterAfterChange} theme={theme} />
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
