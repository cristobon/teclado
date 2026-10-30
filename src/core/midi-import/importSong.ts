import { buildSong, type BuildSongOptions } from '../song/buildSong'
import type { Song } from '../song/types'
import { parseMidi } from './parseMidi'

/** Nombre de archivo sin extensión, útil como título por defecto. */
export function titleFromFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName
  return (
    base
      .replace(/\.(mid|midi)$/i, '')
      .replace(/[_]+/g, ' ')
      .trim() || 'Sin título'
  )
}

export function importSong(bytes: Uint8Array, options: BuildSongOptions = {}): Song {
  return buildSong(parseMidi(bytes), options)
}
