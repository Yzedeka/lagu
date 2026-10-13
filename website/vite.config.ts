import { createReadStream, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serve the packaged installers from the app's build/ folder at /downloads/*.
 *
 * In development and preview this streams the real files locally; in production
 * the same path is served by a bucket (e.g. Cloudflare R2), because Pages caps
 * static assets at 25 MiB.
 */
function downloadsPlugin(): Plugin {
  const base = resolve(import.meta.dirname, '../build')
  const serve = (req: { url?: string }, res: import('node:http').ServerResponse): void => {
    const fail = (code: number, message: string): void => {
      res.statusCode = code
      res.end(message)
    }
    const file = decodeURIComponent((req.url ?? '').split('?')[0].replace(/^\//, ''))
    if (!file || file.includes('..')) return fail(400, 'Bad request')
    const full = resolve(base, file)
    if (!full.startsWith(base) || !existsSync(full)) return fail(404, 'Not found')
    const stat = statSync(full)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Length', String(stat.size))
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`)
    createReadStream(full).pipe(res)
  }
  return {
    name: 'lagu-downloads',
    configureServer(server) {
      server.middlewares.use('/downloads', serve as never)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/downloads', serve as never)
    }
  }
}

export default defineConfig({
  plugins: [react(), downloadsPlugin()],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') }
  },
  server: { fs: { allow: ['..'] } },
  build: { outDir: 'dist', emptyOutDir: true }
})
