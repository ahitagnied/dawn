import { SettingsRow } from '../ui/SettingsRow'
import { Button } from '../ui/Button'
import { Theme } from '../../utils/theme'

interface AssistantSettingsProps {
  theme: Theme
}

export function AssistantSettings({ theme }: AssistantSettingsProps) {
  return (
    <>
      <div>
        <SettingsRow title="Assistant Hotkey" description="Keyboard shortcut to activate AI assistant" theme={theme}>
          <Button theme={theme}>Option ⌥ + Shift ⇧ + S</Button>
        </SettingsRow>

        <SettingsRow title="Assistant Model" description="Select AI model for assistant responses" theme={theme}>
          <Button theme={theme}>Llama 3.3 70B Versatile</Button>
        </SettingsRow>
      </div>
    </>
  )
}

