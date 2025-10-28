import { Theme, lightTheme } from '../../utils/theme'

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  theme?: Theme
}

export function Toggle({ checked, onChange, theme = lightTheme }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: 'none',
        background: checked ? theme.toggleBgActive : theme.toggleBg,
        backdropFilter: checked ? 'none' : 'blur(8px)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s'
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '10px',
        background: checked ? theme.toggleThumb : theme.background,
        backdropFilter: checked ? 'none' : 'blur(8px)',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'left 0.2s'
      }} />
    </button>
  )
}

