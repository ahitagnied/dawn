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
        backdropFilter: 'blur(8px)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s, opacity 0.2s'
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '10px',
          background: theme.toggleThumb,
          boxShadow: checked
            ? '0 4px 10px rgba(0, 0, 0, 0.25)'
            : 'inset 0 0 0 1px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.15)',
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          transition: 'left 0.2s ease, box-shadow 0.2s ease'
        }}
      />
    </button>
  )
}
