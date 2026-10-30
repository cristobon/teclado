import { describe, expect, it } from 'vitest'
import {
  FULL_RANGE,
  computeKeyLayout,
  keyAt,
  normalizeRange,
  rangeForNotes,
  shiftRange,
  zoomRange
} from './layout'

describe('layout del teclado', () => {
  it('88 teclas con 52 blancas de igual ancho', () => {
    const keys = computeKeyLayout(FULL_RANGE, 1040)
    expect(keys).toHaveLength(88)
    const whites = keys.filter((k) => !k.black)
    expect(whites).toHaveLength(52)
    expect(whites[0]!.width).toBeCloseTo(20)
    expect(whites[51]!.x + whites[51]!.width).toBeCloseTo(1040)
  })

  it('las negras quedan entre sus blancas vecinas', () => {
    const keys = computeKeyLayout({ low: 60, high: 72 }, 800)
    const cs = keys.find((k) => k.midi === 61)!
    const c = keys.find((k) => k.midi === 60)!
    const d = keys.find((k) => k.midi === 62)!
    expect(cs.x).toBeGreaterThan(c.x)
    expect(cs.x + cs.width).toBeLessThan(d.x + d.width)
  })

  it('detecta la tecla bajo el puntero priorizando negras', () => {
    const keys = computeKeyLayout({ low: 60, high: 72 }, 800)
    const cs = keys.find((k) => k.midi === 61)!
    expect(keyAt(keys, cs.x + 2, 10, 60)).toBe(61)
    expect(keyAt(keys, cs.x + 2, 90, 60)).not.toBe(61)
    expect(keyAt(keys, 1, 90, 60)).toBe(60)
  })

  it('nunca empieza ni termina en tecla negra', () => {
    expect(normalizeRange({ low: 61, high: 70 })).toEqual({ low: 60, high: 71 })
  })

  it('ajusta el rango a la canción con un mínimo de teclas', () => {
    const r = rangeForNotes([60, 64, 67])
    expect(r.low).toBeLessThanOrEqual(58)
    expect(r.high).toBeGreaterThanOrEqual(69)
    expect((r.high - r.low) * (7 / 12)).toBeGreaterThanOrEqual(22)
  })

  it('zoom y desplazamiento no salen del piano', () => {
    const r = zoomRange({ low: 48, high: 84 }, 1)
    expect(r.high - r.low).toBeGreaterThan(36)
    expect(zoomRange({ low: 48, high: 72 }, -1)).toEqual({ low: 48, high: 72 })
    expect(shiftRange({ low: 21, high: 60 }, -12).low).toBe(21)
    expect(shiftRange({ low: 60, high: 108 }, 12).high).toBe(108)
  })
})
