import { describe, expect, it } from 'vitest'
import {
  PIANO_MAX_MIDI,
  PIANO_MIN_MIDI,
  isBlackKey,
  isInPianoRange,
  noteName,
  octaveOf,
  parseNoteName,
  whiteKeysInRange
} from './notes'

describe('notes', () => {
  it('nombra el Do central como C4 / Do4', () => {
    expect(noteName(60)).toBe('C4')
    expect(noteName(60, 'solfege')).toBe('Do4')
    expect(octaveOf(60)).toBe(4)
  })

  it('nombra los extremos del piano', () => {
    expect(noteName(PIANO_MIN_MIDI)).toBe('A0')
    expect(noteName(PIANO_MAX_MIDI)).toBe('C8')
  })

  it('distingue teclas negras', () => {
    expect(isBlackKey(61)).toBe(true)
    expect(isBlackKey(64)).toBe(false)
    expect(isBlackKey(66)).toBe(true)
  })

  it('el piano tiene 88 teclas: 52 blancas y 36 negras', () => {
    const whites = whiteKeysInRange(PIANO_MIN_MIDI, PIANO_MAX_MIDI)
    expect(PIANO_MAX_MIDI - PIANO_MIN_MIDI + 1).toBe(88)
    expect(whites).toHaveLength(52)
  })

  it('parsea nombres de nota', () => {
    expect(parseNoteName('C4')).toBe(60)
    expect(parseNoteName('F#3')).toBe(54)
    expect(parseNoteName('Bb2')).toBe(46)
    expect(parseNoteName('H2')).toBeNull()
    for (let n = 21; n <= 108; n++) expect(parseNoteName(noteName(n))).toBe(n)
  })

  it('valida el rango del piano', () => {
    expect(isInPianoRange(20)).toBe(false)
    expect(isInPianoRange(21)).toBe(true)
    expect(isInPianoRange(60.5)).toBe(false)
  })
})
