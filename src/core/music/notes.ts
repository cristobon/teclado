/** Rango de un piano de 88 teclas: A0 (21) a C8 (108). */
export const PIANO_MIN_MIDI = 21
export const PIANO_MAX_MIDI = 108

export type NoteNaming = 'english' | 'solfege'

const ENGLISH = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const SOLFEGE = [
  'Do',
  'Do#',
  'Re',
  'Re#',
  'Mi',
  'Fa',
  'Fa#',
  'Sol',
  'Sol#',
  'La',
  'La#',
  'Si'
] as const
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/** Octava científica: C4 = 60 (Do central). */
export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1
}

export function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(pitchClass(midi))
}

export function isInPianoRange(midi: number): boolean {
  return Number.isInteger(midi) && midi >= PIANO_MIN_MIDI && midi <= PIANO_MAX_MIDI
}

export function pitchClassName(midi: number, naming: NoteNaming = 'english'): string {
  const table = naming === 'solfege' ? SOLFEGE : ENGLISH
  return table[pitchClass(midi)]!
}

/** Ej. 60 → "C4" o "Do4". */
export function noteName(midi: number, naming: NoteNaming = 'english'): string {
  return `${pitchClassName(midi, naming)}${octaveOf(midi)}`
}

/** Convierte "C4", "F#3", "Bb2" en número MIDI. Devuelve null si no es válido. */
export function parseNoteName(name: string): number | null {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name.trim())
  if (!m) return null
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const letter = m[1]!.toUpperCase()
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  const octave = Number(m[3])
  return (octave + 1) * 12 + base[letter]! + accidental
}

/** Lista de teclas blancas en un rango (inclusive). */
export function whiteKeysInRange(min: number, max: number): number[] {
  const keys: number[] = []
  for (let n = min; n <= max; n++) if (!isBlackKey(n)) keys.push(n)
  return keys
}
