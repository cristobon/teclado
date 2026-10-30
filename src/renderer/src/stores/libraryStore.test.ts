import { describe, expect, it } from 'vitest'
import type { SongSummary } from '@shared/ipc'
import { filterSongs } from './filterSongs'

const base: SongSummary = {
  id: '1',
  title: 'Minueto en Sol',
  artist: 'Petzold',
  fileName: null,
  duration: 1,
  bpm: 100,
  noteCount: 1,
  trackCount: 1,
  difficulty: 1,
  isDemo: true,
  createdAt: '',
  lastOpenedAt: null
}

describe('filterSongs', () => {
  it('busca sin distinguir mayúsculas ni acentos, en título y artista', () => {
    const songs = [
      base,
      { ...base, id: '2', title: "Can't Help Falling in Love", artist: 'Elvis Presley' }
    ]
    expect(filterSongs(songs, 'MINUETO').map((s) => s.id)).toEqual(['1'])
    expect(filterSongs(songs, 'elvis').map((s) => s.id)).toEqual(['2'])
    expect(filterSongs([{ ...base, title: 'Canción' }], 'cancion')).toHaveLength(1)
    expect(filterSongs(songs, '  ')).toHaveLength(2)
  })
})
