import { create } from 'zustand'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/settings'
import { keyboardInput } from '../lib/engine'

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  load(): Promise<void>
  update(patch: Partial<AppSettings>): void
}

function applySideEffects(s: AppSettings): void {
  keyboardInput.mapping = s.keyboardMapping
  keyboardInput.baseMidi = s.keyboardBase
}

let pending: Partial<AppSettings> = {}
let timer: ReturnType<typeof setTimeout> | null = null

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  async load() {
    const settings = await window.pianoCoach.settings.get()
    applySideEffects(settings)
    set({ settings, loaded: true })
  },

  /** Actualiza al instante en la UI y guarda en disco agrupando cambios rápidos (sliders). */
  update(patch) {
    const settings = { ...get().settings, ...patch }
    applySideEffects(settings)
    set({ settings })
    pending = { ...pending, ...patch }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const toSave = pending
      pending = {}
      void window.pianoCoach.settings.set(toSave)
    }, 300)
  }
}))

keyboardInput.onBaseChange = (base) => useSettings.getState().update({ keyboardBase: base })
