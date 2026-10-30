import { describe, expect, it } from 'vitest'
import { makeMidiBytes } from '../testing/midiFixtures'
import { importSong, titleFromFileName } from './importSong'
import { MidiParseError, parseMidi } from './parseMidi'

describe('importación MIDI', () => {
  it('importa un MIDI real de dos pistas con manos, tempo y compás', () => {
    const bytes = makeMidiBytes({
      name: 'Demo',
      tempos: [{ beat: 0, bpm: 90 }],
      timeSignature: [3, 4],
      tracks: [
        {
          name: 'Right Hand',
          notes: [
            { midi: 67, beat: 0, beats: 1 },
            { midi: 69, beat: 1, beats: 2 }
          ]
        },
        { name: 'Left Hand', channel: 1, notes: [{ midi: 43, beat: 0, beats: 3 }] }
      ]
    })
    const song = importSong(bytes)
    expect(song.title).toBe('Demo')
    expect(song.tempos[0]!.bpm).toBeCloseTo(90)
    expect(song.timeSignatures[0]).toMatchObject({ numerator: 3, denominator: 4 })
    expect(song.notes).toHaveLength(3)
    expect(song.steps[0]!.midis).toEqual([43, 67])
    expect(song.steps[0]!.hands.sort()).toEqual(['left', 'right'])
    expect(song.notes.find((n) => n.midi === 69)!.time).toBeCloseTo(60 / 90)
    expect(song.measures).toHaveLength(1)
  })

  it('lee el tempo y cambios de tempo del archivo', () => {
    const raw = parseMidi(
      makeMidiBytes({
        tempos: [
          { beat: 0, bpm: 100 },
          { beat: 4, bpm: 80 }
        ],
        tracks: [{ notes: [{ midi: 60, beat: 0, beats: 1 }] }]
      })
    )
    expect(raw.tempos.map((t) => Math.round(t.bpm))).toEqual([100, 80])
  })

  it('rechaza archivos que no son MIDI', () => {
    expect(() => parseMidi(new TextEncoder().encode('hola, esto no es un midi'))).toThrow(
      MidiParseError
    )
  })

  it('rechaza MIDI truncados con un error controlado', () => {
    const bytes = makeMidiBytes({ tracks: [{ notes: [{ midi: 60, beat: 0, beats: 1 }] }] })
    expect(() => parseMidi(bytes.slice(0, 20))).toThrow(MidiParseError)
  })

  it('obtiene un título a partir del nombre de archivo', () => {
    expect(titleFromFileName('/Users/x/Mi_Cancion.MID')).toBe('Mi Cancion')
    expect(titleFromFileName('song.midi')).toBe('song')
  })
})
