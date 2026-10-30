import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './launch'
import { makeMidiBytes } from '../../src/core/testing/midiFixtures'

let app: ElectronApplication
let page: Page
let dir: string

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'piano-coach-import-'))
  app = await launchApp(join(dir, 'data'))
  page = await app.firstWindow()
})

test.afterAll(async () => {
  await app?.close()
  rmSync(dir, { recursive: true, force: true })
})

/** Sustituye el diálogo nativo de abrir archivo por una ruta fija. */
async function stubOpenDialog(filePath: string): Promise<void> {
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [path]
    })) as typeof dialog.showOpenDialog
  }, filePath)
}

test('importa un MIDI de una sola pista, estima las manos y lo guarda en la biblioteca', async () => {
  const file = join(dir, 'Mi_Cancion.mid')
  writeFileSync(
    file,
    makeMidiBytes({
      tracks: [
        {
          name: 'Piano',
          notes: [
            { midi: 48, beat: 0, beats: 2 },
            { midi: 64, beat: 0, beats: 1 },
            { midi: 67, beat: 1, beats: 1 }
          ]
        }
      ]
    })
  )
  await stubOpenDialog(file)
  await page.getByRole('button', { name: 'Importar MIDI' }).click()
  await expect(page.getByRole('heading', { name: 'Mi Cancion' })).toBeVisible()
  await expect(page.getByText(/punto de corte/)).toBeVisible()

  await page.getByRole('button', { name: 'Pistas' }).click()
  await page.getByLabel('Mano para Piano').selectOption('right')
  await expect(page.getByText(/elegida por ti/)).toBeVisible()

  await page.getByRole('button', { name: /Biblioteca/ }).click()
  await expect(page.getByTestId('song-list').getByText('Mi Cancion')).toBeVisible()
})

test('muestra un error claro si el archivo no es un MIDI válido', async () => {
  const file = join(dir, 'falso.mid')
  writeFileSync(file, 'esto no es un midi')
  await stubOpenDialog(file)
  await page.getByRole('button', { name: 'Importar MIDI' }).click()
  await expect(page.getByRole('alert')).toContainText('no es un MIDI estándar')
})

test('busca y elimina canciones', async () => {
  await page.getByPlaceholder('Buscar canción').fill('minueto')
  const list = page.getByTestId('song-list')
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await page.getByPlaceholder('Buscar canción').fill('')
  await list.getByRole('listitem').filter({ hasText: 'Mi Cancion' }).hover()
  await page.getByRole('button', { name: 'Eliminar Mi Cancion' }).click()
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await expect(list.getByText('Mi Cancion')).toHaveCount(0)
})
