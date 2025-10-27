import { ReactNode } from 'react'

interface SettingsRowProps {
  title: string
  description: string
  children: ReactNode
}

export function SettingsRow({ title, description, children }: SettingsRowProps) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '20px 0', 
      borderBottom: '1px solid #f0f0f0' 
    }}>
      <div>
        <div style={{ fontSize: '16px', fontWeight: '500', color: '#1a1a1a', marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '14px', color: '#999' }}>
          {description}
        </div>
      </div>
      {children}
    </div>
  )
}

