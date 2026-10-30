import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { MIGRATIONS } from './migrations'

/**
 * SQLite (sql.js / WASM) con persistencia a archivo.
 * Se eligió WASM en lugar de un módulo nativo para evitar recompilar contra el ABI de
 * Electron y poder usar el mismo motor en tests con Node.
 * Cada escritura se guarda de forma atómica (archivo temporal + rename).
 */
export class AppDatabase {
  private saving: Promise<void> = Promise.resolve()

  private constructor(
    private readonly db: Database,
    private readonly filePath: string | null
  ) {}

  /**
   * @param filePath archivo de la base de datos; null = solo en memoria (tests).
   * @param wasmPath ruta a sql-wasm.wasm (require.resolve('sql.js/dist/sql-wasm.wasm')).
   */
  static async open(filePath: string | null, wasmPath: string): Promise<AppDatabase> {
    const SQL = await initSqlJs({ wasmBinary: new Uint8Array(readFileSync(wasmPath)).buffer })
    const data = filePath && existsSync(filePath) ? await readFile(filePath) : undefined
    const db = new SQL.Database(data)
    db.run('PRAGMA foreign_keys = ON')
    const instance = new AppDatabase(db, filePath)
    await instance.migrate()
    return instance
  }

  private async migrate(): Promise<void> {
    this.db.run('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)')
    const current =
      this.get<{ version: number }>('SELECT MAX(version) AS version FROM schema_version')
        ?.version ?? 0
    const pending = MIGRATIONS.filter((m) => m.version > current)
    if (pending.length === 0) return
    for (const m of pending) {
      this.db.run('BEGIN')
      try {
        this.db.exec(m.sql)
        this.db.run('INSERT INTO schema_version (version) VALUES (?)', [m.version])
        this.db.run('COMMIT')
      } catch (err) {
        this.db.run('ROLLBACK')
        throw new Error(`Falló la migración ${m.version}: ${String(err)}`, { cause: err })
      }
    }
    await this.persist()
  }

  all<T>(sql: string, params: SqlValue[] = []): T[] {
    const stmt = this.db.prepare(sql)
    try {
      stmt.bind(params)
      const rows: T[] = []
      while (stmt.step()) rows.push(stmt.getAsObject() as T)
      return rows
    } finally {
      stmt.free()
    }
  }

  get<T>(sql: string, params: SqlValue[] = []): T | undefined {
    return this.all<T>(sql, params)[0]
  }

  /** Ejecuta escrituras en una transacción y persiste en disco. */
  async write(fn: (run: (sql: string, params?: SqlValue[]) => void) => void): Promise<void> {
    this.db.run('BEGIN')
    try {
      fn((sql, params = []) => this.db.run(sql, params))
      this.db.run('COMMIT')
    } catch (err) {
      this.db.run('ROLLBACK')
      throw err
    }
    await this.persist()
  }

  private persist(): Promise<void> {
    if (!this.filePath) return Promise.resolve()
    const path = this.filePath
    // Serializa los guardados para que nunca se pisen.
    this.saving = this.saving.then(async () => {
      const tmp = `${path}.tmp`
      await writeFile(tmp, this.db.export())
      await rename(tmp, path)
    })
    return this.saving
  }

  async close(): Promise<void> {
    await this.saving
    this.db.close()
  }
}
