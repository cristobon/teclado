import { describe, expect, it } from 'vitest'
import { buildSong, normalizeNotes } from './buildSong'
import type { RawSong, RawTrack } from './rawSong'

const PPQ = 480

function raw(tracks: RawTrack[], extra: Partial<RawSong> = {}): RawSong {
  return {
    name: 'Prueba',
    ppq: PPQ,
    tempos: [{ ticks: 0, bpm: 120 }],
    timeSignatures: [{ ticks: 0, numerator: 4, denominator: 4 }],
    keySignatures: [],
    tracks,
    ...extra
  }
}

function track(
  name: string,
  notes: Array<[midi: number, beat: number, beats: number]>,
  extra: Partial<RawTrack> = {}
): RawTrack {
  return {
    name,
    channel: 0,
    instrument: 'acoustic grand piano',
    family: 'piano',
    isPercussion: false,
    notes: notes.map(([midi, beat, beats]) => ({
      midi,
      ticks: beat * PPQ,
      durationTicks: beats * PPQ,
      velocity: 0.7
    })),
    ...extra
  }
}

describe('buildSong', () => {
  it('convierte ticks a segundos y calcula duración por compases completos', () => {
    const song = buildSong(
      raw([
        track('Melodía', [
          [60, 0, 1],
          [62, 1, 1],
          [64, 2, 2]
        ])
      ])
    )
    expect(song.notes.map((n) => n.time)).toEqual([0, 0.5, 1])
    expect(song.notes[2]!.duration).toBeCloseTo(1)
    expect(song.measures).toHaveLength(1)
    expect(song.duration).toBeCloseTo(2)
  })

  it('agrupa notas simultáneas en un paso (acorde)', () => {
    const song = buildSong(
      raw([
        track('Piano', [
          [60, 0, 1],
          [64, 0, 1],
          [67, 0, 1],
          [72, 1, 1]
        ])
      ])
    )
    expect(song.steps).toHaveLength(2)
    expect(song.steps[0]!.midis).toEqual([60, 64, 67])
    expect(song.notes.every((n) => n.stepIndex >= 0)).toBe(true)
  })

  it('agrupa notas casi simultáneas (humanizadas) dentro de la tolerancia', () => {
    const r = raw([track('Piano', [])])
    r.tracks[0]!.notes = [
      { midi: 60, ticks: 0, durationTicks: 480, velocity: 0.5 },
      { midi: 64, ticks: 10, durationTicks: 480, velocity: 0.5 }, // ~10 ms
      { midi: 67, ticks: 200, durationTicks: 480, velocity: 0.5 } // ~208 ms
    ]
    const song = buildSong(r)
    expect(song.steps.map((s) => s.midis)).toEqual([[60, 64], [67]])
  })

  it('asigna manos por nombre de pista', () => {
    const song = buildSong(
      raw([track('Left Hand', [[72, 0, 1]]), track('Right Hand', [[48, 0, 1]])])
    )
    expect(song.tracks.map((t) => [t.assignment, t.handSource])).toEqual([
      ['left', 'name'],
      ['right', 'name']
    ])
    expect(song.notes.find((n) => n.midi === 72)!.hand).toBe('left')
  })

  it('asigna manos por tono medio cuando hay dos pistas sin nombre útil', () => {
    const song = buildSong(
      raw([
        track('Pista A', [
          [40, 0, 1],
          [43, 1, 1]
        ]),
        track('Pista B', [
          [72, 0, 1],
          [76, 1, 1]
        ])
      ])
    )
    expect(song.tracks.map((t) => t.assignment)).toEqual(['left', 'right'])
    expect(song.tracks.every((t) => t.handSource === 'pitch')).toBe(true)
  })

  it('divide una pista única por punto de corte y lo avisa', () => {
    const song = buildSong(
      raw([
        track('Piano', [
          [48, 0, 1],
          [60, 0, 1],
          [59, 1, 1]
        ])
      ])
    )
    expect(song.tracks[0]!.assignment).toBe('split')
    const hands = Object.fromEntries(song.notes.map((n) => [n.midi, n.hand]))
    expect(hands).toEqual({ 48: 'left', 59: 'left', 60: 'right' })
    expect(song.warnings.some((w) => w.includes('punto de corte'))).toBe(true)
    expect(song.steps[0]!.hands.sort()).toEqual(['left', 'right'])
  })

  it('respeta overrides manuales y punto de corte personalizado', () => {
    const r = raw([
      track('Piano', [
        [55, 0, 1],
        [65, 0, 1]
      ])
    ])
    expect(buildSong(r, { splitPoint: 50 }).notes.every((n) => n.hand === 'right')).toBe(true)
    const manual = buildSong(r, { trackOverrides: { 0: 'left' } })
    expect(manual.tracks[0]!.handSource).toBe('manual')
    expect(manual.notes.every((n) => n.hand === 'left')).toBe(true)
  })

  it('descarta percusión y pistas vacías', () => {
    const song = buildSong(
      raw([
        track('Batería', [[36, 0, 1]], { isPercussion: true, channel: 9 }),
        track('Vacía', []),
        track('Piano', [[60, 0, 1]])
      ])
    )
    expect(song.tracks).toHaveLength(1)
    expect(song.tracks[0]!.name).toBe('Piano')
    expect(song.warnings.some((w) => w.includes('percusión'))).toBe(true)
  })

  it('en un MIDI de banda usa solo las pistas de piano y lo avisa', () => {
    const song = buildSong(
      raw([
        track('Piano', [
          [48, 0, 1],
          [72, 0, 1]
        ]),
        track('Bajo', [[36, 0, 1]], { family: 'bass', instrument: 'acoustic bass' }),
        track('Guitarra', [[64, 0, 1]], { family: 'guitar', instrument: 'acoustic guitar (nylon)' })
      ])
    )
    expect(song.tracks.map((t) => [t.assignment, t.handSource])).toEqual([
      ['split', 'split-point'],
      ['ignore', 'instrument'],
      ['ignore', 'instrument']
    ])
    expect(song.notes.map((n) => n.midi)).toEqual([48, 72])
    expect(song.notes.map((n) => n.hand)).toEqual(['left', 'right'])
    expect(song.warnings.some((w) => w.includes('otros instrumentos'))).toBe(true)
  })

  it('permite activar a mano una pista descartada y descartar otra', () => {
    const r = raw([
      track('Piano', [[48, 0, 1]]),
      track('Voz', [[67, 0, 1]], { family: 'synth effects', instrument: 'synth voice' })
    ])
    const song = buildSong(r, { trackOverrides: { 1: 'right', 0: 'left' } })
    expect(song.tracks.map((t) => t.assignment)).toEqual(['left', 'right'])
    expect(song.notes).toHaveLength(2)
    const onlyVoice = buildSong(r, { trackOverrides: { 0: 'ignore', 1: 'right' } })
    expect(onlyVoice.tracks[0]).toMatchObject({ assignment: 'ignore', handSource: 'manual' })
    expect(onlyVoice.notes.map((n) => n.midi)).toEqual([67])
  })

  it('si ninguna pista es piano se usan todas', () => {
    const song = buildSong(
      raw([
        track('Flauta', [[72, 0, 1]], { family: 'pipe' }),
        track('Fagot', [[40, 0, 1]], { family: 'reed' })
      ])
    )
    expect(song.tracks.map((t) => t.assignment)).toEqual(['right', 'left'])
  })

  it('exige al menos una pista en uso', () => {
    expect(() =>
      buildSong(raw([track('Piano', [[60, 0, 1]])]), { trackOverrides: { 0: 'ignore' } })
    ).toThrow(/al menos una pista/)
  })

  it('falla con un mensaje claro si no hay notas', () => {
    expect(() => buildSong(raw([track('Vacía', [])]))).toThrow(/no contiene notas/)
  })

  it('calcula compases con cambio de compás y secciones', () => {
    // 2 compases de 3/4 y luego 4/4; notas hasta el beat 14
    const song = buildSong(
      raw(
        [
          track('Piano', [
            [60, 0, 1],
            [62, 13, 1]
          ])
        ],
        {
          timeSignatures: [
            { ticks: 0, numerator: 3, denominator: 4 },
            { ticks: 6 * PPQ, numerator: 4, denominator: 4 }
          ]
        }
      ),
      { measuresPerSection: 2 }
    )
    expect(song.measures.map((m) => `${m.numerator}/${m.denominator}`)).toEqual([
      '3/4',
      '3/4',
      '4/4',
      '4/4'
    ])
    expect(song.measures[2]!.startTick).toBe(6 * PPQ)
    expect(song.notes[1]!.measureIndex).toBe(3)
    expect(song.sections.map((s) => [s.startMeasure, s.endMeasure])).toEqual([
      [0, 1],
      [2, 3]
    ])
  })

  it('aplica cambios de tempo a tiempos y duraciones', () => {
    const song = buildSong(
      raw(
        [
          track('Piano', [
            [60, 0, 1],
            [62, 1, 1],
            [64, 2, 1]
          ])
        ],
        {
          tempos: [
            { ticks: 0, bpm: 120 },
            { ticks: PPQ, bpm: 60 }
          ]
        }
      )
    )
    expect(song.notes.map((n) => n.time)).toEqual([0, 0.5, 1.5])
    expect(song.notes[1]!.duration).toBeCloseTo(1)
  })
})

describe('normalizeNotes', () => {
  it('elimina duplicados, recorta solapes y mueve notas fuera de rango', () => {
    const { notes, transposedCount } = normalizeNotes(
      [
        { midi: 60, ticks: 0, durationTicks: 960, velocity: 0.4 },
        { midi: 60, ticks: 0, durationTicks: 960, velocity: 0.9 },
        { midi: 60, ticks: 480, durationTicks: 480, velocity: 0.5 },
        { midi: 12, ticks: 0, durationTicks: 0, velocity: 0.5 }
      ],
      PPQ
    )
    expect(transposedCount).toBe(1)
    const c4 = notes.filter((n) => n.midi === 60)
    expect(c4).toHaveLength(2)
    expect(c4[0]).toMatchObject({ ticks: 0, durationTicks: 480, velocity: 0.9 })
    const low = notes.find((n) => n.midi === 24)!
    expect(low.durationTicks).toBeGreaterThan(0)
  })
})
