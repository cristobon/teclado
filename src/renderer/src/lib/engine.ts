import { AudioEngine } from '@core/audio/audioEngine'
import { InputBus } from '@core/input/inputBus'
import { KeyboardInput } from '@core/input/keyboardInput'

/**
 * Servicios de larga vida del renderer (no son estado de React).
 * El audio de las notas tocadas por el usuario se dispara aquí, fuera de React,
 * para minimizar la latencia.
 */
export const audio = new AudioEngine(new URL('samples/salamander/', document.baseURI).href)
export const inputBus = new InputBus()
export const keyboardInput = new KeyboardInput(inputBus)

inputBus.subscribe((e) => {
  if (e.type === 'on') audio.noteOn(e.midi, e.velocity)
  else audio.noteOff(e.midi)
})

/** El navegador exige un gesto del usuario antes de producir sonido. */
export async function ensureAudio(): Promise<void> {
  await audio.resume()
  await audio.load()
}
