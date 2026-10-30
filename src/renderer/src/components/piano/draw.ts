import { noteName, type NoteNaming } from '@core/music/notes'
import type { Hand, Song, SongNote } from '@core/song/types'
import type { KeyRect } from './layout'
import { HAND_COLOR, HAND_COLOR_DARK, KEYS, ROLL } from './theme'

export interface RollView {
  song: Song
  keys: KeyRect[]
  time: number
  /** Segundos de canción visibles sobre el teclado. */
  lookahead: number
  visibleHands: Hand[]
  showNames: boolean
  naming: NoteNaming
}

export interface KeyHighlight {
  /** Notas de la canción sonando ahora (por mano). */
  sounding: Map<number, Hand>
  /** Notas que el usuario mantiene pulsadas. */
  pressed: Set<number>
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, rr)
}

/** Duración máxima de nota (para saber cuánto mirar hacia atrás). */
const maxDurationCache = new WeakMap<Song, number>()
function maxDuration(song: Song): number {
  let v = maxDurationCache.get(song)
  if (v === undefined) {
    v = song.notes.reduce((m, n) => Math.max(m, n.duration), 0)
    maxDurationCache.set(song, v)
  }
  return v
}

function firstNoteFrom(notes: readonly SongNote[], t: number): number {
  let lo = 0
  let hi = notes.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (notes[mid]!.time < t) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Dibuja las notas cayendo. Devuelve las notas que suenan en este instante
 * (para iluminar el teclado).
 */
export function drawRoll(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  v: RollView
): Map<number, Hand> {
  const sounding = new Map<number, Hand>()
  const pxPerSec = h / v.lookahead
  const keyByMidi = new Map(v.keys.map((k) => [k.midi, k]))

  ctx.fillStyle = ROLL.bg
  ctx.fillRect(0, 0, w, h)

  // Carriles: resaltar teclas negras y marcar octavas (línea antes de cada Do).
  for (const k of v.keys) {
    if (k.black) {
      ctx.fillStyle = ROLL.laneDark
      ctx.fillRect(k.x, 0, k.width, h)
    } else if (k.midi % 12 === 0 || k.midi % 12 === 5) {
      ctx.fillStyle = k.midi % 12 === 0 ? ROLL.octaveLine : ROLL.laneLine
      ctx.fillRect(Math.round(k.x), 0, 1, h)
    }
  }

  // Líneas de compás.
  ctx.font = '11px -apple-system, sans-serif'
  ctx.textBaseline = 'bottom'
  for (const m of v.song.measures) {
    if (m.startTime < v.time - 0.01 || m.startTime > v.time + v.lookahead) continue
    const y = h - (m.startTime - v.time) * pxPerSec
    ctx.fillStyle = ROLL.measureLine
    ctx.fillRect(0, Math.round(y), w, 1)
    ctx.fillStyle = ROLL.measureText
    ctx.fillText(String(m.number), 6, y - 3)
  }

  // Notas.
  const notes = v.song.notes
  const start = firstNoteFrom(notes, v.time - maxDuration(v.song))
  const visible = new Set(v.visibleHands)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  for (let i = start; i < notes.length; i++) {
    const n = notes[i]!
    if (n.time > v.time + v.lookahead) break
    if (n.time + n.duration < v.time) continue
    if (!visible.has(n.hand)) continue
    const key = keyByMidi.get(n.midi)
    if (!key) continue
    const active = n.time <= v.time && v.time < n.time + n.duration
    if (active) sounding.set(n.midi, n.hand)

    const yBottom = h - (n.time - v.time) * pxPerSec
    const height = Math.max(4, n.duration * pxPerSec - 2)
    const inset = key.black ? 1 : 2
    const x = key.x + inset
    const width = key.width - inset * 2
    const y = yBottom - height

    ctx.save()
    if (active) {
      ctx.shadowColor = HAND_COLOR[n.hand]
      ctx.shadowBlur = 16
    }
    roundRect(ctx, x, y, width, height, 5)
    const grad = ctx.createLinearGradient(x, 0, x + width, 0)
    grad.addColorStop(0, HAND_COLOR[n.hand])
    grad.addColorStop(1, HAND_COLOR_DARK[n.hand])
    ctx.fillStyle = grad
    ctx.globalAlpha = active ? 1 : 0.88
    ctx.fill()
    ctx.restore()

    if (v.showNames && width >= 14 && height >= 16) {
      ctx.fillStyle = 'rgba(10,12,18,0.85)'
      ctx.font = `600 ${Math.min(11, width * 0.45)}px -apple-system, sans-serif`
      ctx.fillText(noteName(n.midi, v.naming).replace(/-?\d+$/, ''), x + width / 2, yBottom - 9)
    }
  }
  ctx.textAlign = 'start'

  // Línea de "ahora" donde las notas tocan el teclado.
  ctx.fillStyle = ROLL.nowLine
  ctx.fillRect(0, h - 2, w, 2)
  return sounding
}

export function drawKeyboard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  keys: KeyRect[],
  hl: KeyHighlight,
  showNames: boolean,
  naming: NoteNaming
): void {
  ctx.clearRect(0, 0, w, h)
  const blackH = h * 0.62

  const colorFor = (midi: number): string | null => {
    const hand = hl.sounding.get(midi)
    if (hand) return HAND_COLOR[hand]
    if (hl.pressed.has(midi)) return KEYS.pressed
    return null
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  for (const k of keys) {
    if (k.black) continue
    const color = colorFor(k.midi)
    const down = color !== null
    const top = down ? 2 : 0
    roundRect(ctx, k.x + 0.5, top - 6, k.width - 1, h - top + 6 - 1, 4)
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, color ?? KEYS.white)
    g.addColorStop(1, color ?? KEYS.whiteShade)
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1
    ctx.stroke()

    const isC = k.midi % 12 === 0
    if (isC || (showNames && k.width >= 16)) {
      ctx.fillStyle = down ? 'rgba(10,12,18,0.85)' : KEYS.label
      ctx.font = `${isC ? 600 : 500} ${Math.max(8, Math.min(11, k.width * 0.42))}px -apple-system, sans-serif`
      const label = isC ? noteName(k.midi, naming) : noteName(k.midi, naming).replace(/-?\d+$/, '')
      ctx.fillText(label, k.x + k.width / 2, h - 8)
    }
  }

  for (const k of keys) {
    if (!k.black) continue
    const color = colorFor(k.midi)
    const down = color !== null
    roundRect(ctx, k.x, -4, k.width, blackH + (down ? 2 : 0) + 4, 3)
    const g = ctx.createLinearGradient(0, 0, 0, blackH)
    g.addColorStop(0, color ?? KEYS.blackTop)
    g.addColorStop(1, color ?? KEYS.black)
    ctx.fillStyle = g
    ctx.fill()
    if (!down) {
      // Brillo inferior que da volumen a la tecla.
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(k.x + 2, blackH - 8, k.width - 4, 4)
    }
  }
  ctx.textAlign = 'start'
}
