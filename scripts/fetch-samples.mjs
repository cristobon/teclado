// Descarga un subconjunto de muestras del Salamander Grand Piano (Alexander Holm, CC-BY 3.0)
// alojadas por el proyecto Tone.js, para empaquetarlas con la app y funcionar offline.
import { mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const BASE = 'https://tonejs.github.io/audio/salamander/'
const OUT = join(import.meta.dirname, '..', 'src', 'renderer', 'public', 'samples', 'salamander')

export const SAMPLE_NAMES = []
for (let octave = 0; octave <= 7; octave++) {
  for (const n of ['C', 'Ds', 'Fs', 'A']) {
    if (octave === 0 && n !== 'A') continue
    SAMPLE_NAMES.push(`${n}${octave}`)
  }
}
SAMPLE_NAMES.push('C8')

await mkdir(OUT, { recursive: true })
for (const name of SAMPLE_NAMES) {
  const file = join(OUT, `${name}.mp3`)
  const exists = await access(file).then(
    () => true,
    () => false
  )
  if (exists) continue
  const res = await fetch(`${BASE}${name}.mp3`)
  if (!res.ok) throw new Error(`No se pudo descargar ${name}: ${res.status}`)
  await writeFile(file, Buffer.from(await res.arrayBuffer()))
  console.log('✓', name)
}
await writeFile(
  join(OUT, 'LICENSE.txt'),
  'Salamander Grand Piano V3 por Alexander Holm.\nLicencia Creative Commons Attribution 3.0 (CC-BY 3.0).\nhttps://archive.org/details/SalamanderGrandPianoV3\nMuestras convertidas a MP3 por el proyecto Tone.js.\n'
)
console.log(`${SAMPLE_NAMES.length} muestras en ${OUT}`)
