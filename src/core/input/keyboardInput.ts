import type { InputBus } from './inputBus'
import {
  DEFAULT_KEYBOARD_BASE,
  DEFAULT_KEYBOARD_MAPPING,
  OCTAVE_DOWN_CODE,
  OCTAVE_UP_CODE,
  midiForCode,
  shiftBase,
  type KeyboardMapping
} from './keyboardMapping'

/** Lo mínimo de KeyboardEvent que necesitamos (facilita tests). */
export interface KeyLike {
  code: string
  repeat: boolean
  timeStamp: number
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}

export const KEYBOARD_VELOCITY = 0.75

/** Traduce teclas del computador a notas. No escucha a window: recibe eventos desde fuera. */
export class KeyboardInput {
  readonly kind = 'keyboard' as const
  private pressed = new Map<string, number>()
  enabled = true
  /** Se llama cuando el usuario cambia de octava con Z/X. */
  onBaseChange: ((base: number) => void) | null = null

  constructor(
    private readonly bus: InputBus,
    public mapping: KeyboardMapping = DEFAULT_KEYBOARD_MAPPING,
    public baseMidi: number = DEFAULT_KEYBOARD_BASE
  ) {}

  /** Devuelve true si la tecla fue consumida. */
  keyDown(e: KeyLike): boolean {
    if (!this.enabled || e.metaKey || e.ctrlKey || e.altKey) return false
    if (e.code === OCTAVE_DOWN_CODE || e.code === OCTAVE_UP_CODE) {
      if (!e.repeat) this.setBase(shiftBase(this.baseMidi, e.code === OCTAVE_UP_CODE ? 1 : -1))
      return true
    }
    const midi = midiForCode(e.code, this.mapping, this.baseMidi)
    if (midi === null) return false
    if (e.repeat || this.pressed.has(e.code)) return true
    this.pressed.set(e.code, midi)
    this.bus.emit({
      type: 'on',
      midi,
      velocity: KEYBOARD_VELOCITY,
      timestamp: e.timeStamp,
      source: 'keyboard',
      confidence: 1
    })
    return true
  }

  keyUp(e: KeyLike): boolean {
    // Se usa la nota guardada al pulsar: cambiar de octava con la tecla pulsada no deja notas colgadas.
    const midi = this.pressed.get(e.code)
    if (midi === undefined) return false
    this.pressed.delete(e.code)
    this.bus.emit({
      type: 'off',
      midi,
      velocity: 0,
      timestamp: e.timeStamp,
      source: 'keyboard',
      confidence: 1
    })
    return true
  }

  releaseAll(timestamp: number): void {
    for (const code of [...this.pressed.keys()]) {
      this.keyUp({ code, repeat: false, timeStamp: timestamp })
    }
  }

  setBase(base: number): void {
    this.baseMidi = base
    this.onBaseChange?.(base)
  }
}
