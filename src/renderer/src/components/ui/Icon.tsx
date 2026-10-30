const PATHS = {
  play: 'M8 5.5v13a1 1 0 0 0 1.52.85l10.4-6.5a1 1 0 0 0 0-1.7L9.52 4.65A1 1 0 0 0 8 5.5Z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  restart: 'M6 5v14M19 6v12l-9-6 9-6Z',
  prev: 'M18 6l-8 6 8 6V6ZM7 6v12',
  next: 'M6 6l8 6-8 6V6ZM17 6v12',
  back: 'M15 18l-6-6 6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  left: 'M14 7l-5 5 5 5',
  right: 'M10 7l5 5-5 5',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  import: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  volume: 'M4 9v6h4l5 4V5L8 9H4ZM17 8a5 5 0 0 1 0 8',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  piano: 'M3 5h18v14H3zM8 5v8M13 5v8M18 5v8M6 13h4M11 13h4M16 13h4',
  tracks: 'M4 6h16M4 12h16M4 18h10'
} as const

export type IconName = keyof typeof PATHS

const FILLED = new Set<IconName>(['play', 'pause'])

export function Icon({
  name,
  size = 18,
  className
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const filled = FILLED.has(name)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
