/**
 * Representación intermedia independiente de la librería de parseo MIDI.
 * buildSong() transforma esto en un Song normalizado.
 */
export interface RawNote {
  midi: number
  ticks: number
  durationTicks: number
  /** 0..1 */
  velocity: number
}

export interface RawTrack {
  name: string
  channel: number
  instrument: string
  /** Familia General MIDI (p. ej. "piano", "guitar"). */
  family: string
  isPercussion: boolean
  notes: RawNote[]
}

export interface RawSong {
  name: string
  ppq: number
  tempos: Array<{ ticks: number; bpm: number }>
  timeSignatures: Array<{ ticks: number; numerator: number; denominator: number }>
  keySignatures: Array<{ ticks: number; key: string; scale: 'major' | 'minor' }>
  tracks: RawTrack[]
}
