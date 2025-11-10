export interface Theme {
  background: string
  surface: string
  text: string
  textSecondary: string
  textDisabled: string
  border: string
  buttonBg: string
  buttonHover: string
  toggleBg: string
  toggleBgActive: string
  toggleThumb: string
  accent: string
  accentHover: string
  scrim: string
  modalBackground: string
  modalSurface: string
  modalBorder: string
}

export const lightTheme: Theme = {
  background: 'rgba(255, 255, 255, 0.78)',
  surface: 'rgba(255, 255, 255, 0.92)',
  text: '#111111',
  textSecondary: '#5c5c60',
  textDisabled: '#9c9ca1',
  border: 'rgba(0, 0, 0, 0.08)',
  buttonBg: 'rgba(255, 255, 255, 0.85)',
  buttonHover: 'rgba(255, 255, 255, 1)',
  toggleBg: 'rgba(228, 228, 235, 0.75)',
  toggleBgActive: '#0a84ff',
  toggleThumb: '#ffffff',
  accent: '#0a84ff',
  accentHover: '#0060df',
  scrim: 'rgba(9, 9, 11, 0.35)',
  modalBackground: 'rgba(245, 245, 247, 0.9)',
  modalSurface: 'rgba(255, 255, 255, 0.92)',
  modalBorder: 'rgba(0, 0, 0, 0.1)'
}

export const darkTheme: Theme = {
  background: 'rgba(18, 18, 22, 0.72)',
  surface: 'rgba(38, 38, 45, 0.6)',
  text: '#f5f5f7',
  textSecondary: '#aeb0b6',
  textDisabled: '#6b6b70',
  border: 'rgba(255, 255, 255, 0.14)',
  buttonBg: 'rgba(33, 33, 38, 0.7)',
  buttonHover: 'rgba(46, 46, 54, 0.85)',
  toggleBg: 'rgba(80, 80, 90, 0.55)',
  toggleBgActive: '#0a84ff',
  toggleThumb: '#ffffff',
  accent: '#0a84ff',
  accentHover: '#409cff',
  scrim: 'rgba(5, 5, 10, 0.6)',
  modalBackground: 'rgba(28, 28, 35, 0.9)',
  modalSurface: 'rgba(42, 42, 50, 0.75)',
  modalBorder: 'rgba(255, 255, 255, 0.18)'
}

export function getTheme(darkMode: boolean): Theme {
  return darkMode ? darkTheme : lightTheme
}
