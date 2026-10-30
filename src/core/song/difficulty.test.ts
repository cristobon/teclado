import { describe, expect, it } from 'vitest'
import { buildSong } from './buildSong'
import { estimateDifficulty } from './difficulty'
import type { RawNote } from './rawSong'

function songOf(notes: RawNote[][]) {
  return buildSong({
    name: '',
    ppq: 480,
    tempos: [{ ticks: 0, bpm: 120 }],
    timeSignatures: [],
    keySignatures: [],
    tracks: notes.map((n, i) => ({
      name: i === 0 ? 'Right' : 'Left',
      channel: i,
      instrument: '',
      family: 'piano',
      isPercussion: false,
      notes: n
    }))
  })
}

describe('estimateDifficulty', () => {
  it('una melodía lenta de una mano es fácil', () => {
    const slow = songOf([
      [0, 1, 2, 3].map((b) => ({ midi: 60 + b, ticks: b * 960, durationTicks: 960, velocity: 0.7 }))
    ])
    expect(estimateDifficulty(slow)).toBeLessThanOrEqual(2)
  })

  it('acordes rápidos a dos manos y amplia extensión es difícil', () => {
    const right: RawNote[] = []
    const left: RawNote[] = []
    for (let i = 0; i < 64; i++) {
      for (const d of [0, 4, 7])
        right.push({ midi: 72 + d + (i % 12), ticks: i * 120, durationTicks: 120, velocity: 0.7 })
      left.push({ midi: 28 + (i % 12), ticks: i * 120, durationTicks: 120, velocity: 0.7 })
    }
    expect(estimateDifficulty(songOf([right, left]))).toBeGreaterThanOrEqual(4)
  })
})
