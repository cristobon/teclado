import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AppDatabase } from './database'
import { SettingsRepository } from './settingsRepository'
import { SongRepository, type NewSong } from './songRepository'

const wasmPath = createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')

const sample: NewSong = {
  title: 'Minueto',
  fileName: 'minueto.mid',
  midi: new Uint8Array([0x4d, 0x54, 0x68, 0x64, 1, 2, 3]),
  duration: 42.5,
  bpm: 100,
  noteCount: 120,
  trackCount: 2,
  difficulty: 2
}

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('SongRepository', () => {
  it('inserta, lista, obtiene y elimina canciones conservando el MIDI', async () => {
    const db = await AppDatabase.open(null, wasmPath)
    const repo = new SongRepository(db)
    const created = await repo.insert(sample)
    expect(created).toMatchObject({ title: 'Minueto', bpm: 100, isDemo: false, lastOpenedAt: null })
    const record = repo.get(created.id)!
    expect([...record.midi]).toEqual([...sample.midi])
    expect(record.trackOverrides).toEqual({})
    await repo.delete(created.id)
    expect(repo.list()).toEqual([])
    expect(repo.get(created.id)).toBeNull()
  })

  it('ordena por última apertura y guarda manos asignadas', async () => {
    let clock = Date.parse('2026-01-01T00:00:00Z')
    const repo = new SongRepository(
      await AppDatabase.open(null, wasmPath),
      () => new Date((clock += 1000))
    )
    const a = await repo.insert({ ...sample, title: 'A' })
    const b = await repo.insert({ ...sample, title: 'B' })
    await repo.update(a.id, { markOpened: true, trackOverrides: { '0': 'left' }, splitPoint: 55 })
    expect(repo.list().map((s) => s.title)).toEqual(['A', 'B'])
    expect(repo.get(a.id)).toMatchObject({ trackOverrides: { 0: 'left' }, splitPoint: 55 })
    await repo.update(b.id, { markOpened: true })
    expect(repo.list()[0]!.title).toBe('B')
  })

  it('falla al actualizar una canción inexistente', async () => {
    const repo = new SongRepository(await AppDatabase.open(null, wasmPath))
    await expect(repo.update('nope', { title: 'x' })).rejects.toThrow(/no existe/)
  })
})

describe('persistencia en disco', () => {
  it('los datos sobreviven a cerrar y reabrir la base de datos', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'piano-coach-'))
    dirs.push(dir)
    const file = join(dir, 'db.sqlite')
    const db1 = await AppDatabase.open(file, wasmPath)
    await new SongRepository(db1).insert(sample)
    await new SettingsRepository(db1).set({ volume: 0.3, noteNaming: 'solfege' })
    await db1.close()

    const db2 = await AppDatabase.open(file, wasmPath)
    expect(new SongRepository(db2).list()).toHaveLength(1)
    expect(new SettingsRepository(db2).get()).toMatchObject({ volume: 0.3, noteNaming: 'solfege' })
    await db2.close()
  })
})

describe('SettingsRepository', () => {
  it('devuelve valores por defecto y combina cambios parciales', async () => {
    const repo = new SettingsRepository(await AppDatabase.open(null, wasmPath))
    expect(repo.get().playbackRate).toBe(1)
    await repo.set({ playbackRate: 0.5 })
    const s = await repo.set({ showNoteNames: false })
    expect(s).toMatchObject({ playbackRate: 0.5, showNoteNames: false })
  })

  it('repara valores corruptos con los valores por defecto', async () => {
    const db = await AppDatabase.open(null, wasmPath)
    await db.write((run) =>
      run(
        'INSERT INTO settings (key, value) VALUES (\'app\', \'{"volume": 7, "noteNaming": "xx"}\')'
      )
    )
    const s = new SettingsRepository(db).get()
    expect(s.volume).toBe(0.8)
    expect(s.noteNaming).toBe('english')
  })

  it('guarda banderas internas', async () => {
    const repo = new SettingsRepository(await AppDatabase.open(null, wasmPath))
    expect(repo.getFlag('demo')).toBe(false)
    await repo.setFlag('demo', true)
    expect(repo.getFlag('demo')).toBe(true)
  })
})
