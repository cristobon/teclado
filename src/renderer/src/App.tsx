import { useEffect } from 'react'
import { LibraryView } from './features/library/LibraryView'
import { PlayerView } from './features/player/PlayerView'
import { ensureAudio, keyboardInput } from './lib/engine'
import { usePlayer } from './stores/playerStore'
import { useSettings } from './stores/settingsStore'

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && !['range', 'checkbox'].includes(target.type))
  )
}

export function App() {
  const inPlayer = usePlayer((s) => s.record !== null || s.loading)
  const loadSettings = useSettings((s) => s.load)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  // Teclado del computador como piano, en cualquier pantalla.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTextField(e.target)) return
      void ensureAudio()
      if (keyboardInput.keyDown(e)) e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      if (keyboardInput.keyUp(e)) e.preventDefault()
    }
    const blur = () => keyboardInput.releaseAll(performance.now())
    const unlockAudio = () => void ensureAudio()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    window.addEventListener('pointerdown', unlockAudio)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      window.removeEventListener('pointerdown', unlockAudio)
    }
  }, [])

  return <div className="h-full">{inPlayer ? <PlayerView /> : <LibraryView />}</div>
}
