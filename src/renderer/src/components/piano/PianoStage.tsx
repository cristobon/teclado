import { useEffect, useMemo, useRef } from 'react'
import type { NoteNaming } from '@core/music/notes'
import type { Hand, Song } from '@core/song/types'
import { inputBus } from '../../lib/engine'
import { drawKeyboard, drawRoll } from './draw'
import { computeKeyLayout, keyAt, type KeyRange } from './layout'
import { context2d, useCanvas } from './useCanvas'

interface Props {
  song: Song
  getTime: () => number
  range: KeyRange
  visibleHands: Hand[]
  lookahead: number
  showNames: boolean
  naming: NoteNaming
  /** Se llama en cada frame (para actualizar el tiempo mostrado sin re-render de React). */
  onFrame?: (time: number) => void
}

const KEYBOARD_HEIGHT = 150
const BLACK_RATIO = 0.62

/**
 * Piano roll + teclado. Se dibuja imperativamente en requestAnimationFrame:
 * React solo monta los canvas; cada frame lee el reloj y las teclas pulsadas.
 */
export function PianoStage(props: Props) {
  const [rollRef, rollSize] = useCanvas()
  const [kbRef, kbSize] = useCanvas()
  const keys = useMemo(
    () => computeKeyLayout(props.range, kbSize.width),
    [props.range, kbSize.width]
  )
  const propsRef = useRef(props)
  propsRef.current = props

  useEffect(() => {
    let raf = 0
    const frame = () => {
      const p = propsRef.current
      const time = p.getTime()
      const rollCtx = context2d(rollRef.current, rollSize)
      const kbCtx = context2d(kbRef.current, kbSize)
      if (rollCtx && kbCtx && rollSize.width > 0) {
        const sounding = drawRoll(rollCtx, rollSize.width, rollSize.height, {
          song: p.song,
          keys,
          time,
          lookahead: p.lookahead,
          visibleHands: p.visibleHands,
          showNames: p.showNames,
          naming: p.naming
        })
        drawKeyboard(
          kbCtx,
          kbSize.width,
          kbSize.height,
          keys,
          { sounding, pressed: new Set(inputBus.activeNotes()) },
          p.showNames,
          p.naming
        )
      }
      p.onFrame?.(time)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [keys, rollRef, kbRef, rollSize, kbSize])

  // Tocar con el ratón (con glissando al arrastrar).
  const mouseNote = useRef<number | null>(null)
  const pointerToNote = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const midi = keyAt(keys, e.clientX - rect.left, y, rect.height * BLACK_RATIO)
    const velocity = Math.min(1, 0.45 + 0.5 * (y / rect.height))
    return { midi, velocity }
  }
  const release = (timestamp: number) => {
    if (mouseNote.current === null) return
    inputBus.emit({
      type: 'off',
      midi: mouseNote.current,
      velocity: 0,
      timestamp,
      source: 'mouse',
      confidence: 1
    })
    mouseNote.current = null
  }
  const press = (midi: number | null, velocity: number, timestamp: number) => {
    if (midi === mouseNote.current) return
    release(timestamp)
    if (midi === null) return
    mouseNote.current = midi
    inputBus.emit({ type: 'on', midi, velocity, timestamp, source: 'mouse', confidence: 1 })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <canvas
        ref={rollRef}
        className="min-h-0 w-full flex-1"
        aria-label="Notas que caen hacia el teclado"
      />
      <canvas
        ref={kbRef}
        className="w-full shrink-0 cursor-pointer touch-none"
        style={{ height: KEYBOARD_HEIGHT }}
        aria-label="Teclado de piano"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const { midi, velocity } = pointerToNote(e)
          press(midi, velocity, e.timeStamp)
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1 || mouseNote.current === null) return
          const { midi, velocity } = pointerToNote(e)
          press(midi, velocity, e.timeStamp)
        }}
        onPointerUp={(e) => release(e.timeStamp)}
        onPointerCancel={(e) => release(e.timeStamp)}
      />
    </div>
  )
}
