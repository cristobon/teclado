import { net, protocol } from 'electron'
import { join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export const APP_SCHEME = 'app'
export const APP_ORIGIN = `${APP_SCHEME}://bundle`

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'"
].join('; ')

/** Debe llamarse antes de app.whenReady(). */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ])
}

/**
 * Sirve el renderer compilado desde app://bundle/ . Permite fetch() de las muestras
 * de piano (file:// no lo permite) y añade la Content-Security-Policy.
 */
export function handleAppScheme(rendererRoot: string): void {
  const root = normalize(rendererRoot)
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url)
    if (url.host !== 'bundle') return new Response('No encontrado', { status: 404 })
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
    const filePath = normalize(join(root, relative))
    if (!filePath.startsWith(root + sep)) return new Response('Prohibido', { status: 403 })
    const response = await net.fetch(pathToFileURL(filePath).toString())
    const headers = new Headers(response.headers)
    if (filePath.endsWith('.html')) headers.set('Content-Security-Policy', CSP)
    return new Response(response.body, { status: response.status, headers })
  })
}
