import { ReactNode, CSSProperties } from 'react'

interface ButtonProps {
  onClick?: () => void
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'icon'
  title?: string
  active?: boolean
  style?: CSSProperties
}

export function Button({ onClick, children, variant = 'secondary', title, active = false, style }: ButtonProps) {
  const baseStyle: CSSProperties = {
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  }

  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      ...baseStyle,
      padding: '8px 24px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      background: 'white',
      color: '#1a1a1a',
      fontSize: '14px',
      fontWeight: '500',
    },
    secondary: {
      ...baseStyle,
      padding: '8px 24px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      background: 'white',
      color: '#1a1a1a',
      fontSize: '14px',
      fontWeight: '500',
    },
    icon: {
      ...baseStyle,
      background: active ? '#f0f0f0' : 'transparent',
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
      onMouseEnter={(e) => {
        if (variant !== 'icon') {
          e.currentTarget.style.background = '#f5f5f5'
        }
      }}
      onMouseLeave={(e) => {
        if (variant !== 'icon') {
          e.currentTarget.style.background = 'white'
        }
      }}
    >
      {children}
    </button>
  )
}

