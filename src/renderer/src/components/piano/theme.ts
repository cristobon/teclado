import type { Hand } from '@core/song/types'

export const HAND_COLOR: Record<Hand, string> = { right: '#4fc3f7', left: '#ffb454' }
export const HAND_COLOR_DARK: Record<Hand, string> = { right: '#1f7fae', left: '#b3711f' }
export const HAND_LABEL: Record<Hand, string> = { right: 'Mano derecha', left: 'Mano izquierda' }
export const HAND_SHORT: Record<Hand, string> = { right: 'MD', left: 'MI' }

export const ROLL = {
  bg: '#0d1016',
  laneDark: 'rgba(255,255,255,0.018)',
  laneLine: 'rgba(255,255,255,0.05)',
  octaveLine: 'rgba(255,255,255,0.10)',
  measureLine: 'rgba(255,255,255,0.08)',
  measureText: 'rgba(255,255,255,0.32)',
  nowLine: 'rgba(139,156,255,0.85)'
}

export const KEYS = {
  white: '#f3f4f7',
  whiteShade: '#d9dce3',
  black: '#1a1d25',
  blackTop: '#2d313c',
  border: '#9aa0ad',
  label: '#7a8090',
  pressed: '#8b9cff'
}
