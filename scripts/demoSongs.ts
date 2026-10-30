import { parseNoteName } from '../src/core/music/notes'
import type { FixtureNote, FixtureTrack } from '../src/core/testing/midiFixtures'

/**
 * Canciones de demostración incluidas con la app.
 * - Minueto en Sol (BWV Anh. 114, atribuido a Christian Petzold, c. 1725): dominio público.
 *   Melodía de la sección A; mano izquierda = arreglo simplificado propio de Piano Coach.
 * - Ejercicio de cinco dedos: composición propia.
 */
export interface DemoSong {
  fileName: string
  title: string
  artist: string
  bpm: number
  timeSignature: [number, number]
  tracks: FixtureTrack[]
}

/** "D5:1 G4:.5" → notas consecutivas (duración en negras). "C4+E4:2" = acorde. "r:1" = silencio. */
export function seq(text: string, startBeat = 0): FixtureNote[] {
  const notes: FixtureNote[] = []
  let beat = startBeat
  for (const token of text.trim().split(/\s+/)) {
    const [pitches, len] = token.split(':')
    const beats = Number(len)
    if (!pitches || !Number.isFinite(beats)) throw new Error(`Token inválido: ${token}`)
    if (pitches !== 'r') {
      for (const p of pitches.split('+')) {
        const midi = parseNoteName(p)
        if (midi === null) throw new Error(`Nota inválida: ${p}`)
        notes.push({ midi, beat, beats, velocity: 0.7 })
      }
    }
    beat += beats
  }
  return notes
}

const MINUET_RH_PHRASE = `
  D5:1 G4:.5 A4:.5 B4:.5 C5:.5
  D5:1 G4:1 G4:1
  E5:1 C5:.5 D5:.5 E5:.5 F#5:.5
  G5:1 G4:1 G4:1
  C5:1 D5:.5 C5:.5 B4:.5 A4:.5
  B4:1 C5:.5 B4:.5 A4:.5 G4:.5
`

export const MINUET: DemoSong = {
  fileName: 'minueto-en-sol.mid',
  title: 'Minueto en Sol (BWV Anh. 114)',
  artist: 'C. Petzold · dominio público',
  bpm: 100,
  timeSignature: [3, 4],
  tracks: [
    {
      name: 'Right Hand',
      channel: 0,
      notes: seq(`
        ${MINUET_RH_PHRASE}
        F#4:1 G4:.5 A4:.5 B4:.5 G4:.5
        A4:3
        ${MINUET_RH_PHRASE}
        A4:1 B4:.5 A4:.5 G4:.5 F#4:.5
        G4:3
      `)
    },
    {
      name: 'Left Hand',
      channel: 1,
      notes: seq(`
        G3+B3+D4:2 A3:1
        B3:3
        C4:3
        B3:3
        A3:3
        G3:3
        D4:1 B3:1 G3:1
        D4:1 D3:1 F#3:1
        G3+B3+D4:2 A3:1
        B3:3
        C4:3
        B3:3
        A3:3
        G3:3
        D3:3
        G2+G3:3
      `)
    }
  ]
}

export const FIVE_FINGER: DemoSong = {
  fileName: 'ejercicio-cinco-dedos.mid',
  title: 'Ejercicio: cinco dedos',
  artist: 'Piano Coach',
  bpm: 80,
  timeSignature: [4, 4],
  tracks: [
    {
      name: 'Right Hand',
      channel: 0,
      notes: seq(`
        C4:1 D4:1 E4:1 F4:1  G4:1 F4:1 E4:1 D4:1
        r:4 r:4
        C4:1 E4:1 G4:2  E4+G4:2 C4:2
        C4+E4+G4:4
      `)
    },
    {
      name: 'Left Hand',
      channel: 1,
      notes: seq(`
        r:4 r:4
        C3:1 D3:1 E3:1 F3:1  G3:1 F3:1 E3:1 D3:1
        C3:4 G2:4
        C3:4
      `)
    }
  ]
}

export const DEMO_SONGS = [FIVE_FINGER, MINUET]
