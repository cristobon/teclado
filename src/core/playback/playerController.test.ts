import { describe, expect, it } from 'vitest'
import { buildSong } from '../song/buildSong'
import { FakeTime } from '../testing/fakeTime'
import { PlayerController, type AudioOutput } from './playerController'

class FakeAudio extends FakeTime implements AudioOutput {
  played: Array<{ midi: number; when: number; duration: number }> = []
  stops = 0
  playNote(midi: number, duration: number, when: number) {
    this.played.push({ midi, when, duration })
  }
  stopAll() {
    this.stops++
  }
}

// 2 compases de 4/4 a 120 BPM (4 s); MD en negras, MI en blancas.
const song = buildSong({
  name: 't',
  ppq: 480,
  tempos: [{ ticks: 0, bpm: 120 }],
  timeSignatures: [],
  keySignatures: [],
  tracks: [
    {
      name: 'RH',
      channel: 0,
      instrument: '',
      family: 'piano',
      isPercussion: false,
      notes: Array.from({ length: 8 }, (_, i) => ({
        midi: 72,
        ticks: i * 480,
        durationTicks: 480,
        velocity: 0.8
      }))
    },
    {
      name: 'LH',
      channel: 1,
      instrument: '',
      family: 'piano',
      isPercussion: false,
      notes: Array.from({ length: 4 }, (_, i) => ({
        midi: 48,
        ticks: i * 960,
        durationTicks: 960,
        velocity: 0.8
      }))
    }
  ]
})

function run(audio: FakeAudio, player: PlayerController, seconds: number) {
  for (let i = 0; i < seconds / 0.025; i++) {
    player.tick()
    audio.advance(0.025)
  }
}

describe('PlayerController', () => {
  it('reproduce toda la canción y se detiene al final', () => {
    const audio = new FakeAudio()
    const player = new PlayerController(song, audio)
    player.play()
    run(audio, player, 5)
    expect(audio.played).toHaveLength(12)
    expect(player.state.playing).toBe(false)
    expect(player.time).toBeCloseTo(4)
  })

  it('reproduce solo la mano izquierda si se elige', () => {
    const audio = new FakeAudio()
    const player = new PlayerController(song, audio)
    player.setAudibleHands(['left'])
    player.play()
    run(audio, player, 5)
    expect(audio.played.every((p) => p.midi === 48)).toBe(true)
    expect(audio.played).toHaveLength(4)
  })

  it('al 25 % tarda 4 veces más', () => {
    const audio = new FakeAudio()
    const player = new PlayerController(song, audio)
    player.setRate(0.25)
    player.play()
    run(audio, player, 4)
    expect(player.time).toBeCloseTo(1, 1)
    expect(player.state.playing).toBe(true)
  })

  it('pausa silencia el audio y reanudar desde el final reinicia', () => {
    const audio = new FakeAudio()
    const player = new PlayerController(song, audio)
    player.play()
    run(audio, player, 1)
    player.pause()
    expect(audio.stops).toBe(1)
    player.seek(10)
    expect(player.time).toBe(4)
    player.play()
    expect(player.time).toBe(0)
  })

  it('navega por compases', () => {
    const audio = new FakeAudio()
    const player = new PlayerController(song, audio)
    player.seek(2.7)
    player.seekMeasure(-1)
    expect(player.time).toBe(2)
    player.seekMeasure(-1)
    expect(player.time).toBe(0)
    player.seekMeasure(1)
    expect(player.time).toBe(2)
  })

  it('notifica cambios de estado', () => {
    const audio = new FakeAudio()
    const player = new PlayerController(song, audio)
    const states: boolean[] = []
    player.subscribe((s) => states.push(s.playing))
    player.toggle()
    player.toggle()
    expect(states).toEqual([true, false])
  })
})
