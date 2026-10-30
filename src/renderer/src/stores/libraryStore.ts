import { create } from 'zustand'
import type { SongSummary } from '@shared/ipc'

interface LibraryState {
  songs: SongSummary[]
  loading: boolean
  error: string | null
  query: string
  refresh(): Promise<void>
  importSong(): Promise<SongSummary | null>
  deleteSong(id: string): Promise<void>
  setQuery(q: string): void
  clearError(): void
}

export const useLibrary = create<LibraryState>((set, get) => ({
  songs: [],
  loading: false,
  error: null,
  query: '',

  async refresh() {
    set({ loading: true })
    try {
      set({ songs: await window.pianoCoach.songs.list(), loading: false })
    } catch (err) {
      set({ loading: false, error: `No se pudo cargar la biblioteca: ${String(err)}` })
    }
  },

  async importSong() {
    const result = await window.pianoCoach.songs.importFromDialog()
    if (result.ok) {
      await get().refresh()
      return result.song
    }
    if (!result.canceled) set({ error: result.error })
    return null
  },

  async deleteSong(id) {
    await window.pianoCoach.songs.delete(id)
    await get().refresh()
  },

  setQuery(query) {
    set({ query })
  },

  clearError() {
    set({ error: null })
  }
}))
