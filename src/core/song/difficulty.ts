import type { Song } from './types'

/**
 * Estimación determinística 1–5 a partir de densidad de pasos, tamaño de acordes,
 * extensión del teclado y si se usan ambas manos. Orientativa, no musicológica.
 */
export function estimateDifficulty(song: Song): number {
  if (song.steps.length === 0 || song.duration <= 0) return 1
  const stepsPerSecond = song.steps.length / song.duration
  const avgChord = song.notes.length / song.steps.length
  const range =
    Math.max(...song.notes.map((n) => n.midi)) - Math.min(...song.notes.map((n) => n.midi))
  const bothHands = song.steps.some((s) => s.hands.length === 2)
  let score = 0
  score += Math.min(2, stepsPerSecond / 2.5) // hasta 2 puntos por velocidad
  score += Math.min(1, (avgChord - 1) / 2) // hasta 1 punto por acordes
  score += Math.min(1, range / 48) // hasta 1 punto por extensión
  score += bothHands ? 0.75 : 0
  return Math.max(1, Math.min(5, Math.round(1 + score)))
}
