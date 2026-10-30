import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'node:path'
import { APP_ORIGIN, handleAppScheme, registerAppScheme } from './appProtocol'
import { AppDatabase } from './db/database'
import { SettingsRepository } from './db/settingsRepository'
import { SongRepository } from './db/songRepository'
import { registerIpc } from './ipc/registerIpc'
import { seedDemos } from './songService'
import fiveFingerPath from '../../resources/demo/ejercicio-cinco-dedos.mid?asset'
import minuetPath from '../../resources/demo/minueto-en-sol.mid?asset'

const DEMOS = [
  { path: fiveFingerPath, title: 'Ejercicio: cinco dedos', artist: 'Piano Coach' },
  {
    path: minuetPath,
    title: 'Minueto en Sol (BWV Anh. 114)',
    artist: 'C. Petzold · dominio público'
  }
]

// Permite aislar los datos (tests E2E) sin tocar la biblioteca real del usuario.
const userDataOverride = process.env['PIANO_COACH_USER_DATA']
if (userDataOverride) app.setPath('userData', userDataOverride)

const DEV_URL = process.env['ELECTRON_RENDERER_URL']
const isDev = !app.isPackaged && !!DEV_URL

function trustedOrigin(): string {
  return isDev && DEV_URL ? DEV_URL : `${APP_ORIGIN}/`
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b0d12',
    titleBarStyle: 'hiddenInset',
    title: 'Piano Coach',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    }
  })
  win.once('ready-to-show', () => win.show())

  // Sin navegación ni ventanas nuevas: los enlaces externos se abren en el navegador.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(trustedOrigin())) event.preventDefault()
  })

  if (isDev && DEV_URL) void win.loadURL(DEV_URL)
  else void win.loadURL(`${APP_ORIGIN}/index.html`)
  return win
}

/** Solo se concede acceso a MIDI (sin SysEx). Todo lo demás se deniega. */
function configurePermissions(): void {
  const allowed = new Set(['midi'])
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowed.has(permission))
  })
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission))
}

async function bootstrap(): Promise<void> {
  registerAppScheme()
  await app.whenReady()
  configurePermissions()
  handleAppScheme(join(__dirname, '../renderer'))

  const db = await AppDatabase.open(
    join(app.getPath('userData'), 'piano-coach.sqlite'),
    require.resolve('sql.js/dist/sql-wasm.wasm')
  )
  const songs = new SongRepository(db)
  const settings = new SettingsRepository(db)

  if (!settings.getFlag('demosSeeded')) {
    await seedDemos(songs, DEMOS)
    await settings.setFlag('demosSeeded', true)
  }

  registerIpc({ songs, settings, trustedOrigin })
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  app.on('before-quit', () => {
    void db.close()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

bootstrap().catch((err) => {
  console.error('Error al iniciar Piano Coach:', err)
  app.quit()
})
