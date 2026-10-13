import { protocol } from 'electron'
import { promises as fs, createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import path from 'node:path'
import { MEDIA_SCHEME, mediaUrlFor } from '@shared/media'

export { MEDIA_SCHEME, mediaUrlFor }

/** Must run before `app.whenReady()` to make the scheme fetchable + CORS-clean. */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
    }
  ])
}

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  m4b: 'audio/mp4',
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  weba: 'audio/webm',
  webm: 'audio/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp'
}

function mimeFor(filePath: string): string {
  return MIME[path.extname(filePath).slice(1).toLowerCase()] ?? 'application/octet-stream'
}

function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    ...extra
  }
}

/**
 * Serve `lagu://local/<encoded-absolute-path>` with explicit HTTP range support.
 * Chromium needs real 206 responses to treat media as seekable - without this,
 * seeking can reset playback to the start.
 */
export function handleMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      const filePath = decodeURIComponent(url.pathname.replace(/^\//, ''))
      if (!filePath) return new Response('Not found', { status: 404, headers: corsHeaders() })

      let size: number
      try {
        size = (await fs.stat(filePath)).size
      } catch {
        return new Response('Not found', { status: 404, headers: corsHeaders() })
      }

      const type = mimeFor(filePath)
      const rangeHeader = request.headers.get('range')

      if (rangeHeader) {
        const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
        let start = match && match[1] ? Number(match[1]) : 0
        let end = match && match[2] ? Number(match[2]) : size - 1
        if (!Number.isFinite(start) || start < 0) start = 0
        if (!Number.isFinite(end) || end >= size) end = size - 1
        if (start > end) {
          return new Response(null, {
            status: 416,
            headers: corsHeaders({ 'Content-Range': `bytes */${size}` })
          })
        }
        const body = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream
        return new Response(body, {
          status: 206,
          headers: corsHeaders({
            'Content-Type': type,
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${size}`
          })
        })
      }

      const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream
      return new Response(body, {
        status: 200,
        headers: corsHeaders({ 'Content-Type': type, 'Content-Length': String(size) })
      })
    } catch (err) {
      console.error('[lagu] media protocol error', err)
      return new Response('Error', { status: 500, headers: corsHeaders() })
    }
  })
}
