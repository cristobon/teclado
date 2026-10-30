import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const alias = {
  '@core': resolve(__dirname, 'src/core'),
  '@shared': resolve(__dirname, 'src/shared')
}

export default defineConfig({
  main: {
    resolve: { alias }
  },
  preload: {
    resolve: { alias },
    // Preload con sandbox: todo debe ir empaquetado (solo `electron` queda externo).
    build: { externalizeDeps: false }
  },
  renderer: {
    resolve: {
      alias: { ...alias, '@renderer': resolve(__dirname, 'src/renderer/src') }
    },
    plugins: [react(), tailwindcss()]
  }
})
