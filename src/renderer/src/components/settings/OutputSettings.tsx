import { SettingsRow } from '../ui/SettingsRow'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { Settings, PhrasePair } from '../../hooks/useSettings'
import { Theme } from '../../utils/theme'
import { useEffect, useState } from 'react'
import { PhraseReplacementDialog } from '../ui/PhraseReplacementDialog'

interface OutputSettingsProps {
  settings: Settings
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  theme: Theme
}

export function OutputSettings({ settings, onUpdateSetting, theme }: OutputSettingsProps) {
  const [isPhraseDialogOpen, setIsPhraseDialogOpen] = useState(false)

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

  const handleManagePhrases = () => {
    setIsPhraseDialogOpen(true)
  }

  const handlePhraseDialogClose = () => {
    setIsPhraseDialogOpen(false)
  }

  const handlePhraseDialogSave = (phrases: PhrasePair[]) => {
    onUpdateSetting('phraseReplacements', phrases)
  }

  return (
    <>
      <div>
        <SettingsRow
          title="Auto Copy"
          description="Keep transcriptions in clipboard after pasting"
          theme={theme}
        >
          <Toggle checked={settings.autoCopy} onChange={handleAutoCopyChange} theme={theme} />
        </SettingsRow>

        <SettingsRow
          title="Press Enter After"
          description="Press Enter key automatically after pasting"
          theme={theme}
        >
          <Toggle
            checked={settings.pressEnterAfter}
            onChange={handlePressEnterAfterChange}
            theme={theme}
          />
        </SettingsRow>

        <SettingsRow
          title="Languages"
          description="Select transcription languages (1 selected)"
          theme={theme}
        >
          <Button theme={theme}>Manage Languages</Button>
        </SettingsRow>

        <SettingsRow
          title="Dictionary"
          description="Custom words for better transcription (0 words)"
          theme={theme}
        >
          <Button theme={theme}>Manage Words</Button>
        </SettingsRow>

        <SettingsRow
          title="Phrase Replacements"
          description={`Replace phrases in transcriptions (${settings.phraseReplacements?.length || 0} rules)`}
          theme={theme}
        >
          <Button theme={theme} onClick={handleManagePhrases}>
            Manage Phrases
          </Button>
        </SettingsRow>
      </div>

      <PhraseReplacementDialog
        isOpen={isPhraseDialogOpen}
        onClose={handlePhraseDialogClose}
        onSave={handlePhraseDialogSave}
        currentPhrases={settings.phraseReplacements || []}
        theme={theme}
      />
    </>
  )
}
