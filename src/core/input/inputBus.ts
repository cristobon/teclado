import type { NoteEvent, NoteListener } from './types'

/** Punto único al que todas las fuentes envían sus notas. Lleva el registro de teclas pulsadas. */
export class InputBus {
  private listeners = new Set<NoteListener>()
  /** midi → fuentes que la mantienen pulsada (una tecla puede llegar por dos vías). */
  private held = new Map<number, Set<string>>()

  subscribe(listener: NoteListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event: NoteEvent): void {
    const holders = this.held.get(event.midi) ?? new Set<string>()
    if (event.type === 'on') {
      holders.add(event.source)
      this.held.set(event.midi, holders)
    } else {
      if (!holders.has(event.source)) return // note-off huérfano
      holders.delete(event.source)
      if (holders.size === 0) this.held.delete(event.midi)
    }
    for (const l of this.listeners) l(event)
  }

  /** Notas mantenidas en este momento, ordenadas. */
  activeNotes(): number[] {
    return [...this.held.keys()].sort((a, b) => a - b)
  }

  /** Suelta todo (p. ej. al perder el foco la ventana). */
  releaseAll(source: NoteEvent['source'], timestamp: number): void {
    for (const [midi, holders] of [...this.held]) {
      if (holders.has(source)) {
        this.emit({ type: 'off', midi, velocity: 0, timestamp, source, confidence: 1 })
      }
    }
  }
}
