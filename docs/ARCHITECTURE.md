# Arquitectura de Piano Coach

## Principio rector

La lógica musical vive en `src/core/`: TypeScript puro, sin React ni Electron (ESLint lo impone con `no-restricted-imports`). Así todo lo importante se prueba con Vitest sin navegador. React solo pinta y despacha acciones; Zustand conecta el núcleo con la UI.

```
┌──────────────── Proceso main (Node) ────────────────┐      ┌────────── Renderer (Chromium, sandbox) ───────────┐
│ index.ts      ventana, permisos (solo MIDI), app:// │      │ stores/ (Zustand)  ← estado de UI                  │
│ appProtocol   sirve el renderer + CSP               │ IPC  │ features/ library · player                         │
│ ipc/          handlers validados con zod            │◄────►│ components/piano  canvas: piano roll + teclado     │
│ db/           SQLite (sql.js) + migraciones         │      │ lib/engine.ts  AudioEngine · InputBus · Keyboard   │
│ songService   valida/analiza MIDI, siembra demos    │      │            ▲                                       │
└─────────────────────────────────────────────────────┘      └────────────┼───────────────────────────────────────┘
          ▲ preload: contextBridge → window.pianoCoach        src/core (compartido, sin UI)
```

## Módulos de `src/core`

| Carpeta | Responsabilidad |
| --- | --- |
| `music/` | Números MIDI ↔ nombres (C4 / Do4), rango de 88 teclas, teclas negras. |
| `midi-import/` | `parseMidi` (vía @tonejs/midi) → `RawSong`; `importSong` = parse + `buildSong`. Errores legibles (`MidiParseError`). |
| `song/` | Modelo `Song` normalizado: `TempoMap` (ticks ↔ segundos con cambios de tempo), compases, *steps* (acordes), secciones, asignación de manos, dificultad estimada. |
| `playback/` | `PlaybackClock` (velocidad 25–100 %), `NoteScheduler` (programación con *lookahead*), `PlayerController` (orquesta todo). |
| `input/` | `InputBus` (punto único de eventos de nota) y `KeyboardInput` (teclado del Mac con mapeo configurable). Aquí se añadirán `WebMidiInput` y un detector por micrófono. |
| `audio/` | `AudioEngine`: piano muestreado (Tone.js Sampler + Salamander). Solo renderer. |
| `testing/` | Generador de MIDI reales y reloj falso para tests. |

## Flujo de una canción

1. **Importar** (main): diálogo nativo → lectura (máx. 5 MB) → `importSong` valida y calcula metadatos → se guarda el MIDI **original** en SQLite.
2. **Abrir** (renderer): se pide el registro por IPC y se reconstruye el `Song` con las preferencias guardadas (manos por pista, punto de corte). Guardar el original permite cambiar la normalización sin reimportar.
3. **Normalizar** (`buildSong`): descarta percusión y pistas vacías; mueve de octava notas fuera de rango; elimina duplicados; recorta notas del mismo tono que se solapan; impone duración mínima; agrupa notas con inicio a ≤ 30 ms en un *step* (acorde); construye compases respetando cambios de compás; secciones de 4 compases.
4. **Manos**: override manual → nombre de pista (right/left, RH/LH, treble/bass, derecha/izquierda…) → varias pistas: altura media → una sola pista: punto de corte (C4 por defecto). Las estimaciones se marcan y se avisan.

## Reproducción y tiempo

- La posición de la canción = `ancla + (AudioContext.currentTime − t0) × velocidad`. Cambiar la velocidad re-ancla el reloj y no altera la altura del sonido (cada nota se dispara por separado).
- `NoteScheduler` corre cada 25 ms (setInterval) y programa las notas de los próximos 100 ms con tiempos exactos de Web Audio: el audio no depende de que la UI llegue a 60 fps.
- El piano roll y el teclado se dibujan en **Canvas 2D** dentro de un único `requestAnimationFrame` que lee el reloj y las teclas pulsadas; React no se re-renderiza por frame.
- Tocar en vivo: `InputBus` → `AudioEngine.noteOn` directamente, fuera de React (`latencyHint: 'interactive'`, `lookAhead: 0`).

## Persistencia

SQLite mediante **sql.js** (SQLite compilado a WebAssembly) en el proceso main, archivo `piano-coach.sqlite` en la carpeta de datos de la app (`~/Library/Application Support/Piano Coach`).

- Se eligió frente a `better-sqlite3` porque no requiere recompilar un módulo nativo para cada versión de Electron y el mismo motor corre en los tests (Node 20).
- Cada escritura es una transacción; el archivo se guarda de forma atómica (temporal + `rename`) y los guardados se serializan.
- Migraciones versionadas en `src/main/db/migrations.ts` (tabla `schema_version`).
- Tablas actuales: `songs` (metadatos, MIDI original, manos/punto de corte), `settings` (preferencias en JSON validadas con zod, más banderas internas). Las de progreso e intentos llegarán con la Fase 3.

## Seguridad de Electron

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`.
- El renderer se sirve desde `app://bundle/` (protocolo privilegiado propio) con Content-Security-Policy estricta (`script-src 'self'`, sin `eval`).
- Preload mínimo: solo expone `window.pianoCoach.songs.*` y `settings.*`; nunca `ipcRenderer`.
- Main valida todos los argumentos IPC con zod y comprueba que el emisor sea nuestra propia página.
- Permisos: solo `midi` (sin SysEx); el resto se deniega. Navegación y ventanas nuevas bloqueadas; enlaces `https` se abren en el navegador del sistema.
- El acceso a archivos (diálogo + lectura) ocurre solo en main.

## Entrada futura por micrófono

`InputSource`/`NoteEvent` incluyen un campo `confidence`. Un detector de tono (`AudioPitchInput`) emitirá eventos con confianza < 1. Limitaciones que se asumirán explícitamente: la detección polifónica (acordes) es poco fiable, los armónicos del piano generan falsos positivos, hay latencia adicional (ventanas de análisis de 40–90 ms) y el ruido ambiente afecta. No es equivalente a MIDI; la evaluación será más tolerante y se marcará como experimental.

## Testing

- **Vitest** (`npm test`): núcleo musical, importación, tiempo, reproducción, entrada, persistencia (incluye cerrar/reabrir la base de datos), geometría del teclado, demos.
- **Playwright + Electron** (`npm run test:e2e`): arranca la app compilada con una carpeta de datos temporal (`PIANO_COACH_USER_DATA`) y verifica seguridad del renderer, biblioteca, importación (con el diálogo nativo sustituido), errores, búsqueda/borrado, reproducción y persistencia tras reiniciar.
