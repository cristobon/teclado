import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeMidiBytes } from '../src/core/testing/midiFixtures'
import { DEMO_SONGS } from './demoSongs'

const outDir = join(__dirname, '..', 'resources', 'demo')
mkdirSync(outDir, { recursive: true })
for (const song of DEMO_SONGS) {
  const bytes = makeMidiBytes({
    name: song.title,
    tempos: [{ beat: 0, bpm: song.bpm }],
    timeSignature: song.timeSignature,
    tracks: song.tracks
  })
  writeFileSync(join(outDir, song.fileName), bytes)
  console.log(`✓ ${song.fileName} (${bytes.length} bytes)`)
}
