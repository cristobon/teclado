import { z } from 'zod'
import { DEFAULT_KEYBOARD_BASE, DEFAULT_KEYBOARD_MAPPING } from '../core/input/keyboardMapping'

export const settingsSchema = z.object({
  noteNaming: z.enum(['english', 'solfege']).catch('english'),
  showNoteNames: z.boolean().catch(true),
  keyboardMapping: z
    .record(z.string(), z.number().int().min(-24).max(36))
    .catch(DEFAULT_KEYBOARD_MAPPING),
  keyboardBase: z.number().int().min(24).max(96).catch(DEFAULT_KEYBOARD_BASE),
  volume: z.number().min(0).max(1).catch(0.8),
  playbackRate: z.number().min(0.25).max(1).catch(1),
  /** Segundos de canción visibles en el piano roll. */
  lookaheadSeconds: z.number().min(1).max(10).catch(3),
  preferredMidiInputId: z.string().nullable().catch(null),
  lastSongId: z.string().nullable().catch(null)
})

export type AppSettings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: AppSettings = settingsSchema.parse({})

/** Mezcla valores guardados (posiblemente viejos o corruptos) con los valores por defecto. */
export function parseSettings(value: unknown): AppSettings {
  const obj = value && typeof value === 'object' ? value : {}
  return settingsSchema.parse({ ...DEFAULT_SETTINGS, ...obj })
}

export const settingsPatchSchema = settingsSchema.partial().strict()
