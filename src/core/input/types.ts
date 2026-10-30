export type InputKind = 'keyboard' | 'mouse' | 'midi' | 'audio'

export interface NoteEvent {
  type: 'on' | 'off'
  midi: number
  /** 0..1 */
  velocity: number
  /** performance.now() en ms. */
  timestamp: number
  source: InputKind
  /**
   * Confianza de la detección (0..1). MIDI/teclado = 1. Un detector de tono por
   * micrófono reportará valores menores y la evaluación deberá ser más tolerante.
   */
  confidence: number
}

export type NoteListener = (event: NoteEvent) => void

/** Fuente de notas intercambiable: teclado del Mac, Web MIDI, micrófono (futuro). */
export interface InputSource {
  readonly kind: InputKind
  start(): void | Promise<void>
  stop(): void
}
