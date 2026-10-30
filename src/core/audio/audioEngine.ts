import * as Tone from 'tone'
import type { TimeSource } from '../playback/clock'

/** Notas muestreadas (cada ~3 semitonos); Tone.Sampler interpola el resto. */
const SAMPLE_NOTES = [
  'A0',
  ...[1, 2, 3, 4, 5, 6, 7].flatMap((o) => [`C${o}`, `Ds${o}`, `Fs${o}`, `A${o}`]),
  'C8'
]

export type AudioStatus = 'idle' | 'loading' | 'ready' | 'error'

function noteNameFor(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote()
}

/**
 * Motor de audio: piano muestreado para la reproducción y para tocar en vivo.
 * Debe usarse solo en el renderer (necesita Web Audio).
 */
export class AudioEngine implements TimeSource {
  private sampler: Tone.Sampler | null = null
  private loading: Promise<void> | null = null
  status: AudioStatus = 'idle'

  constructor(private readonly samplesBaseUrl: string) {
    // Latencia mínima para tocar en vivo; la reproducción programa con tiempos explícitos.
    Tone.setContext(new Tone.Context({ latencyHint: 'interactive', lookAhead: 0 }))
  }

  /** Carga muestras. Puede llamarse varias veces. */
  load(): Promise<void> {
    if (this.loading) return this.loading
    this.status = 'loading'
    const urls = Object.fromEntries(SAMPLE_NOTES.map((n) => [n.replace('s', '#'), `${n}.mp3`]))
    this.loading = new Promise<void>((resolve, reject) => {
      this.sampler = new Tone.Sampler({
        urls,
        baseUrl: this.samplesBaseUrl,
        release: 1.2,
        onload: () => {
          this.status = 'ready'
          resolve()
        },
        onerror: (err: Error) => {
          this.status = 'error'
          reject(err)
        }
      }).toDestination()
    })
    return this.loading
  }

  /** El navegador exige un gesto del usuario para arrancar el audio. */
  async resume(): Promise<void> {
    if (Tone.getContext().state !== 'running') await Tone.start()
  }

  now(): number {
    return Tone.getContext().rawContext.currentTime
  }

  /** Volumen maestro 0..1. */
  setVolume(volume: number): void {
    Tone.getDestination().volume.value = volume <= 0 ? -Infinity : Tone.gainToDb(volume)
  }

  noteOn(midi: number, velocity = 0.8, when?: number): void {
    this.sampler?.triggerAttack(noteNameFor(midi), when ?? this.now(), velocity)
  }

  noteOff(midi: number, when?: number): void {
    this.sampler?.triggerRelease(noteNameFor(midi), when ?? this.now())
  }

  playNote(midi: number, duration: number, when: number, velocity: number): void {
    this.sampler?.triggerAttackRelease(noteNameFor(midi), Math.max(0.05, duration), when, velocity)
  }

  stopAll(): void {
    this.sampler?.releaseAll(this.now())
  }
}
