import { describe, expect, it } from 'vitest'
import { buildSong } from '../song/buildSong'
import { FakeTime } from '../testing/fakeTime'
import { PlaybackClock } from './clock'
import { NoteScheduler, type ScheduledNote } from './scheduler'

function song() {
  // 8 negras a 120 BPM: una nota cada 0.5 s; alternan manos por pista
  return buildSong({
    name: 't',
    ppq: 480,
    tempos: [{ ticks: 0, bpm: 120 }],
    timeSignatures: [],
    keySignatures: [],
    tracks: [
      {
        name: 'Right',
        channel: 0,
        instrument: '',
        family: 'piano',
        isPercussion: false,
        notes: [0, 2, 4, 6].map((b) => ({
          midi: 72,
          ticks: b * 480,
          durationTicks: 480,
          velocity: 0.8
        }))
      },
      {
        name: 'Left',
        channel: 1,
        instrument: '',
        family: 'piano',
        isPercussion: false,
        notes: [1, 3, 5, 7].map((b) => ({
          midi: 48,
          ticks: b * 480,
          durationTicks: 480,
          velocity: 0.8
        }))
      }
    ]
  })
}

describe('PlaybackClock', () => {
  it('avanza solo mientras reproduce', () => {
    const time = new FakeTime(10)
    const clock = new PlaybackClock(time)
    time.advance(1)
    expect(clock.time).toBe(0)
    clock.play()
    time.advance(2)
    expect(clock.time).toBeCloseTo(2)
    clock.pause()
    time.advance(5)
    expect(clock.time).toBeCloseTo(2)
  })

  it('cambia de velocidad sin saltar de posición', () => {
    const time = new FakeTime()
    const clock = new PlaybackClock(time)
    clock.play()
    time.advance(2)
    clock.setRate(0.5)
    expect(clock.time).toBeCloseTo(2)
    time.advance(2)
    expect(clock.time).toBeCloseTo(3)
  })

  it('limita la velocidad entre 25 % y 100 %', () => {
    const clock = new PlaybackClock(new FakeTime())
    clock.setRate(0.1)
    expect(clock.rate).toBe(0.25)
    clock.setRate(3)
    expect(clock.rate).toBe(1)
  })

  it('permite retroceder (seek) durante la reproducción', () => {
    const time = new FakeTime()
    const clock = new PlaybackClock(time)
    clock.play()
    time.advance(3)
    clock.seek(1)
    expect(clock.time).toBeCloseTo(1)
    time.advance(1)
    expect(clock.time).toBeCloseTo(2)
    clock.seek(-4)
    expect(clock.time).toBe(0)
  })
})

describe('NoteScheduler', () => {
  function setup(filter?: (n: { hand: string }) => boolean) {
    const time = new FakeTime(100)
    const clock = new PlaybackClock(time)
    const out: ScheduledNote[] = []
    const s = song()
    const scheduler = new NoteScheduler(s.notes, clock, time, (n) => out.push(n), {
      lookahead: 0.1,
      filter
    })
    return { time, clock, out, scheduler }
  }

  function run(ctx: ReturnType<typeof setup>, seconds: number) {
    for (let i = 0; i < seconds / 0.025; i++) {
      ctx.scheduler.tick()
      ctx.time.advance(0.025)
    }
  }

  it('programa cada nota exactamente una vez y a su hora', () => {
    const ctx = setup()
    ctx.clock.play()
    run(ctx, 5)
    expect(ctx.out).toHaveLength(8)
    ctx.out.forEach((s, i) => expect(s.when).toBeCloseTo(100 + i * 0.5, 5))
  })

  it('a 50 % de velocidad duplica los tiempos y duraciones reales', () => {
    const ctx = setup()
    ctx.clock.setRate(0.5)
    ctx.clock.play()
    run(ctx, 9)
    expect(ctx.out).toHaveLength(8)
    expect(ctx.out[1]!.when).toBeCloseTo(101, 5)
    expect(ctx.out[1]!.duration).toBeCloseTo(1, 5)
  })

  it('reproduce solo la mano filtrada', () => {
    const ctx = setup((n) => n.hand === 'left')
    ctx.clock.play()
    run(ctx, 5)
    expect(ctx.out.map((s) => s.note.midi)).toEqual([48, 48, 48, 48])
  })

  it('tras un seek retoma desde la nueva posición', () => {
    const ctx = setup()
    ctx.clock.play()
    run(ctx, 1.2) // notas a 0, 0.5, 1.0
    expect(ctx.out).toHaveLength(3)
    ctx.clock.seek(0)
    ctx.scheduler.reset()
    run(ctx, 0.6)
    expect(ctx.out.map((s) => s.note.time)).toEqual([0, 0.5, 1, 0, 0.5])
  })

  it('no programa nada en pausa', () => {
    const ctx = setup()
    run(ctx, 2)
    expect(ctx.out).toHaveLength(0)
  })
})
