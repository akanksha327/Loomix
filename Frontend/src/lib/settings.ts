export interface UserSettings {
  theme: string
  accentColor: string
  uiDensity: string
  motionEffects: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  accentColor: '#1A1A1A',
  uiDensity: 'default',
  motionEffects: true,
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

export function loadLocalSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const val = localStorage.getItem('loomix_settings')
    if (val) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(val) }
    }
  } catch (e) {
    console.error('Failed to load local settings:', e)
  }
  return DEFAULT_SETTINGS
}

export function applySettings(settings: Partial<UserSettings>) {
  if (typeof window === 'undefined') return

  const merged = { ...DEFAULT_SETTINGS, ...loadLocalSettings(), ...settings }
  
  // 1. Theme (Dark, Light, System)
  const theme = merged.theme || 'system'
  let isDark = theme === 'dark'
  if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  const root = document.documentElement
  if (isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }

  // 2. Accent Color
  if (merged.accentColor) {
    const color = merged.accentColor
    root.style.setProperty('--primary', color)
    root.style.setProperty('--accent', color)
    root.style.setProperty('--ring', color)
    root.style.setProperty('--chart-1', color)
    root.style.setProperty('--sidebar-primary', color)
    root.style.setProperty('--sidebar-ring', color)

    const rgb = hexToRgb(color)
    if (rgb) {
      root.style.setProperty('--sidebar-accent', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`)
      root.style.setProperty('--accent-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`)
      root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
    }
  }

  // 3. UI Density
  const density = merged.uiDensity || 'default'
  root.classList.remove('density-compact', 'density-comfortable')
  if (density === 'compact') {
    root.classList.add('density-compact')
  } else if (density === 'comfortable') {
    root.classList.add('density-comfortable')
  }

  // 4. Motion Effects
  const motion = merged.motionEffects !== false
  if (!motion) {
    root.classList.add('motion-reduce')
  } else {
    root.classList.remove('motion-reduce')
  }

  // Save to localStorage
  localStorage.setItem('loomix_settings', JSON.stringify(merged))
}
