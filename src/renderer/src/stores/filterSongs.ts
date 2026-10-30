import type { SongSummary } from '@shared/ipc'

/** Búsqueda insensible a mayúsculas y acentos. */
export function filterSongs(songs: SongSummary[], query: string): SongSummary[] {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
  const q = norm(query.trim())
  if (!q) return songs
  return songs.filter((s) => norm(`${s.title} ${s.artist ?? ''} ${s.fileName ?? ''}`).includes(q))
}
