import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importSong } from '../src/core/midi-import/importSong'
import { DEMO_SONGS, FIVE_FINGER, MINUET, seq } from './demoSongs'

describe('canciones demo', () => {
  it('seq interpreta notas, acordes y silencios', () => {
    expect(seq('C4:1 r:1 C4+E4:.5')).toEqual([
      { midi: 60, beat: 0, beats: 1, velocity: 0.7 },
      { midi: 60, beat: 2, beats: 0.5, velocity: 0.7 },
      { midi: 64, beat: 2, beats: 0.5, velocity: 0.7 }
    ])
  })

  it('cada pista del minueto ocupa exactamente 16 compases de 3/4', () => {
    for (const t of MINUET.tracks) {
      const end = Math.max(...t.notes.map((n) => n.beat + n.beats))
      expect(end).toBe(48)
    }
  })

  it.each(DEMO_SONGS.map((s) => [s.fileName, s] as const))(
    '%s se importa con dos manos',
    (fileName, demo) => {
      const bytes = readFileSync(join(__dirname, '..', 'resources', 'demo', fileName))
      const song = importSong(new Uint8Array(bytes))
      expect(song.title).toBe(demo.title)
      expect(song.tracks.map((t) => t.assignment)).toEqual(['right', 'left'])
      expect(song.tempos[0]!.bpm).toBeCloseTo(demo.bpm)
    }
  )

  it('el minueto tiene 16 compases y acordes en la mano izquierda', () => {
    const bytes = readFileSync(join(__dirname, '..', 'resources', 'demo', MINUET.fileName))
    const song = importSong(new Uint8Array(bytes))
    expect(song.measures).toHaveLength(16)
    expect(song.sections).toHaveLength(4)
    expect(song.steps[0]!.midis).toEqual([55, 59, 62, 74])
  })

  it('el ejercicio de cinco dedos tiene 7 compases (2 MD, 2 MI, 2 juntas, acorde final)', () => {
    const song = importSong(
      new Uint8Array(readFileSync(join(__dirname, '..', 'resources', 'demo', FIVE_FINGER.fileName)))
    )
    expect(song.measures).toHaveLength(7)
  })
})
