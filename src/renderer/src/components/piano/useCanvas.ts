import { useEffect, useRef, useState } from 'react'

export interface CanvasSize {
  width: number
  height: number
  dpr: number
}

/** Canvas nítido en pantallas Retina que se adapta al tamaño de su contenedor. */
export function useCanvas(): [React.RefObject<HTMLCanvasElement | null>, CanvasSize] {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0, dpr: 1 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const dpr = window.devicePixelRatio || 1
      const { width, height } = entry.contentRect
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      setSize({ width, height, dpr })
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}

export function context2d(
  canvas: HTMLCanvasElement | null,
  size: CanvasSize
): CanvasRenderingContext2D | null {
  const ctx = canvas?.getContext('2d') ?? null
  ctx?.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
  return ctx
}
