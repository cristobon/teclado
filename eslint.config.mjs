import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['out/**', 'dist/**', 'release/**', 'node_modules/**', 'resources/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'scripts/**/*', '*.config.*'],
    languageOptions: { globals: globals.node }
  },
  {
    // core/ debe seguir siendo agnóstico de UI y de Electron
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'electron', 'zustand', '@renderer/*'] }
      ]
    }
  }
)
