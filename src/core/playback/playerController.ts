import type { Hand, Song } from '../song/types'
import { PlaybackClock, type TimeSource } from './clock'
import { NoteScheduler } from './scheduler'

/** Lo que el controlador necesita del motor de audio. */
export interface AudioOutput extends TimeSource {
  playNote(midi: number, duration: number, when: number, velocity: number): void
  stopAll(): void
}

export interface PlayerState {
  playing: boolean
  rate: number
  audibleHands: Hand[]
}

/**
 * Orquesta reloj, planificador y audio para una canción.
 * Llamar tick() periódicamente (~25 ms) desde la capa de UI.
 */
export class PlayerController {
  readonly clock: PlaybackClock
  private scheduler: NoteScheduler
  private audible = new Set<Hand>(['left', 'right'])
  private listeners = new Set<(s: PlayerState) => void>()

  constructor(
    readonly song: Song,
    private readonly audio: AudioOutput
  ) {
    this.clock = new PlaybackClock(audio)
    this.scheduler = new NoteScheduler(
      song.notes,
      this.clock,
      audio,
      ({ note, when, duration }) => audio.playNote(note.midi, duration, when, note.velocity),
      { filter: (n) => this.audible.has(n.hand) }
    )
  }

  get state(): PlayerState {
    return { playing: this.clock.playing, rate: this.clock.rate, audibleHands: [...this.audible] }
  }

  get time(): number {
    return Math.min(this.clock.time, this.song.duration)
  }

  subscribe(listener: (s: PlayerState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    const s = this.state
    for (const l of this.listeners) l(s)
  }

  play(): void {
    if (this.clock.playing) return
    if (this.clock.time >= this.song.duration) this.clock.seek(0)
    this.clock.play()
    this.scheduler.reset()
    this.emit()
  }

  pause(): void {
    if (!this.clock.playing) return
    this.clock.pause()
    this.audio.stopAll()
    this.emit()
  }

  toggle(): void {
    if (this.clock.playing) this.pause()
    else this.play()
  }

  seek(time: number): void {
    this.clock.seek(Math.min(Math.max(0, time), this.song.duration))
    this.audio.stopAll()
    this.scheduler.reset()
    this.emit()
  }

  /** Retrocede/avanza al inicio del compás anterior/siguiente. */
  seekMeasure(delta: -1 | 1): void {
    const t = this.clock.time
    const measures = this.song.measures
    let i = measures.findIndex((m) => m.endTime > t + 1e-6)
    if (i === -1) i = measures.length - 1
    // Si ya estamos casi al inicio del compás, "anterior" va al compás previo.
    const atStart = t - measures[i]!.startTime < 0.25
    const target = delta < 0 ? (atStart ? i - 1 : i) : i + 1
    const m = measures[Math.min(measures.length - 1, Math.max(0, target))]!
    this.seek(m.startTime)
  }

  setRate(rate: number): void {
    this.clock.setRate(rate)
    this.scheduler.reset()
    this.emit()
  }

  setAudibleHands(hands: Hand[]): void {
    this.audible = new Set(hands)
    this.emit()
  }

  tick(): void {
    if (!this.clock.playing) return
    if (this.clock.time >= this.song.duration) {
      this.clock.pause()
      this.clock.seek(this.song.duration)
      this.emit()
      return
    }
    this.scheduler.tick()
  }

  dispose(): void {
    this.pause()
    this.listeners.clear()
  }
}
