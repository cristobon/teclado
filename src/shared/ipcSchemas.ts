import { z } from 'zod'

/** Validación de todo lo que llega por IPC al proceso main. */
export const songIdSchema = z.string().uuid()

export const songUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    artist: z.string().trim().max(200).nullable().optional(),
    trackOverrides: z
      .record(z.string().regex(/^\d+$/), z.enum(['left', 'right', 'split', 'ignore']))
      .optional(),
    splitPoint: z.number().int().min(21).max(108).nullable().optional(),
    markOpened: z.boolean().optional()
  })
  .strict()

export type SongUpdate = z.infer<typeof songUpdateSchema>
