export interface Theme {
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  buttonBg: string
  buttonHover: string
  toggleBg: string
  toggleBgActive: string
  toggleThumb: string
}

export const lightTheme: Theme = {
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#1a1a1a',
  textSecondary: '#666666',
  border: '#e0e0e0',
  buttonBg: '#f5f5f5',
  buttonHover: '#e8e8e8',
  toggleBg: '#e0e0e0',
  toggleBgActive: '#1a1a1a',
  toggleThumb: '#ffffff',
}

export const darkTheme: Theme = {
  background: '#1a1a1a',
  surface: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#999999',
  border: '#3a3a3a',
  buttonBg: '#2a2a2a',
  buttonHover: '#3a3a3a',
  toggleBg: '#3a3a3a',
  toggleBgActive: '#ffffff',
  toggleThumb: '#1a1a1a',
}

export function getTheme(darkMode: boolean): Theme {
  return darkMode ? darkTheme : lightTheme
}

