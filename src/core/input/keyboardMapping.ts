import { PIANO_MAX_MIDI, PIANO_MIN_MIDI } from '../music/notes'

/**
 * Mapeo por posición física (KeyboardEvent.code), así funciona igual en teclado
 * español, inglés, etc. Valor = semitonos sobre la nota base (Do de la octava activa).
 */
export type KeyboardMapping = Record<string, number>

export const DEFAULT_KEYBOARD_MAPPING: KeyboardMapping = {
  KeyA: 0, // C
  KeyW: 1, // C#
  KeyS: 2, // D
  KeyE: 3, // D#
  KeyD: 4, // E
  KeyF: 5, // F
  KeyT: 6, // F#
  KeyG: 7, // G
  KeyY: 8, // G#
  KeyH: 9, // A
  KeyU: 10, // A#
  KeyJ: 11, // B
  KeyK: 12, // C
  KeyO: 13, // C#
  KeyL: 14, // D
  KeyP: 15, // D#
  Semicolon: 16, // E (Ñ en teclado español)
  Quote: 17 // F
}

export const OCTAVE_DOWN_CODE = 'KeyZ'
export const OCTAVE_UP_CODE = 'KeyX'
export const DEFAULT_KEYBOARD_BASE = 60 // C4

export function midiForCode(
  code: string,
  mapping: KeyboardMapping,
  baseMidi: number
): number | null {
  const offset = mapping[code]
  if (offset === undefined) return null
  const midi = baseMidi + offset
  return midi >= PIANO_MIN_MIDI && midi <= PIANO_MAX_MIDI ? midi : null
}

/** Mueve la base una octava, sin salir del piano. */
export function shiftBase(baseMidi: number, octaves: number): number {
  const next = baseMidi + octaves * 12
  if (next < 24 || next > 96) return baseMidi
  return next
}
