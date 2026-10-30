import { PIANO_MAX_MIDI, PIANO_MIN_MIDI } from '../music/notes'
import { DEFAULT_SPLIT_POINT, decideTrackHands, defaultIgnoredTracks, handForNote } from './hands'
import type { RawNote, RawSong } from './rawSong'
import { TempoMap } from './tempoMap'
import type {
  HandSource,
  Measure,
  Section,
  Song,
  SongNote,
  SongTrack,
  Step,
  TimeSignatureEvent,
  TrackHandAssignment
} from './types'

export interface BuildSongOptions {
  /** Ventana para considerar notas simultáneas (acorde), en segundos. */
  chordToleranceSec?: number
  /** Compases por sección por defecto. */
  measuresPerSection?: number
  splitPoint?: number
  trackOverrides?: Record<number, TrackHandAssignment>
  title?: string
}

export const DEFAULT_CHORD_TOLERANCE_SEC = 0.03
export const DEFAULT_MEASURES_PER_SECTION = 4

/** Construye un Song normalizado a partir de un RawSong. Función pura. */
export function buildSong(raw: RawSong, options: BuildSongOptions = {}): Song {
  const chordTolerance = options.chordToleranceSec ?? DEFAULT_CHORD_TOLERANCE_SEC
  const measuresPerSection = Math.max(1, options.measuresPerSection ?? DEFAULT_MEASURES_PER_SECTION)
  const splitPoint = options.splitPoint ?? DEFAULT_SPLIT_POINT
  const warnings: string[] = []
  const tempoMap = new TempoMap(raw.ppq, raw.tempos)

  // 1. Pistas tocables: sin percusión ni vacías.
  const playable = raw.tracks
    .map((track, originalIndex) => ({ track, originalIndex }))
    .filter(({ track }) => !track.isPercussion && track.notes.length > 0)
  const droppedPercussion = raw.tracks.filter((t) => t.isPercussion && t.notes.length > 0).length
  if (droppedPercussion > 0)
    warnings.push(`Se ignoraron ${droppedPercussion} pista(s) de percusión.`)
  if (playable.length === 0)
    throw new Error('El archivo MIDI no contiene notas de piano reproducibles.')

  // 2. Normalización de notas por pista.
  let transposed = 0
  const cleanTracks = playable.map(({ track }) => {
    const { notes, transposedCount } = normalizeNotes(track.notes, raw.ppq)
    transposed += transposedCount
    return { ...track, notes }
  })
  if (transposed > 0) {
    warnings.push(`${transposed} nota(s) fuera del rango del piano se movieron de octava.`)
  }

  // 3. Pistas en uso: override manual, o solo piano si es un MIDI de banda.
  const overrides = options.trackOverrides ?? {}
  const autoIgnored = defaultIgnoredTracks(
    cleanTracks.map((t, index) => ({ index, family: t.family }))
  )
  const isIgnored = (index: number) =>
    overrides[index] === 'ignore' || (overrides[index] === undefined && autoIgnored.has(index))
  const used = cleanTracks.map((_, index) => index).filter((index) => !isIgnored(index))
  if (used.length === 0) throw new Error('Selecciona al menos una pista para practicar.')
  const hiddenByInstrument = [...autoIgnored].filter((i) => overrides[i] === undefined).length
  if (hiddenByInstrument > 0) {
    warnings.push(
      `Este MIDI incluye otros instrumentos además del piano: se usan solo las pistas de piano (${hiddenByInstrument} pista(s) desactivada(s); puedes activarlas en Pistas).`
    )
  }

  // 4. Manos (solo entre las pistas en uso).
  const summaries = cleanTracks.map((t, index) => ({
    index,
    name: t.name,
    averagePitch: average(t.notes.map((n) => n.midi))
  }))
  const handOverrides: Record<number, TrackHandAssignment> = {}
  for (const i of used) if (overrides[i] !== undefined) handOverrides[i] = overrides[i]!
  const decisions = decideTrackHands(
    summaries.filter((t) => used.includes(t.index)),
    handOverrides
  )
  if ([...decisions.values()].some((d) => d.source === 'split-point')) {
    warnings.push('Las manos se estimaron con un punto de corte; puedes reasignarlas.')
  }

  const tracks: SongTrack[] = cleanTracks.map((t, index) => {
    const midis = t.notes.map((n) => n.midi)
    const decision: { assignment: TrackHandAssignment; source: HandSource } = decisions.get(
      index
    ) ?? {
      assignment: 'ignore',
      source: overrides[index] === 'ignore' ? 'manual' : 'instrument'
    }
    return {
      index,
      name: t.name || `Pista ${index + 1}`,
      channel: t.channel,
      instrument: t.instrument,
      isPiano: t.family === 'piano',
      noteCount: t.notes.length,
      averagePitch: summaries[index]!.averagePitch,
      minPitch: Math.min(...midis),
      maxPitch: Math.max(...midis),
      assignment: decision.assignment,
      handSource: decision.source
    }
  })

  // 5. Notas globales (de las pistas en uso) ordenadas por tiempo y tono.
  const flat = used.flatMap((trackIndex) =>
    cleanTracks[trackIndex]!.notes.map((n) => ({ ...n, trackIndex }))
  )
  flat.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi || a.trackIndex - b.trackIndex)

  const lastNoteEnd = Math.max(...flat.map((n) => n.ticks + n.durationTicks))
  const timeSignatures = normalizeTimeSignatures(raw.timeSignatures)
  const measures = buildMeasures(timeSignatures, raw.ppq, lastNoteEnd, tempoMap)
  const durationTicks = measures[measures.length - 1]!.endTick

  const notes: SongNote[] = flat.map((n, id) => {
    const time = tempoMap.ticksToSeconds(n.ticks)
    const end = tempoMap.ticksToSeconds(n.ticks + n.durationTicks)
    return {
      id,
      midi: n.midi,
      startTick: n.ticks,
      durationTicks: n.durationTicks,
      time,
      duration: end - time,
      velocity: n.velocity,
      trackIndex: n.trackIndex,
      hand: handForNote(
        n.midi,
        tracks[n.trackIndex]!.assignment as Exclude<TrackHandAssignment, 'ignore'>,
        splitPoint
      ),
      measureIndex: measureIndexAtTick(measures, n.ticks),
      stepIndex: -1
    }
  })

  const steps = buildSteps(notes, chordTolerance)
  const sections = buildSections(measures, measuresPerSection)

  return {
    title: options.title ?? (raw.name.trim() || 'Sin título'),
    ppq: raw.ppq,
    durationTicks,
    duration: tempoMap.ticksToSeconds(durationTicks),
    tempos: [...tempoMap.events],
    timeSignatures,
    keySignatures: [...raw.keySignatures].sort((a, b) => a.ticks - b.ticks),
    tracks,
    notes,
    measures,
    steps,
    sections,
    splitPoint,
    warnings
  }
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length
}

/**
 * - Mueve de octava notas fuera de A0–C8.
 * - Elimina duplicados (mismo tono y tick; se queda la de mayor velocity).
 * - Recorta notas del mismo tono que se solapan.
 * - Garantiza duración mínima (1/32 de negra).
 */
export function normalizeNotes(
  input: readonly RawNote[],
  ppq: number
): { notes: RawNote[]; transposedCount: number } {
  const minDuration = Math.max(1, Math.round(ppq / 32))
  let transposedCount = 0
  const notes = input
    .filter((n) => Number.isFinite(n.ticks) && n.ticks >= 0 && Number.isFinite(n.midi))
    .map((n) => {
      let midi = Math.round(n.midi)
      if (midi < PIANO_MIN_MIDI || midi > PIANO_MAX_MIDI) {
        transposedCount++
        while (midi < PIANO_MIN_MIDI) midi += 12
        while (midi > PIANO_MAX_MIDI) midi -= 12
      }
      return {
        midi,
        ticks: Math.round(n.ticks),
        durationTicks: Math.max(minDuration, Math.round(n.durationTicks)),
        velocity: clamp(n.velocity, 0.05, 1)
      }
    })
    .sort((a, b) => a.midi - b.midi || a.ticks - b.ticks || b.velocity - a.velocity)

  const out: RawNote[] = []
  for (const n of notes) {
    const prev = out[out.length - 1]
    if (prev && prev.midi === n.midi) {
      if (prev.ticks === n.ticks) continue // duplicado: ya está la de mayor velocity
      if (prev.ticks + prev.durationTicks > n.ticks) prev.durationTicks = n.ticks - prev.ticks
    }
    out.push({ ...n })
  }
  out.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)
  return { notes: out, transposedCount }
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return max
  return Math.min(max, Math.max(min, v))
}

function normalizeTimeSignatures(input: RawSong['timeSignatures']): TimeSignatureEvent[] {
  const valid = input
    .filter((t) => t.numerator > 0 && t.denominator > 0 && t.ticks >= 0)
    .sort((a, b) => a.ticks - b.ticks)
  const out: TimeSignatureEvent[] = []
  for (const t of valid) {
    const last = out[out.length - 1]
    if (last && last.ticks === t.ticks) {
      last.numerator = t.numerator
      last.denominator = t.denominator
    } else out.push({ ...t })
  }
  if (out.length === 0 || out[0]!.ticks > 0) out.unshift({ ticks: 0, numerator: 4, denominator: 4 })
  return out
}

export function buildMeasures(
  timeSignatures: readonly TimeSignatureEvent[],
  ppq: number,
  endTick: number,
  tempoMap: TempoMap
): Measure[] {
  const measures: Measure[] = []
  let tick = 0
  let tsIndex = 0
  do {
    while (tsIndex + 1 < timeSignatures.length && timeSignatures[tsIndex + 1]!.ticks <= tick)
      tsIndex++
    const ts = timeSignatures[tsIndex]!
    let length = Math.round((ppq * 4 * ts.numerator) / ts.denominator)
    // Si un cambio de compás cae a mitad de compás, el compás se corta ahí.
    const next = timeSignatures[tsIndex + 1]
    if (next && next.ticks > tick && next.ticks < tick + length) length = next.ticks - tick
    measures.push({
      index: measures.length,
      number: measures.length + 1,
      startTick: tick,
      endTick: tick + length,
      startTime: tempoMap.ticksToSeconds(tick),
      endTime: tempoMap.ticksToSeconds(tick + length),
      numerator: ts.numerator,
      denominator: ts.denominator
    })
    tick += length
  } while (tick < endTick)
  return measures
}

export function measureIndexAtTick(measures: readonly Measure[], tick: number): number {
  let lo = 0
  let hi = measures.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (measures[mid]!.startTick <= tick) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** Agrupa notas cuyo inicio cae dentro de la tolerancia del primer elemento del paso. Muta stepIndex. */
export function buildSteps(notes: SongNote[], toleranceSec: number): Step[] {
  const steps: Step[] = []
  for (const note of notes) {
    const current = steps[steps.length - 1]
    if (current && note.time - current.time <= toleranceSec + 1e-9) {
      current.noteIds.push(note.id)
      current.midis.push(note.midi)
      if (!current.hands.includes(note.hand)) current.hands.push(note.hand)
      note.stepIndex = current.index
    } else {
      steps.push({
        index: steps.length,
        time: note.time,
        startTick: note.startTick,
        noteIds: [note.id],
        midis: [note.midi],
        measureIndex: note.measureIndex,
        hands: [note.hand]
      })
      note.stepIndex = steps.length - 1
    }
  }
  for (const s of steps) s.midis.sort((a, b) => a - b)
  return steps
}

export function buildSections(measures: readonly Measure[], measuresPerSection: number): Section[] {
  const sections: Section[] = []
  for (let start = 0; start < measures.length; start += measuresPerSection) {
    const end = Math.min(measures.length - 1, start + measuresPerSection - 1)
    sections.push({
      index: sections.length,
      name: `Sección ${sections.length + 1} (c. ${start + 1}–${end + 1})`,
      startMeasure: start,
      endMeasure: end,
      startTime: measures[start]!.startTime,
      endTime: measures[end]!.endTime
    })
  }
  return sections
}
