import { _electron as electron, type ElectronApplication } from '@playwright/test'
import { join } from 'node:path'

/** Arranca la app compilada (out/) con una carpeta de datos aislada. */
export function launchApp(userData: string): Promise<ElectronApplication> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v
  // Algunos IDE (VS Code) exportan ELECTRON_RUN_AS_NODE, que haría arrancar Electron como Node.
  delete env['ELECTRON_RUN_AS_NODE']
  delete env['ELECTRON_RENDERER_URL']
  env['PIANO_COACH_USER_DATA'] = userData
  return electron.launch({ args: [join(__dirname, '../../out/main/index.js')], env })
}
