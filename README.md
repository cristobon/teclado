# Piano Coach

Profesor interactivo de piano para escritorio (macOS, preparado para Windows). Importa un archivo MIDI, mira cómo caen las notas hacia un teclado de 88 teclas, escúchalas con sonido de piano real y tócalas con tu teclado MIDI o con el teclado del Mac.

> **Estado: Fase 1 (MVP) completada.** La conexión con pianos MIDI físicos (Fase 2) y el modo profesor que espera tu nota (Fase 3) son los siguientes pasos. Consulta [docs/ROADMAP.md](docs/ROADMAP.md).

## Requisitos

- macOS 12 o posterior (Apple Silicon o Intel).
- Node.js 20.19+ (recomendado 22 LTS) y npm.

## Desarrollo

```bash
npm install
npm run dev          # abre la app con recarga en caliente
```

Scripts:

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | App en modo desarrollo |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Compila y ejecuta los tests E2E sobre la app Electron real (Playwright) |
| `npm run typecheck` | TypeScript estricto (main/preload/core y renderer) |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck + compilación a `out/` |
| `npm run build:mac` | Genera el instalador `.dmg` en `release/` |
| `npm run demo:generate` | Regenera los MIDI de demostración en `resources/demo/` |
| `npm run samples:fetch` | Vuelve a descargar las muestras de piano (ya vienen incluidas) |

> Si ejecutas comandos desde un proceso que exporta `ELECTRON_RUN_AS_NODE=1` (algunas extensiones de VS Code lo hacen), Electron arrancaría como Node. Los scripts `dev`/`preview` y los tests E2E ya lo neutralizan.

## Generar el instalador de macOS

```bash
npm run build:mac
```

El `.dmg` queda en `release/` (arm64 y x64). La app **no está firmada ni notarizada** (requiere una cuenta Apple Developer). La primera vez, macOS la bloqueará: haz clic derecho sobre *Piano Coach* → **Abrir** → **Abrir**, o en *Ajustes del Sistema → Privacidad y seguridad* pulsa **Abrir igualmente**.

Para Windows: `npm run build:win` (genera un instalador NSIS; aún no probado).

## Cómo se usa

1. **Biblioteca.** Al primer inicio hay dos canciones demo: *Ejercicio: cinco dedos* y el *Minueto en Sol (BWV Anh. 114)*. Pulsa **Importar MIDI** para añadir tus archivos `.mid`/`.midi`. Busca por título o artista, y elimina con el icono de papelera.
2. **Reproductor.** Espacio = reproducir/pausar · ← → = compás anterior/siguiente · Inicio = volver al principio. La velocidad va de 25 % a 100 % sin cambiar el tono. *Caída* controla cuántos segundos de música ves por adelantado.
3. **Manos.** Azul = mano derecha (MD), ámbar = mano izquierda (MI). Para cada mano puedes ocultar sus notas (👁) o silenciarla (🔊), p. ej. escuchar solo la izquierda.
4. **Pistas.** Si el MIDI no indica qué pista es cada mano, la app lo estima (y lo avisa). En **Pistas** puedes asignar cada pista a una mano o dividirla por altura, con un punto de corte ajustable. Se guarda por canción.
5. **Tocar.** Con el ratón sobre el teclado o con el teclado del Mac:

```
 W E   T Y U   O P        ← teclas negras
A S D F G H J K L Ñ ´     ← teclas blancas (A = Do/C4, K = Do/C5)
Z = bajar octava   X = subir octava
```

El mapeo usa la posición física de las teclas, así que funciona igual con teclado español o inglés.

### Can't Help Falling in Love

La app **no incluye** la partitura ni el MIDI de esta canción (está protegida por derechos de autor). Consigue un MIDI de forma legal (por ejemplo, comprándolo en una tienda de partituras o creando tu propia transcripción) e impórtalo con **Importar MIDI**. Funciona igual con cualquier MIDI de piano.

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — arquitectura, módulos y decisiones.
- [docs/ROADMAP.md](docs/ROADMAP.md) — fases, estado y limitaciones conocidas.

## Créditos y licencias

- Muestras de piano: *Salamander Grand Piano V3* de Alexander Holm, licencia CC-BY 3.0 (ver `src/renderer/public/samples/salamander/LICENSE.txt`).
- *Minueto en Sol* BWV Anh. 114 (atribuido a Christian Petzold, c. 1725): dominio público. La mano izquierda es un arreglo simplificado propio de Piano Coach.
