import type { TempoEvent } from './types'

export const DEFAULT_BPM = 120

/**
 * Convierte entre ticks y segundos respetando cambios de tempo.
 * Inmutable: se construye una vez por canción.
 */
export class TempoMap {
  readonly events: readonly TempoEvent[]

  constructor(
    readonly ppq: number,
    tempos: ReadonlyArray<{ ticks: number; bpm: number }>
  ) {
    if (!(ppq > 0)) throw new Error(`PPQ inválido: ${ppq}`)
    const sorted = [...tempos]
      .filter((t) => Number.isFinite(t.bpm) && t.bpm > 0 && t.ticks >= 0)
      .sort((a, b) => a.ticks - b.ticks)
    // Un tempo por tick (el último gana). Según el estándar MIDI rige 120 BPM hasta el primer evento.
    const dedup: Array<{ ticks: number; bpm: number }> = []
    for (const t of sorted) {
      const last = dedup[dedup.length - 1]
      if (last && last.ticks === t.ticks) last.bpm = t.bpm
      else dedup.push({ ticks: t.ticks, bpm: t.bpm })
    }
    if (dedup.length === 0 || dedup[0]!.ticks > 0) {
      dedup.unshift({ ticks: 0, bpm: DEFAULT_BPM })
    }
    const events: TempoEvent[] = []
    let time = 0
    for (let i = 0; i < dedup.length; i++) {
      const cur = dedup[i]!
      if (i > 0) {
        const prev = dedup[i - 1]!
        time += this.secondsPerTick(prev.bpm) * (cur.ticks - prev.ticks)
      }
      events.push({ ticks: cur.ticks, bpm: cur.bpm, time })
    }
    this.events = events
  }

  private secondsPerTick(bpm: number): number {
    return 60 / (bpm * this.ppq)
  }

  private eventAtTick(ticks: number): TempoEvent {
    let lo = 0
    let hi = this.events.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.events[mid]!.ticks <= ticks) lo = mid
      else hi = mid - 1
    }
    return this.events[lo]!
  }

  private eventAtTime(seconds: number): TempoEvent {
    let lo = 0
    let hi = this.events.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.events[mid]!.time <= seconds) lo = mid
      else hi = mid - 1
    }
    return this.events[lo]!
  }

  ticksToSeconds(ticks: number): number {
    const e = this.eventAtTick(ticks)
    return e.time + (ticks - e.ticks) * this.secondsPerTick(e.bpm)
  }

  secondsToTicks(seconds: number): number {
    const e = this.eventAtTime(seconds)
    return e.ticks + (seconds - e.time) / this.secondsPerTick(e.bpm)
  }

  bpmAtTick(ticks: number): number {
    return this.eventAtTick(ticks).bpm
  }

  bpmAtTime(seconds: number): number {
    return this.eventAtTime(seconds).bpm
  }
}
