import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { importSong, titleFromFileName } from '../core/midi-import/importSong'
import { estimateDifficulty } from '../core/song/difficulty'
import type { SongSummary } from '../shared/ipc'
import type { NewSong, SongRepository } from './db/songRepository'

export const MAX_MIDI_BYTES = 5 * 1024 * 1024

/** Valida y analiza un MIDI (lanza error legible si no sirve) y prepara el registro. */
export function analyzeMidi(bytes: Uint8Array, fileName: string | null): Omit<NewSong, 'isDemo'> {
  const song = importSong(bytes)
  const midiTitle = song.title !== 'Sin título' ? song.title : null
  return {
    title: fileName ? titleFromFileName(fileName) : (midiTitle ?? 'Sin título'),
    fileName,
    midi: bytes,
    duration: song.duration,
    bpm: Math.round(song.tempos[0]?.bpm ?? 120),
    noteCount: song.notes.length,
    trackCount: song.tracks.length,
    difficulty: estimateDifficulty(song)
  }
}

export async function importMidiFile(repo: SongRepository, filePath: string): Promise<SongSummary> {
  if (!/\.(mid|midi)$/i.test(filePath)) throw new Error('Solo se admiten archivos .mid o .midi.')
  const info = await stat(filePath)
  if (info.size > MAX_MIDI_BYTES)
    throw new Error('El archivo es demasiado grande para ser un MIDI de piano (máx. 5 MB).')
  const bytes = new Uint8Array(await readFile(filePath))
  return repo.insert(analyzeMidi(bytes, basename(filePath)))
}

export interface DemoFile {
  path: string
  title: string
  artist: string
}

export async function seedDemos(repo: SongRepository, demos: DemoFile[]): Promise<void> {
  for (const demo of demos) {
    const bytes = new Uint8Array(await readFile(demo.path))
    const analyzed = analyzeMidi(bytes, null)
    await repo.insert({ ...analyzed, title: demo.title, artist: demo.artist, isDemo: true })
  }
}
