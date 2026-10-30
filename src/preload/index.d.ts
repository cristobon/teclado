import type { PianoCoachApi } from '../shared/ipc'

declare global {
  interface Window {
    pianoCoach: PianoCoachApi
  }
}

export {}
