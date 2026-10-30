/// <reference lib="dom" />
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './launch'
import type {} from '../../src/preload/index.d'

let app: ElectronApplication
let page: Page
let userData: string

async function launch(): Promise<void> {
  app = await launchApp(userData)
  page = await app.firstWindow()
  page.on('pageerror', (err) => console.error('pageerror:', err.message))
}

test.beforeAll(async () => {
  userData = mkdtempSync(join(tmpdir(), 'piano-coach-e2e-'))
  await launch()
})

test.afterAll(async () => {
  await app?.close()
  rmSync(userData, { recursive: true, force: true })
})

test('la ventana es segura (sin Node en el renderer)', async () => {
  const exposed = await page.evaluate(() => ({
    require: typeof (window as unknown as { require?: unknown }).require,
    process: typeof (window as unknown as { process?: unknown }).process,
    api: Object.keys(window.pianoCoach ?? {}).sort()
  }))
  expect(exposed).toEqual({
    require: 'undefined',
    process: 'undefined',
    api: ['settings', 'songs']
  })
  expect(page.url()).toBe('app://bundle/index.html')
})

test('la biblioteca muestra las canciones demo al primer inicio', async () => {
  const list = page.getByTestId('song-list')
  await expect(list.getByText('Minueto en Sol (BWV Anh. 114)')).toBeVisible()
  await expect(list.getByText('Ejercicio: cinco dedos')).toBeVisible()
})

test('abre una canción, carga el piano y reproduce', async () => {
  await page.getByText('Minueto en Sol (BWV Anh. 114)').click()
  await expect(page.getByRole('heading', { name: 'Minueto en Sol (BWV Anh. 114)' })).toBeVisible()
  await expect(page.getByLabel('Teclado de piano')).toBeVisible()

  await page.getByRole('button', { name: /Reproducir/ }).click()
  await expect(page.getByRole('button', { name: /Pausar/ })).toBeVisible()
  await page.waitForTimeout(1500)
  const position = Number(await page.getByLabel('Posición en la canción').inputValue())
  expect(position).toBeGreaterThan(0.5)

  // Las muestras de piano se cargaron por app:// (fetch funciona).
  const sampleStatus = await page.evaluate(async () => {
    const res = await fetch('samples/salamander/C4.mp3')
    return res.status
  })
  expect(sampleStatus).toBe(200)

  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: /Reproducir/ })).toBeVisible()
})

test('la velocidad elegida se guarda y sobrevive a reiniciar la app', async () => {
  await page.getByRole('button', { name: '50%' }).click()
  await expect(page.getByText('♩ = 50')).toBeVisible()
  await page.waitForTimeout(500) // guardado diferido
  await app.close()
  await launch()
  await page.getByText('Minueto en Sol (BWV Anh. 114)').click()
  await expect(page.getByText('♩ = 50')).toBeVisible()
  await page.getByRole('button', { name: /Biblioteca/ }).click()
})
