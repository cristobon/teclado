import { Midi } from '@tonejs/midi'
import type { RawSong } from '../song/rawSong'

export class MidiParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'MidiParseError'
  }
}

/** Cabecera "MThd" obligatoria en todo archivo MIDI estándar. */
export function looksLikeMidi(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 14 &&
    bytes[0] === 0x4d &&
    bytes[1] === 0x54 &&
    bytes[2] === 0x68 &&
    bytes[3] === 0x64
  )
}

/** Lee un archivo .mid/.midi y lo convierte a RawSong. */
export function parseMidi(bytes: Uint8Array): RawSong {
  if (!looksLikeMidi(bytes)) {
    throw new MidiParseError('El archivo no es un MIDI estándar (falta la cabecera MThd).')
  }
  let midi: Midi
  try {
    midi = new Midi(bytes)
  } catch (cause) {
    throw new MidiParseError('No se pudo leer el archivo MIDI: está dañado o no es compatible.', {
      cause
    })
  }
  return {
    name: midi.header.name ?? '',
    ppq: midi.header.ppq,
    tempos: midi.header.tempos.map((t) => ({ ticks: t.ticks, bpm: t.bpm })),
    timeSignatures: midi.header.timeSignatures.map((t) => ({
      ticks: t.ticks,
      numerator: t.timeSignature[0] ?? 4,
      denominator: t.timeSignature[1] ?? 4
    })),
    keySignatures: midi.header.keySignatures.map((k) => ({
      ticks: k.ticks,
      key: k.key,
      scale: k.scale === 'minor' ? 'minor' : 'major'
    })),
    tracks: midi.tracks.map((track) => ({
      name: track.name,
      channel: track.channel,
      instrument: track.instrument.name,
      family: track.instrument.family,
      isPercussion: track.instrument.percussion,
      notes: track.notes.map((n) => ({
        midi: n.midi,
        ticks: n.ticks,
        durationTicks: n.durationTicks,
        velocity: n.velocity
      }))
    }))
  }
}
