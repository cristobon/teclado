import type { AppSettings } from './settings'
import type { SongUpdate } from './ipcSchemas'

export type { SongUpdate }

export interface SongSummary {
  id: string
  title: string
  artist: string | null
  fileName: string | null
  duration: number
  bpm: number
  noteCount: number
  trackCount: number
  /** 1 (muy fácil) – 5 (muy difícil), estimada. */
  difficulty: number
  isDemo: boolean
  createdAt: string
  lastOpenedAt: string | null
}

export interface SongRecord extends SongSummary {
  midi: Uint8Array
  trackOverrides: Record<number, 'left' | 'right' | 'split' | 'ignore'>
  splitPoint: number | null
}

export type ImportResult =
  | { ok: true; song: SongSummary }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; error: string }

export const IPC = {
  songsList: 'songs:list',
  songsGet: 'songs:get',
  songsImport: 'songs:import',
  songsDelete: 'songs:delete',
  songsUpdate: 'songs:update',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set'
} as const

/** API expuesta al renderer en window.pianoCoach (ver preload). */
export interface PianoCoachApi {
  songs: {
    list(): Promise<SongSummary[]>
    get(id: string): Promise<SongRecord | null>
    importFromDialog(): Promise<ImportResult>
    delete(id: string): Promise<void>
    update(id: string, patch: SongUpdate): Promise<SongSummary>
  }
  settings: {
    get(): Promise<AppSettings>
    set(patch: Partial<AppSettings>): Promise<AppSettings>
  }
}
