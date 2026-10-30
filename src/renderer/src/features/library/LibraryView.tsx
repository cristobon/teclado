import { useEffect, useMemo, useState } from 'react'
import type { SongSummary } from '@shared/ipc'
import { Button } from '../../components/ui/Button'
import { Difficulty } from '../../components/ui/Difficulty'
import { Icon } from '../../components/ui/Icon'
import { formatTime } from '../../lib/format'
import { filterSongs } from '../../stores/filterSongs'
import { useLibrary } from '../../stores/libraryStore'
import { usePlayer } from '../../stores/playerStore'

export function LibraryView() {
  const { songs, query, error, refresh, importSong, deleteSong, setQuery, clearError } =
    useLibrary()
  const open = usePlayer((s) => s.open)
  const visible = useMemo(() => filterSongs(songs, query), [songs, query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onImport = async () => {
    const song = await importSong()
    if (song) void open(song.id)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="drag flex items-end justify-between gap-6 px-10 pt-12 pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Biblioteca</h1>
          <p className="mt-1 text-sm text-muted">
            Elige una canción para practicar o importa tu propio archivo MIDI.
          </p>
        </div>
        <div className="no-drag flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-muted focus-within:border-accent">
            <Icon name="search" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar canción"
              className="w-48 bg-transparent text-ink outline-none placeholder:text-faint"
            />
          </label>
          <Button variant="primary" onClick={() => void onImport()}>
            <Icon name="import" size={16} /> Importar MIDI
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mx-10 mb-4 flex items-center justify-between rounded-lg border border-bad/30 bg-bad/10 px-4 py-2.5 text-sm text-bad"
        >
          <span>{error}</span>
          <Button variant="ghost" onClick={clearError}>
            Cerrar
          </Button>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-10 pb-10">
        {visible.length === 0 ? (
          <p className="mt-16 text-center text-muted">
            {songs.length === 0
              ? 'Tu biblioteca está vacía. Importa un archivo .mid para empezar.'
              : 'No hay canciones que coincidan.'}
          </p>
        ) : (
          <ul
            className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
            data-testid="song-list"
          >
            {visible.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onOpen={() => void open(song.id)}
                onDelete={() => void deleteSong(song.id)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function SongCard({
  song,
  onOpen,
  onDelete
}: {
  song: SongSummary
  onOpen: () => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <li className="group relative rounded-2xl border border-line bg-surface transition-colors hover:border-accent/50 hover:bg-panel">
      <button type="button" onClick={onOpen} className="block w-full p-5 text-left">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex size-10 items-center justify-center rounded-xl bg-raised text-accent">
            <Icon name="piano" size={20} />
          </span>
          {song.isDemo && (
            <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-muted">
              Demo
            </span>
          )}
        </div>
        <h2 className="truncate font-semibold">{song.title}</h2>
        <p className="truncate text-sm text-muted">{song.artist ?? song.fileName ?? 'Importada'}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted">
          <span>{formatTime(song.duration)}</span>
          <span>{song.bpm} BPM</span>
          <Difficulty value={song.difficulty} />
        </div>
      </button>
      <div className="absolute right-3 bottom-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {confirming ? (
          <span className="flex gap-1 rounded-lg bg-raised p-1">
            <Button variant="danger" onClick={onDelete}>
              Eliminar
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              No
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            aria-label={`Eliminar ${song.title}`}
            onClick={() => setConfirming(true)}
            className="px-2"
          >
            <Icon name="trash" size={16} />
          </Button>
        )}
      </div>
    </li>
  )
}
