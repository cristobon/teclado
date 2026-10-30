import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IPC, type ImportResult } from '../../shared/ipc'
import { songIdSchema, songUpdateSchema } from '../../shared/ipcSchemas'
import { settingsPatchSchema } from '../../shared/settings'
import type { SettingsRepository } from '../db/settingsRepository'
import type { SongRepository } from '../db/songRepository'
import { importMidiFile } from '../songService'

/** Solo se aceptan llamadas desde nuestra propia ventana. */
function assertTrustedSender(event: IpcMainInvokeEvent, trustedUrl: () => string): void {
  const url = event.senderFrame?.url ?? ''
  if (!url.startsWith(trustedUrl())) throw new Error('Origen IPC no permitido.')
}

export function registerIpc(deps: {
  songs: SongRepository
  settings: SettingsRepository
  trustedOrigin: () => string
}): void {
  const { songs, settings } = deps
  const handle = <T>(channel: string, fn: (event: IpcMainInvokeEvent, ...args: unknown[]) => T) =>
    ipcMain.handle(channel, (event, ...args) => {
      assertTrustedSender(event, deps.trustedOrigin)
      return fn(event, ...args)
    })

  handle(IPC.songsList, () => songs.list())
  handle(IPC.songsGet, (_e, id) => songs.get(songIdSchema.parse(id)))
  handle(IPC.songsDelete, (_e, id) => songs.delete(songIdSchema.parse(id)))
  handle(IPC.songsUpdate, (_e, id, patch) =>
    songs.update(songIdSchema.parse(id), songUpdateSchema.parse(patch))
  )

  handle(IPC.songsImport, async (event): Promise<ImportResult> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: 'Importar canción MIDI',
      properties: ['openFile'],
      filters: [{ name: 'Archivos MIDI', extensions: ['mid', 'midi'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    const filePath = result.filePaths[0]
    if (result.canceled || !filePath) return { ok: false, canceled: true }
    try {
      return { ok: true, song: await importMidiFile(songs, filePath) }
    } catch (err) {
      return { ok: false, canceled: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  handle(IPC.settingsGet, () => settings.get())
  handle(IPC.settingsSet, (_e, patch) => settings.set(settingsPatchSchema.parse(patch)))
}
