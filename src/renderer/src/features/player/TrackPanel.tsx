import { noteName } from '@core/music/notes'
import type { HandSource, TrackHandAssignment } from '@core/song/types'
import { useSettings } from '../../stores/settingsStore'
import { usePlayer } from '../../stores/playerStore'

const SOURCE_LABEL: Record<HandSource, string> = {
  name: 'por nombre de pista',
  pitch: 'estimada por altura',
  'split-point': 'estimada por punto de corte',
  manual: 'elegida por ti',
  instrument: 'no es piano'
}

const SPLIT_OPTIONS = Array.from({ length: 25 }, (_, i) => 48 + i) // C3–C5

export function TrackPanel({ onClose }: { onClose: () => void }) {
  const song = usePlayer((s) => s.song)
  const setTrackAssignment = usePlayer((s) => s.setTrackAssignment)
  const setSplitPoint = usePlayer((s) => s.setSplitPoint)
  const naming = useSettings((s) => s.settings.noteNaming)
  if (!song) return null
  const hasSplit = song.tracks.some((t) => t.assignment === 'split')
  const usedCount = song.tracks.filter((t) => t.assignment !== 'ignore').length

  return (
    <div
      role="dialog"
      aria-label="Pistas y manos"
      className="no-drag absolute top-full right-4 z-20 mt-2 max-h-[70vh] w-[440px] overflow-y-auto rounded-2xl border border-line bg-panel p-4 shadow-2xl shadow-black/50"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Pistas y manos</h2>
        <button type="button" className="text-sm text-muted hover:text-ink" onClick={onClose}>
          Listo
        </button>
      </div>
      <ul className="space-y-2">
        {song.tracks.map((t) => (
          <li
            key={t.index}
            className={`rounded-xl bg-surface p-3 ${t.assignment === 'ignore' ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted">
                  {t.noteCount} notas · {noteName(t.minPitch, naming)}–
                  {noteName(t.maxPitch, naming)} · {SOURCE_LABEL[t.handSource]}
                </p>
              </div>
              <select
                value={t.assignment}
                onChange={(e) =>
                  void setTrackAssignment(t.index, e.target.value as TrackHandAssignment)
                }
                className="rounded-lg border border-line bg-raised px-2 py-1 text-sm"
                aria-label={`Mano para ${t.name}`}
              >
                <option value="right">Mano derecha</option>
                <option value="left">Mano izquierda</option>
                <option value="split">Dividir por altura</option>
                <option value="ignore" disabled={t.assignment !== 'ignore' && usedCount <= 1}>
                  No usar
                </option>
              </select>
            </div>
          </li>
        ))}
      </ul>
      {hasSplit && (
        <label className="mt-3 flex items-center justify-between text-sm text-muted">
          Punto de corte (desde aquí, mano derecha)
          <select
            value={song.splitPoint}
            onChange={(e) => void setSplitPoint(Number(e.target.value))}
            className="rounded-lg border border-line bg-raised px-2 py-1 text-ink"
          >
            {SPLIT_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {noteName(m, naming)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
