# Hoja de ruta

## Fase 1 — MVP ✅

- App de escritorio Electron segura (sandbox, CSP, preload mínimo, IPC validado).
- Importación de `.mid`/`.midi` con normalización, compases, acordes, secciones y manos (automáticas o manuales).
- Biblioteca local (SQLite) con búsqueda, recientes primero, duración, tempo, dificultad estimada y borrado.
- Dos canciones demo (ejercicio propio y Minueto en Sol, dominio público).
- Piano roll animado (canvas) con color por mano, duración visible, líneas de compás y nombres de notas.
- Teclado de 88 teclas con nombres y octavas, zoom y desplazamiento, tocable con ratón (glissando) y teclado del Mac (mapeo por posición física, cambio de octava).
- Sonido de piano muestreado offline; reproducción con pausa, retroceso por compás, barra de posición, velocidad 25–100 %, escuchar/ocultar cada mano.
- Preferencias persistentes (velocidad, caída, nombres Do/C, octava del teclado…).

### Limitaciones conocidas de la Fase 1

- El mapeo del teclado del Mac es configurable en el código y en la base de datos, pero aún no hay pantalla para editarlo.
- No se interpreta el pedal de sustain del MIDI al reproducir.
- La app usa el icono genérico de Electron y el instalador no está firmado.
- Sin piano MIDI físico disponible, la Fase 2 se validará con tests y el *IAC Driver* de macOS; la prueba con hardware real queda pendiente.
- `npm run build:win` no se ha probado.

## Fase 2 — Conexión MIDI

`WebMidiInput` (conexión/desconexión en caliente, selección y dispositivo preferido), indicador de estado, velocity, acordes simultáneos, comparación en vivo con lo esperado (acierto/error en el teclado), guía `docs/MIDI_SETUP.md`.

## Fase 3 — Profesor interactivo

Modo espera (no avanza hasta tocar la nota/acorde correcto), opciones de tolerancia, pistas, escuchar la nota esperada, repetir nota/compás/sección, A-B, práctica por manos y combinada, metrónomo, evaluación (precisión, ritmo, reacción, acordes), resumen por sección, historial y progreso por canción, página dedicada a *Can't Help Falling in Love* para cargar tu MIDI.

## Fase 4 — Experiencia premium

Partitura sincronizada (VexFlow), dificultad adaptativa y recomendaciones, biblioteca por dificultad y reanudar sesión, grabación de sesiones, reconocimiento por micrófono experimental, pulido del instalador.
