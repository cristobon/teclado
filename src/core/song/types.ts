export type Hand = 'right' | 'left'

/**
 * Cómo se decidió la asignación de una pista; "split-point" y "pitch" son estimaciones.
 * "instrument" = se descartó por no ser piano en un MIDI con varios instrumentos.
 */
export type HandSource = 'name' | 'pitch' | 'split-point' | 'manual' | 'instrument'

/** Asignación de una pista: a una mano, dividida por un punto de corte, o no usada. */
export type TrackHandAssignment = Hand | 'split' | 'ignore'

export interface TempoEvent {
  ticks: number
  bpm: number
  /** Segundos desde el inicio (calculado con el mapa de tempo). */
  time: number
}

export interface TimeSignatureEvent {
  ticks: number
  numerator: number
  denominator: number
}

export interface KeySignatureEvent {
  ticks: number
  key: string
  scale: 'major' | 'minor'
}

export interface SongNote {
  id: number
  midi: number
  startTick: number
  durationTicks: number
  /** Inicio en segundos a velocidad 100 %. */
  time: number
  /** Duración en segundos a velocidad 100 %. */
  duration: number
  /** 0..1 */
  velocity: number
  trackIndex: number
  hand: Hand
  measureIndex: number
  stepIndex: number
}

export interface SongTrack {
  index: number
  name: string
  channel: number
  instrument: string
  isPiano: boolean
  noteCount: number
  averagePitch: number
  minPitch: number
  maxPitch: number
  assignment: TrackHandAssignment
  handSource: HandSource
}

export interface Measure {
  index: number
  /** Número de compás visible para el usuario (1-based). */
  number: number
  startTick: number
  endTick: number
  startTime: number
  endTime: number
  numerator: number
  denominator: number
}

/** Un "paso" de la canción: nota o acorde que comienza (casi) a la vez. */
export interface Step {
  index: number
  time: number
  startTick: number
  noteIds: number[]
  midis: number[]
  measureIndex: number
  /** Manos que participan en el paso. */
  hands: Hand[]
}

export interface Section {
  index: number
  name: string
  startMeasure: number
  /** Inclusive. */
  endMeasure: number
  startTime: number
  endTime: number
}

export interface Song {
  title: string
  ppq: number
  durationTicks: number
  /** Segundos a velocidad 100 %, hasta el final del último compás con notas. */
  duration: number
  tempos: TempoEvent[]
  timeSignatures: TimeSignatureEvent[]
  keySignatures: KeySignatureEvent[]
  tracks: SongTrack[]
  notes: SongNote[]
  measures: Measure[]
  steps: Step[]
  sections: Section[]
  splitPoint: number
  /** Avisos de normalización mostrables al usuario. */
  warnings: string[]
}
