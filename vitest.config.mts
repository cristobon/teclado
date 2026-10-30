import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(import.meta.dirname, 'src/core'),
      '@shared': resolve(import.meta.dirname, 'src/shared'),
      '@renderer': resolve(import.meta.dirname, 'src/renderer/src')
    }
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node'
  }
})
