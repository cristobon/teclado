import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type PianoCoachApi } from '../shared/ipc'

// Superficie mínima: solo funciones concretas, nunca ipcRenderer directamente.
const api: PianoCoachApi = {
  songs: {
    list: () => ipcRenderer.invoke(IPC.songsList),
    get: (id) => ipcRenderer.invoke(IPC.songsGet, id),
    importFromDialog: () => ipcRenderer.invoke(IPC.songsImport),
    delete: (id) => ipcRenderer.invoke(IPC.songsDelete, id),
    update: (id, patch) => ipcRenderer.invoke(IPC.songsUpdate, id, patch)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    set: (patch) => ipcRenderer.invoke(IPC.settingsSet, patch)
  }
}

contextBridge.exposeInMainWorld('pianoCoach', api)
