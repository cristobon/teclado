/** Fuente de tiempo en segundos (AudioContext.currentTime en la app, falsa en tests). */
export interface TimeSource {
  now(): number
}

export const MIN_RATE = 0.25
export const MAX_RATE = 1

export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return MAX_RATE
  return Math.min(MAX_RATE, Math.max(MIN_RATE, rate))
}

/**
 * Reloj de la canción. La posición avanza a `rate` segundos de canción por segundo real,
 * de modo que cambiar la velocidad no altera la altura del sonido (cada nota se dispara aparte).
 */
export class PlaybackClock {
  private anchorReal = 0
  private anchorSong = 0
  private _rate = MAX_RATE
  private _playing = false

  constructor(private readonly source: TimeSource) {}

  get playing(): boolean {
    return this._playing
  }

  get rate(): number {
    return this._rate
  }

  /** Posición actual en segundos de canción (a velocidad 100 %). */
  get time(): number {
    if (!this._playing) return this.anchorSong
    return this.anchorSong + (this.source.now() - this.anchorReal) * this._rate
  }

  play(): void {
    if (this._playing) return
    this.anchorReal = this.source.now()
    this._playing = true
  }

  pause(): void {
    if (!this._playing) return
    this.anchorSong = this.time
    this._playing = false
  }

  seek(songTime: number): void {
    this.anchorSong = Math.max(0, songTime)
    this.anchorReal = this.source.now()
  }

  setRate(rate: number): void {
    const current = this.time
    this._rate = clampRate(rate)
    this.anchorSong = current
    this.anchorReal = this.source.now()
  }

  /** Convierte un instante de canción en instante real de la fuente de tiempo. */
  realTimeFor(songTime: number): number {
    return this.source.now() + (songTime - this.time) / this._rate
  }
}
