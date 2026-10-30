import { DEFAULT_SETTINGS, parseSettings, type AppSettings } from '../../shared/settings'
import type { AppDatabase } from './database'

const KEY = 'app'

export class SettingsRepository {
  constructor(private readonly db: AppDatabase) {}

  get(): AppSettings {
    const row = this.db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [KEY])
    if (!row) return DEFAULT_SETTINGS
    try {
      return parseSettings(JSON.parse(row.value))
    } catch {
      return DEFAULT_SETTINGS
    }
  }

  async set(patch: Partial<AppSettings>): Promise<AppSettings> {
    const next = parseSettings({ ...this.get(), ...patch })
    await this.db.write((run) =>
      run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [KEY, JSON.stringify(next)]
      )
    )
    return next
  }

  /** Banderas internas (p. ej. si ya se instaló la demo). */
  getFlag(name: string): boolean {
    return (
      this.db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [`flag:${name}`])
        ?.value === 'true'
    )
  }

  async setFlag(name: string, value: boolean): Promise<void> {
    await this.db.write((run) =>
      run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [`flag:${name}`, String(value)]
      )
    )
  }
}
