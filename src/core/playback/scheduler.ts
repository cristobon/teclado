import type { SongNote } from '../song/types'
import type { PlaybackClock, TimeSource } from './clock'

export interface ScheduledNote {
  note: SongNote
  /** Instante real (fuente de tiempo) en que debe sonar. */
  when: number
  /** Duración real en segundos, ya escalada por la velocidad. */
  duration: number
}

export interface SchedulerOptions {
  /** Cuánto adelanto (en segundos reales) se programa. */
  lookahead?: number
  /** Qué notas deben sonar (p. ej. solo mano izquierda). */
  filter?: (note: SongNote) => boolean
}

/**
 * Programa notas por adelantado contra el reloj. Llamar tick() cada ~25 ms.
 * Independiente de requestAnimationFrame: el audio no se corta si la UI va lenta.
 */
export class NoteScheduler {
  private cursor = 0
  private scheduledUntil = 0
  private readonly lookahead: number
  filter: (note: SongNote) => boolean

  constructor(
    private readonly notes: readonly SongNote[],
    private readonly clock: PlaybackClock,
    private readonly source: TimeSource,
    private readonly onNote: (n: ScheduledNote) => void,
    options: SchedulerOptions = {}
  ) {
    this.lookahead = options.lookahead ?? 0.1
    this.filter = options.filter ?? (() => true)
    this.reset()
  }

  /** Llamar tras seek / cambio de velocidad / reanudar. */
  reset(): void {
    const from = this.clock.time
    this.cursor = lowerBound(this.notes, from)
    this.scheduledUntil = from
  }

  tick(): void {
    if (!this.clock.playing) return
    const now = this.clock.time
    const horizon = now + this.lookahead * this.clock.rate
    if (horizon <= this.scheduledUntil) return
    while (this.cursor < this.notes.length) {
      const note = this.notes[this.cursor]!
      if (note.time >= horizon) break
      this.cursor++
      if (note.time < now - 0.05) continue // el tick llegó tarde: no disparar notas viejas en ráfaga
      if (!this.filter(note)) continue
      this.onNote({
        note,
        when: Math.max(this.source.now(), this.clock.realTimeFor(note.time)),
        duration: note.duration / this.clock.rate
      })
    }
    this.scheduledUntil = horizon
  }
}

/** Primer índice con note.time >= t (notas ordenadas por tiempo). */
export function lowerBound(notes: readonly SongNote[], t: number): number {
  let lo = 0
  let hi = notes.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (notes[mid]!.time < t) lo = mid + 1
    else hi = mid
  }
  return lo
}
