import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-[#0b0d12] hover:brightness-110 font-semibold',
  ghost: 'text-muted hover:text-ink hover:bg-raised',
  subtle: 'bg-raised text-ink hover:bg-[#2a3040] border border-line',
  danger: 'text-bad hover:bg-bad/10'
}

export function Button({
  variant = 'subtle',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`no-drag inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

export function IconButton({
  label,
  className = '',
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      className={`no-drag inline-flex size-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
        active ? 'bg-raised text-ink' : 'text-muted hover:bg-raised hover:text-ink'
      } ${className}`}
      {...props}
    />
  )
}
