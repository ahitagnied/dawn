import { ReactNode } from 'react'
import { Theme, lightTheme } from '../../utils/theme'

interface SettingsRowProps {
  title: string
  description: string
  children: ReactNode
  theme?: Theme
}

export function SettingsRow({ title, description, children, theme = lightTheme }: SettingsRowProps) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '20px 0', 
      borderBottom: `1px solid ${theme.border}` 
    }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
          {title}
        </div>
        <div style={{ fontSize: '12px', color: theme.textSecondary }}>
          {description}
        </div>
      </div>
      {children}
    </div>
  )
}

