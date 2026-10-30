import { describe, expect, it } from 'vitest'
import { InputBus } from './inputBus'
import { KeyboardInput } from './keyboardInput'
import { midiForCode, DEFAULT_KEYBOARD_MAPPING } from './keyboardMapping'
import type { NoteEvent } from './types'

function key(code: string, extra: Partial<{ repeat: boolean; metaKey: boolean }> = {}) {
  return { code, repeat: false, timeStamp: 1, ...extra }
}

function setup() {
  const bus = new InputBus()
  const events: NoteEvent[] = []
  bus.subscribe((e) => events.push(e))
  const kb = new KeyboardInput(bus)
  return { bus, events, kb }
}

describe('mapeo de teclado', () => {
  it('A = C4 y K = C5 con base por defecto', () => {
    expect(midiForCode('KeyA', DEFAULT_KEYBOARD_MAPPING, 60)).toBe(60)
    expect(midiForCode('KeyW', DEFAULT_KEYBOARD_MAPPING, 60)).toBe(61)
    expect(midiForCode('KeyK', DEFAULT_KEYBOARD_MAPPING, 60)).toBe(72)
    expect(midiForCode('KeyQ', DEFAULT_KEYBOARD_MAPPING, 60)).toBeNull()
  })

  it('acepta un mapeo personalizado', () => {
    expect(midiForCode('Digit1', { Digit1: 4 }, 48)).toBe(52)
  })
})

describe('KeyboardInput + InputBus', () => {
  it('emite note on/off y registra teclas mantenidas (acordes)', () => {
    const { bus, events, kb } = setup()
    kb.keyDown(key('KeyA'))
    kb.keyDown(key('KeyD'))
    kb.keyDown(key('KeyG'))
    expect(bus.activeNotes()).toEqual([60, 64, 67])
    kb.keyUp(key('KeyD'))
    expect(bus.activeNotes()).toEqual([60, 67])
    expect(events.map((e) => `${e.type}${e.midi}`)).toEqual(['on60', 'on64', 'on67', 'off64'])
  })

  it('ignora la autorrepetición y los atajos con Cmd', () => {
    const { events, kb } = setup()
    kb.keyDown(key('KeyA'))
    kb.keyDown(key('KeyA', { repeat: true }))
    expect(kb.keyDown(key('KeyS', { metaKey: true }))).toBe(false)
    expect(events).toHaveLength(1)
  })

  it('Z/X cambian de octava y la nota se suelta correctamente aunque cambie la octava', () => {
    const { bus, events, kb } = setup()
    kb.keyDown(key('KeyA'))
    kb.keyDown(key('KeyX'))
    kb.keyUp(key('KeyA'))
    expect(bus.activeNotes()).toEqual([])
    kb.keyDown(key('KeyA'))
    expect(events.map((e) => `${e.type}${e.midi}`)).toEqual(['on60', 'off60', 'on72'])
  })

  it('releaseAll suelta todo al perder el foco', () => {
    const { bus, kb } = setup()
    kb.keyDown(key('KeyA'))
    kb.keyDown(key('KeyS'))
    kb.releaseAll(5)
    expect(bus.activeNotes()).toEqual([])
  })

  it('una nota mantenida por dos fuentes sigue activa hasta que ambas la sueltan', () => {
    const bus = new InputBus()
    const base = { velocity: 1, timestamp: 0, confidence: 1, midi: 60 }
    bus.emit({ ...base, type: 'on', source: 'keyboard' })
    bus.emit({ ...base, type: 'on', source: 'midi' })
    bus.emit({ ...base, type: 'off', source: 'keyboard' })
    expect(bus.activeNotes()).toEqual([60])
    bus.emit({ ...base, type: 'off', source: 'midi' })
    expect(bus.activeNotes()).toEqual([])
  })
})
