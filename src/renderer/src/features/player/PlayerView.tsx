import { useEffect, useRef, useState } from 'react'
import type { Hand } from '@core/song/types'
import { PianoStage } from '../../components/piano/PianoStage'
import { FULL_RANGE, rangeForNotes, shiftRange, zoomRange } from '../../components/piano/layout'
import { HAND_COLOR, HAND_LABEL, HAND_SHORT } from '../../components/piano/theme'
import { Button, IconButton } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { formatTime } from '../../lib/format'
import { usePlayer } from '../../stores/playerStore'
import { useSettings } from '../../stores/settingsStore'
import { TrackPanel } from './TrackPanel'

const RATE_PRESETS = [0.25, 0.5, 0.75, 1]

export function PlayerView() {
  const p = usePlayer()
  const { settings, update } = useSettings()
  const [showTracks, setShowTracks] = useState(false)
  const timeLabel = useRef<HTMLSpanElement>(null)
  const progress = useRef<HTMLInputElement>(null)
  const measureLabel = useRef<HTMLSpanElement>(null)
  const scrubbing = useRef(false)

  // Espacio = reproducir/pausar; flechas = compás anterior/siguiente.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        void p.toggle()
      } else if (e.code === 'ArrowLeft') p.seekMeasure(-1)
      else if (e.code === 'ArrowRight') p.seekMeasure(1)
      else if (e.code === 'Home') p.seek(0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p])

  if (!p.song || !p.controller) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        {p.error ?? 'Cargando canción…'}
      </div>
    )
  }
  const { song, controller } = p

  const onFrame = (time: number) => {
    if (timeLabel.current) timeLabel.current.textContent = formatTime(time)
    if (progress.current && !scrubbing.current) progress.current.value = String(time)
    if (measureLabel.current) {
      const m = song.measures.findLast((x) => x.startTime <= time + 1e-6) ?? song.measures[0]!
      measureLabel.current.textContent = `${m.number}/${song.measures.length}`
    }
  }

  const bpm = Math.round(song.tempos[0]!.bpm * p.rate)

  return (
    <div className="flex h-full flex-col">
      <header className="drag relative flex items-center gap-4 border-b border-line bg-surface py-2 pr-4 pl-24">
        <Button variant="ghost" onClick={p.close}>
          <Icon name="back" size={16} /> Biblioteca
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{song.title}</h1>
          <p className="truncate text-xs text-muted">
            {p.record?.artist ?? p.record?.fileName ?? ''}
          </p>
        </div>
        <HandToggles />
        <Button
          variant="subtle"
          onClick={() => setShowTracks((v) => !v)}
          aria-expanded={showTracks}
        >
          <Icon name="tracks" size={16} /> Pistas
        </Button>
        {showTracks && <TrackPanel onClose={() => setShowTracks(false)} />}
      </header>

      {song.warnings.length > 0 && (
        <div className="border-b border-line bg-lh/5 px-6 py-1.5 text-xs text-lh">
          {song.warnings.join(' ')}
        </div>
      )}

      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2">
        <div className="flex items-center gap-1">
          <IconButton label="Volver al inicio (Inicio)" onClick={() => p.seek(0)}>
            <Icon name="restart" />
          </IconButton>
          <IconButton label="Compás anterior (←)" onClick={() => p.seekMeasure(-1)}>
            <Icon name="prev" />
          </IconButton>
          <button
            type="button"
            onClick={() => void p.toggle()}
            aria-label={p.playing ? 'Pausar (espacio)' : 'Reproducir (espacio)'}
            className="mx-1 flex size-10 items-center justify-center rounded-full bg-accent text-[#0b0d12] transition hover:brightness-110"
          >
            <Icon name={p.playing ? 'pause' : 'play'} size={20} />
          </button>
          <IconButton label="Compás siguiente (→)" onClick={() => p.seekMeasure(1)}>
            <Icon name="next" />
          </IconButton>
        </div>

        <span ref={timeLabel} className="w-10 text-right font-mono text-xs text-muted tabular-nums">
          0:00
        </span>
        <input
          ref={progress}
          type="range"
          min={0}
          max={song.duration}
          step={0.01}
          defaultValue={0}
          aria-label="Posición en la canción"
          className="min-w-24 flex-1"
          onPointerDown={() => (scrubbing.current = true)}
          onPointerUp={() => (scrubbing.current = false)}
          onChange={(e) => controller.seek(Number(e.target.value))}
        />
        <span className="w-10 font-mono text-xs text-muted tabular-nums">
          {formatTime(song.duration)}
        </span>
        <span className="text-xs text-muted">
          Compás <span ref={measureLabel} className="font-mono text-ink tabular-nums" />
        </span>

        <div className="ml-2 flex items-center gap-2 border-l border-line pl-4">
          <span className="text-xs text-muted">Velocidad</span>
          <input
            type="range"
            min={0.25}
            max={1}
            step={0.05}
            value={p.rate}
            onChange={(e) => p.setRate(Number(e.target.value))}
            aria-label="Velocidad de reproducción"
            className="w-24"
          />
          <div className="flex gap-0.5">
            {RATE_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => p.setRate(r)}
                className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                  Math.abs(p.rate - r) < 0.001
                    ? 'bg-accent text-[#0b0d12]'
                    : 'text-muted hover:bg-raised'
                }`}
              >
                {r * 100}%
              </button>
            ))}
          </div>
          <span
            className="w-16 text-right font-mono text-xs text-ink tabular-nums"
            title="Tempo efectivo"
          >
            ♩ = {bpm}
          </span>
        </div>

        <div className="ml-2 flex items-center gap-2 border-l border-line pl-4">
          <span
            className="text-xs text-muted"
            title="Cuántos segundos de música ves por adelantado"
          >
            Caída
          </span>
          <input
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={settings.lookaheadSeconds}
            onChange={(e) => update({ lookaheadSeconds: Number(e.target.value) })}
            aria-label="Velocidad de caída de las notas"
            className="w-20"
          />
        </div>
      </div>

      <PianoStage
        song={song}
        getTime={() => controller.time}
        range={p.range}
        visibleHands={p.visibleHands}
        lookahead={settings.lookaheadSeconds}
        showNames={settings.showNoteNames}
        naming={settings.noteNaming}
        onFrame={onFrame}
      />

      <footer className="flex items-center gap-2 border-t border-line bg-surface px-4 py-1.5 text-xs text-muted">
        <span>Teclado:</span>
        <IconButton
          label="Desplazar a la izquierda"
          onClick={() => p.setRange(shiftRange(p.range, -12))}
        >
          <Icon name="left" size={16} />
        </IconButton>
        <IconButton
          label="Desplazar a la derecha"
          onClick={() => p.setRange(shiftRange(p.range, 12))}
        >
          <Icon name="right" size={16} />
        </IconButton>
        <IconButton label="Alejar (más teclas)" onClick={() => p.setRange(zoomRange(p.range, 1))}>
          <Icon name="minus" size={16} />
        </IconButton>
        <IconButton
          label="Acercar (menos teclas)"
          onClick={() => p.setRange(zoomRange(p.range, -1))}
        >
          <Icon name="plus" size={16} />
        </IconButton>
        <Button
          variant="ghost"
          onClick={() => p.setRange(rangeForNotes(song.notes.map((n) => n.midi)))}
        >
          Ajustar a la canción
        </Button>
        <Button variant="ghost" onClick={() => p.setRange(FULL_RANGE)}>
          88 teclas
        </Button>
        <label className="ml-auto flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.showNoteNames}
            onChange={(e) => update({ showNoteNames: e.target.checked })}
          />
          Nombres de notas
        </label>
        <select
          value={settings.noteNaming}
          onChange={(e) => update({ noteNaming: e.target.value as 'english' | 'solfege' })}
          className="rounded-md border border-line bg-raised px-1.5 py-0.5 text-ink"
          aria-label="Sistema de nombres de notas"
        >
          <option value="english">C D E</option>
          <option value="solfege">Do Re Mi</option>
        </select>
        <KeyboardHint />
      </footer>
    </div>
  )
}

function HandToggles() {
  const { audibleHands, visibleHands, toggleAudibleHand, toggleVisibleHand } = usePlayer()
  const hands: Hand[] = ['left', 'right']
  return (
    <div className="no-drag flex items-center gap-3">
      {hands.map((hand) => (
        <div key={hand} className="flex items-center gap-1 rounded-lg bg-raised px-2 py-1">
          <span className="size-2.5 rounded-full" style={{ background: HAND_COLOR[hand] }} />
          <span className="text-xs font-medium" title={HAND_LABEL[hand]}>
            {HAND_SHORT[hand]}
          </span>
          <IconButton
            label={`${visibleHands.includes(hand) ? 'Ocultar' : 'Mostrar'} ${HAND_LABEL[hand].toLowerCase()}`}
            active={visibleHands.includes(hand)}
            onClick={() => toggleVisibleHand(hand)}
            className="size-7"
          >
            <Icon name="eye" size={15} />
          </IconButton>
          <IconButton
            label={`${audibleHands.includes(hand) ? 'Silenciar' : 'Escuchar'} ${HAND_LABEL[hand].toLowerCase()}`}
            active={audibleHands.includes(hand)}
            onClick={() => toggleAudibleHand(hand)}
            className="size-7"
          >
            <Icon name="volume" size={15} />
          </IconButton>
        </div>
      ))}
    </div>
  )
}

function KeyboardHint() {
  const base = useSettings((s) => s.settings.keyboardBase)
  const octave = Math.floor(base / 12) - 1
  return (
    <span
      className="ml-3 border-l border-line pl-3"
      title="Fila A S D F G H J K = teclas blancas; W E T Y U O P = negras"
    >
      Teclado del Mac: A–Ñ desde C{octave} · Z/X cambia de octava
    </span>
  )
}
