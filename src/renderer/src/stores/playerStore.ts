import { create } from 'zustand'
import { importSong } from '@core/midi-import/importSong'
import { PlayerController } from '@core/playback/playerController'
import type { Hand, Song, TrackHandAssignment } from '@core/song/types'
import type { SongRecord } from '@shared/ipc'
import { rangeForNotes, type KeyRange } from '../components/piano/layout'
import { audio, ensureAudio } from '../lib/engine'
import { useSettings } from './settingsStore'

const TICK_MS = 25

interface PlayerStoreState {
  record: SongRecord | null
  song: Song | null
  controller: PlayerController | null
  loading: boolean
  error: string | null
  playing: boolean
  rate: number
  audibleHands: Hand[]
  visibleHands: Hand[]
  range: KeyRange

  open(id: string): Promise<void>
  close(): void
  toggle(): Promise<void>
  seek(time: number): void
  seekMeasure(delta: -1 | 1): void
  setRate(rate: number): void
  toggleAudibleHand(hand: Hand): void
  toggleVisibleHand(hand: Hand): void
  setRange(range: KeyRange): void
  setTrackAssignment(trackIndex: number, assignment: TrackHandAssignment): Promise<void>
  setSplitPoint(midi: number): Promise<void>
}

let tickTimer: ReturnType<typeof setInterval> | null = null
let unsubscribe: (() => void) | null = null

function toggleIn(list: Hand[], hand: Hand): Hand[] {
  return list.includes(hand) ? list.filter((h) => h !== hand) : [...list, hand]
}

function buildFromRecord(record: SongRecord): Song {
  return importSong(record.midi, {
    title: record.title,
    trackOverrides: record.trackOverrides,
    splitPoint: record.splitPoint ?? undefined
  })
}

export const usePlayer = create<PlayerStoreState>((set, get) => {
  /** Crea un controlador nuevo (al abrir o al reconstruir la canción) conservando posición y velocidad. */
  function attach(song: Song, keepTime = 0): void {
    get().controller?.dispose()
    unsubscribe?.()
    const controller = new PlayerController(song, audio)
    controller.setRate(get().rate)
    controller.setAudibleHands(get().audibleHands)
    controller.seek(keepTime)
    unsubscribe = controller.subscribe((s) => set({ playing: s.playing }))
    if (tickTimer) clearInterval(tickTimer)
    tickTimer = setInterval(() => controller.tick(), TICK_MS)
    set({ song, controller, playing: false })
  }

  return {
    record: null,
    song: null,
    controller: null,
    loading: false,
    error: null,
    playing: false,
    rate: 1,
    audibleHands: ['left', 'right'],
    visibleHands: ['left', 'right'],
    range: { low: 48, high: 84 },

    async open(id) {
      set({ loading: true, error: null })
      try {
        const record = await window.pianoCoach.songs.get(id)
        if (!record) throw new Error('La canción ya no existe en la biblioteca.')
        const song = buildFromRecord(record)
        set({
          record,
          rate: useSettings.getState().settings.playbackRate,
          range: rangeForNotes(song.notes.map((n) => n.midi)),
          loading: false
        })
        attach(song)
        void window.pianoCoach.songs.update(id, { markOpened: true })
        useSettings.getState().update({ lastSongId: id })
      } catch (err) {
        set({ loading: false, error: err instanceof Error ? err.message : String(err) })
      }
    },

    close() {
      get().controller?.dispose()
      unsubscribe?.()
      if (tickTimer) clearInterval(tickTimer)
      tickTimer = null
      set({ record: null, song: null, controller: null, playing: false, error: null })
    },

    async toggle() {
      const c = get().controller
      if (!c) return
      await ensureAudio()
      c.toggle()
    },

    seek(time) {
      get().controller?.seek(time)
    },

    seekMeasure(delta) {
      get().controller?.seekMeasure(delta)
    },

    setRate(rate) {
      get().controller?.setRate(rate)
      const actual = get().controller?.state.rate ?? rate
      set({ rate: actual })
      useSettings.getState().update({ playbackRate: actual })
    },

    toggleAudibleHand(hand) {
      const audibleHands = toggleIn(get().audibleHands, hand)
      get().controller?.setAudibleHands(audibleHands)
      set({ audibleHands })
    },

    toggleVisibleHand(hand) {
      set({ visibleHands: toggleIn(get().visibleHands, hand) })
    },

    setRange(range) {
      set({ range })
    },

    async setTrackAssignment(trackIndex, assignment) {
      const record = get().record
      if (!record) return
      const trackOverrides = { ...record.trackOverrides, [trackIndex]: assignment }
      await window.pianoCoach.songs.update(record.id, {
        trackOverrides: Object.fromEntries(
          Object.entries(trackOverrides).map(([k, v]) => [String(k), v])
        )
      })
      const next = { ...record, trackOverrides }
      set({ record: next })
      attach(buildFromRecord(next), get().controller?.time ?? 0)
    },

    async setSplitPoint(midi) {
      const record = get().record
      if (!record) return
      await window.pianoCoach.songs.update(record.id, { splitPoint: midi })
      const next = { ...record, splitPoint: midi }
      set({ record: next })
      attach(buildFromRecord(next), get().controller?.time ?? 0)
    }
  }
})
