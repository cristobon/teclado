import { PIANO_MAX_MIDI, PIANO_MIN_MIDI, isBlackKey } from '@core/music/notes'

export interface KeyRect {
  midi: number
  black: boolean
  x: number
  width: number
}

export interface KeyRange {
  low: number
  high: number
}

export const FULL_RANGE: KeyRange = { low: PIANO_MIN_MIDI, high: PIANO_MAX_MIDI }

/** Desplazamiento de cada tecla negra respecto a la junta entre blancas (fracción del ancho negro). */
const BLACK_OFFSET: Record<number, number> = { 1: -0.12, 3: 0.12, 6: -0.15, 8: 0, 10: 0.15 }
export const BLACK_WIDTH_RATIO = 0.62

/** Ajusta un rango para que empiece y termine en tecla blanca (si no, la negra quedaría cortada). */
export function normalizeRange(range: KeyRange): KeyRange {
  let low = Math.max(PIANO_MIN_MIDI, Math.min(range.low, range.high))
  let high = Math.min(PIANO_MAX_MIDI, Math.max(range.low, range.high))
  while (isBlackKey(low) && low > PIANO_MIN_MIDI) low--
  while (isBlackKey(high) && high < PIANO_MAX_MIDI) high++
  return { low, high }
}

/** Calcula la posición horizontal de cada tecla del rango en un ancho dado. */
export function computeKeyLayout(range: KeyRange, totalWidth: number): KeyRect[] {
  const { low, high } = normalizeRange(range)
  let whiteCount = 0
  for (let m = low; m <= high; m++) if (!isBlackKey(m)) whiteCount++
  const whiteW = totalWidth / whiteCount
  const blackW = whiteW * BLACK_WIDTH_RATIO
  const keys: KeyRect[] = []
  let whiteIndex = 0
  for (let m = low; m <= high; m++) {
    if (isBlackKey(m)) {
      const offset = BLACK_OFFSET[((m % 12) + 12) % 12] ?? 0
      keys.push({
        midi: m,
        black: true,
        x: whiteIndex * whiteW - blackW / 2 + offset * blackW,
        width: blackW
      })
    } else {
      keys.push({ midi: m, black: false, x: whiteIndex * whiteW, width: whiteW })
      whiteIndex++
    }
  }
  return keys
}

/** Tecla bajo un punto (las negras tienen prioridad: están encima). */
export function keyAt(
  keys: readonly KeyRect[],
  x: number,
  y: number,
  blackHeight: number
): number | null {
  if (y <= blackHeight) {
    const black = keys.find((k) => k.black && x >= k.x && x < k.x + k.width)
    if (black) return black.midi
  }
  return keys.find((k) => !k.black && x >= k.x && x < k.x + k.width)?.midi ?? null
}

/** Rango que cubre la canción con margen, en octavas completas (de Do a Do). */
export function rangeForNotes(midis: readonly number[], minWhiteKeys = 22): KeyRange {
  if (midis.length === 0) return { low: 48, high: 84 }
  let low = Math.floor((Math.min(...midis) - 2) / 12) * 12
  let high = Math.ceil((Math.max(...midis) + 2) / 12) * 12
  // Garantiza un mínimo de teclas visibles para que no se vean gigantes.
  while ((high - low) * (7 / 12) < minWhiteKeys) {
    low -= 6
    high += 6
  }
  return normalizeRange({ low, high })
}

export function zoomRange(range: KeyRange, octaves: number): KeyRange {
  const next = { low: range.low - octaves * 6, high: range.high + octaves * 6 }
  if (next.high - next.low < 24) return range // mínimo dos octavas
  return normalizeRange(next)
}

export function shiftRange(range: KeyRange, semitones: number): KeyRange {
  const width = range.high - range.low
  let low = range.low + semitones
  low = Math.max(PIANO_MIN_MIDI, Math.min(PIANO_MAX_MIDI - width, low))
  return normalizeRange({ low, high: low + width })
}
