import { Midi } from '@tonejs/midi'

export interface FixtureNote {
  midi: number
  /** En negras desde el inicio. */
  beat: number
  /** En negras. */
  beats: number
  velocity?: number
}

export interface FixtureTrack {
  name?: string
  channel?: number
  notes: FixtureNote[]
}

/** Genera bytes MIDI reales para tests (y la demo). */
export function makeMidiBytes(options: {
  ppq?: number
  name?: string
  tempos?: Array<{ beat: number; bpm: number }>
  timeSignature?: [number, number]
  tracks: FixtureTrack[]
}): Uint8Array {
  const midi = new Midi()
  const ppq = midi.header.ppq
  if (options.name) midi.header.name = options.name
  for (const t of options.tempos ?? [{ beat: 0, bpm: 120 }]) {
    midi.header.tempos.push({ ticks: Math.round(t.beat * ppq), bpm: t.bpm })
  }
  if (options.timeSignature) {
    midi.header.timeSignatures.push({ ticks: 0, timeSignature: options.timeSignature })
  }
  midi.header.update()
  for (const t of options.tracks) {
    const track = midi.addTrack()
    if (t.name) track.name = t.name
    if (t.channel !== undefined) track.channel = t.channel
    for (const n of t.notes) {
      track.addNote({
        midi: n.midi,
        ticks: Math.round(n.beat * ppq),
        durationTicks: Math.round(n.beats * ppq),
        velocity: n.velocity ?? 0.8
      })
    }
  }
  return midi.toArray()
}
