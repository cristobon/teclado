import { randomUUID } from 'node:crypto'
import type { SongRecord, SongSummary, SongUpdate } from '../../shared/ipc'
import type { AppDatabase } from './database'

interface SongRow {
  id: string
  title: string
  artist: string | null
  file_name: string | null
  midi: Uint8Array
  duration: number
  bpm: number
  note_count: number
  track_count: number
  difficulty: number
  is_demo: number
  track_overrides: string
  split_point: number | null
  created_at: string
  last_opened_at: string | null
}

const SUMMARY_COLUMNS =
  'id, title, artist, file_name, duration, bpm, note_count, track_count, difficulty, is_demo, created_at, last_opened_at'

export interface NewSong {
  title: string
  artist?: string | null
  fileName: string | null
  midi: Uint8Array
  duration: number
  bpm: number
  noteCount: number
  trackCount: number
  difficulty: number
  isDemo?: boolean
}

function toSummary(row: Omit<SongRow, 'midi' | 'track_overrides' | 'split_point'>): SongSummary {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    fileName: row.file_name,
    duration: row.duration,
    bpm: row.bpm,
    noteCount: row.note_count,
    trackCount: row.track_count,
    difficulty: row.difficulty,
    isDemo: row.is_demo === 1,
    createdAt: row.created_at,
    lastOpenedAt: row.last_opened_at
  }
}

function parseOverrides(json: string): SongRecord['trackOverrides'] {
  try {
    const value: unknown = JSON.parse(json)
    if (!value || typeof value !== 'object') return {}
    const out: SongRecord['trackOverrides'] = {}
    for (const [k, v] of Object.entries(value)) {
      if (/^\d+$/.test(k) && (v === 'left' || v === 'right' || v === 'split' || v === 'ignore'))
        out[Number(k)] = v
    }
    return out
  } catch {
    return {}
  }
}

export class SongRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** Recientes primero; luego por fecha de importación. */
  list(): SongSummary[] {
    return this.db
      .all<SongRow>(
        `SELECT ${SUMMARY_COLUMNS} FROM songs
         ORDER BY last_opened_at IS NULL, last_opened_at DESC, created_at DESC`
      )
      .map(toSummary)
  }

  get(id: string): SongRecord | null {
    const row = this.db.get<SongRow>('SELECT * FROM songs WHERE id = ?', [id])
    if (!row) return null
    return {
      ...toSummary(row),
      midi: row.midi,
      trackOverrides: parseOverrides(row.track_overrides),
      splitPoint: row.split_point
    }
  }

  async insert(song: NewSong): Promise<SongSummary> {
    const id = randomUUID()
    await this.db.write((run) =>
      run(
        `INSERT INTO songs (id, title, artist, file_name, midi, duration, bpm, note_count, track_count,
           difficulty, is_demo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          song.title,
          song.artist ?? null,
          song.fileName,
          song.midi,
          song.duration,
          song.bpm,
          song.noteCount,
          song.trackCount,
          song.difficulty,
          song.isDemo ? 1 : 0,
          this.now().toISOString()
        ]
      )
    )
    return this.list().find((s) => s.id === id)!
  }

  async update(id: string, patch: SongUpdate): Promise<SongSummary> {
    if (!this.get(id)) throw new Error('La canción no existe.')
    await this.db.write((run) => {
      if (patch.title !== undefined)
        run('UPDATE songs SET title = ? WHERE id = ?', [patch.title, id])
      if (patch.artist !== undefined)
        run('UPDATE songs SET artist = ? WHERE id = ?', [patch.artist, id])
      if (patch.trackOverrides !== undefined) {
        run('UPDATE songs SET track_overrides = ? WHERE id = ?', [
          JSON.stringify(patch.trackOverrides),
          id
        ])
      }
      if (patch.splitPoint !== undefined)
        run('UPDATE songs SET split_point = ? WHERE id = ?', [patch.splitPoint, id])
      if (patch.markOpened)
        run('UPDATE songs SET last_opened_at = ? WHERE id = ?', [this.now().toISOString(), id])
    })
    return this.list().find((s) => s.id === id)!
  }

  async delete(id: string): Promise<void> {
    await this.db.write((run) => run('DELETE FROM songs WHERE id = ?', [id]))
  }

  count(): number {
    return this.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM songs')?.n ?? 0
  }
}
