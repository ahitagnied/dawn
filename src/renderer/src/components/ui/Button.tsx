import { ReactNode, CSSProperties, useState } from 'react'
import { Theme, lightTheme } from '../../utils/theme'

interface ButtonProps {
  onClick?: () => void
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'icon'
  title?: string
  active?: boolean
  style?: CSSProperties
  theme?: Theme
}

export function Button({ onClick, children, variant = 'secondary', title, active = false, style, theme = lightTheme }: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const baseStyle: CSSProperties = {
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  }

  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      ...baseStyle,
      padding: '8px 24px',
      border: `1px solid ${theme.border}`,
      borderRadius: '6px',
      background: isHovered ? theme.buttonHover : theme.buttonBg,
      color: theme.text,
      fontSize: '12px',
      fontWeight: '500',
    },
    secondary: {
      ...baseStyle,
      padding: '8px 24px',
      border: `1px solid ${theme.border}`,
      borderRadius: '6px',
      background: isHovered ? theme.buttonHover : theme.buttonBg,
      color: theme.text,
      fontSize: '12px',
      fontWeight: '500',
    },
    icon: {
      ...baseStyle,
      background: active ? theme.surface : 'transparent',
      borderRadius: '8px',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  }

  return (
    <button
      onClick={onClick}
      title={title}
      style={{ ...variantStyles[variant], ...style }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  )
}

