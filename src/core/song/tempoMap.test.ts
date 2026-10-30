import { describe, expect, it } from 'vitest'
import { TempoMap } from './tempoMap'

describe('TempoMap', () => {
  it('convierte ticks a segundos con tempo constante', () => {
    const map = new TempoMap(480, [{ ticks: 0, bpm: 120 }])
    expect(map.ticksToSeconds(480)).toBeCloseTo(0.5)
    expect(map.ticksToSeconds(1920)).toBeCloseTo(2)
    expect(map.secondsToTicks(2)).toBeCloseTo(1920)
  })

  it('usa 120 BPM si no hay tempo', () => {
    const map = new TempoMap(96, [])
    expect(map.ticksToSeconds(96)).toBeCloseTo(0.5)
  })

  it('respeta cambios de tempo', () => {
    // 1 negra a 120 (0.5 s) y luego negras a 60 (1 s cada una)
    const map = new TempoMap(480, [
      { ticks: 0, bpm: 120 },
      { ticks: 480, bpm: 60 }
    ])
    expect(map.ticksToSeconds(480)).toBeCloseTo(0.5)
    expect(map.ticksToSeconds(960)).toBeCloseTo(1.5)
    expect(map.ticksToSeconds(1440)).toBeCloseTo(2.5)
    expect(map.secondsToTicks(1.5)).toBeCloseTo(960)
    expect(map.bpmAtTick(500)).toBe(60)
    expect(map.bpmAtTime(0.2)).toBe(120)
  })

  it('es reversible en todo el rango', () => {
    const map = new TempoMap(480, [
      { ticks: 0, bpm: 90 },
      { ticks: 1000, bpm: 140 },
      { ticks: 3000, bpm: 72 }
    ])
    for (let t = 0; t < 6000; t += 137) {
      expect(map.secondsToTicks(map.ticksToSeconds(t))).toBeCloseTo(t, 6)
    }
  })

  it('usa 120 BPM antes del primer tempo y descarta duplicados', () => {
    const map = new TempoMap(480, [
      { ticks: 960, bpm: 100 },
      { ticks: 960, bpm: 80 }
    ])
    expect(map.events).toHaveLength(2)
    expect(map.events[0]).toMatchObject({ ticks: 0, bpm: 120 })
    expect(map.events[1]).toMatchObject({ ticks: 960, bpm: 80 })
  })

  it('rechaza PPQ inválido', () => {
    expect(() => new TempoMap(0, [])).toThrow()
  })
})
