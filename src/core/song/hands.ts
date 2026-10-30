import type { Hand, HandSource, TrackHandAssignment } from './types'

const RIGHT_NAME = /\b(right|r\.?h\.?|treble|upper|derecha|melod[yía]a?)\b/i
const LEFT_NAME = /\b(left|l\.?h\.?|bass|lower|izquierda|acomp\w*|accomp\w*)\b/i

/** Punto de corte por defecto: Do central (C4). Notas >= C4 → mano derecha. */
export const DEFAULT_SPLIT_POINT = 60

export interface TrackSummary {
  index: number
  name: string
  averagePitch: number
}

export interface TrackHandDecision {
  assignment: TrackHandAssignment
  source: HandSource
}

export function handFromTrackName(name: string): Hand | null {
  const right = RIGHT_NAME.test(name)
  const left = LEFT_NAME.test(name)
  if (right === left) return null
  return right ? 'right' : 'left'
}

/**
 * Decide la mano de cada pista:
 * 1. Override manual del usuario.
 * 2. Nombre de la pista (right/left, RH/LH, treble/bass, derecha/izquierda…).
 * 3. Varias pistas: agrupación por tono medio (agudas → derecha).
 * 4. Una sola pista: división por punto de corte (estimación).
 */
export function decideTrackHands(
  tracks: readonly TrackSummary[],
  overrides: Readonly<Record<number, TrackHandAssignment>> = {}
): Map<number, TrackHandDecision> {
  const result = new Map<number, TrackHandDecision>()
  const pending: TrackSummary[] = []

  for (const t of tracks) {
    const manual = overrides[t.index]
    if (manual) {
      result.set(t.index, { assignment: manual, source: 'manual' })
      continue
    }
    const byName = handFromTrackName(t.name)
    if (byName) result.set(t.index, { assignment: byName, source: 'name' })
    else pending.push(t)
  }

  if (pending.length === 0) return result

  if (tracks.length === 1) {
    result.set(pending[0]!.index, { assignment: 'split', source: 'split-point' })
    return result
  }

  // Umbral = punto medio entre la pista más aguda y la más grave (de todas, para
  // que una pista sin nombre se compare también con las ya identificadas).
  const pitches = tracks.map((t) => t.averagePitch)
  const threshold = (Math.max(...pitches) + Math.min(...pitches)) / 2
  for (const t of pending) {
    const assignment: Hand = t.averagePitch >= threshold ? 'right' : 'left'
    result.set(t.index, { assignment, source: 'pitch' })
  }
  return result
}

export function handForNote(
  midi: number,
  assignment: Exclude<TrackHandAssignment, 'ignore'>,
  splitPoint: number
): Hand {
  if (assignment !== 'split') return assignment
  return midi >= splitPoint ? 'right' : 'left'
}

/**
 * Pistas que se usan por defecto. En un MIDI de banda (piano + bajo, guitarras, voces…)
 * solo se usan las de piano; si no hay piano, o todo es piano, se usan todas.
 */
export function defaultIgnoredTracks(
  tracks: ReadonlyArray<{ index: number; family: string }>
): Set<number> {
  const piano = tracks.filter((t) => t.family === 'piano')
  if (piano.length === 0 || piano.length === tracks.length) return new Set()
  return new Set(tracks.filter((t) => t.family !== 'piano').map((t) => t.index))
}
