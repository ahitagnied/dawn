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
  background: 'rgba(255, 255, 255, 0.5)',
  surface: 'rgba(69, 69, 69, 0.25)',
  text: '#000000',
  textSecondary: '#333333',
  border: 'rgba(0, 0, 0, 0.15)',
  buttonBg: 'rgba(244, 244, 244, 0.2)',
  buttonHover: 'rgba(235, 235, 245, 0.35)',
  toggleBg: 'rgba(200, 200, 210, 0.6)',
  toggleBgActive: '#1a1a1a',
  toggleThumb: '#ffffff',
}

export const darkTheme: Theme = {
  background: 'rgba(20, 20, 22, 0.15)',
  surface: 'rgba(39, 39, 40, 0.25)',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  border: 'rgba(255, 255, 255, 0.2)',
  buttonBg: 'rgba(45, 45, 50, 0.2)',
  buttonHover: 'rgba(55, 55, 60, 0.35)',
  toggleBg: 'rgba(70, 70, 80, 0.6)',
  toggleBgActive: '#ffffff',
  toggleThumb: '#1a1a1a',
}

export function getTheme(darkMode: boolean): Theme {
  return darkMode ? darkTheme : lightTheme
}

