/// <reference types="@cloudflare/workers-types" />

interface Env {
  /** D1 database binding (see wrangler.toml). */
  DB: D1Database
}

/** Minimum gap between counted downloads, per visitor. */
const WINDOW_MS = 5_000

interface DownloadState {
  /** Total downloads across every file. */
  count: number
  /** Counts keyed by file name. */
  files: Record<string, number>
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}

async function readState(env: Env): Promise<DownloadState> {
  const total = await env.DB.prepare('SELECT count FROM downloads WHERE id = 1').first<{
    count: number
  }>()
  const rows = await env.DB.prepare('SELECT file, count FROM file_downloads').all<{
    file: string
    count: number
  }>()
  const files: Record<string, number> = {}
  for (const row of rows.results ?? []) files[row.file] = row.count
  return { count: total?.count ?? 0, files }
}

/** GET /api/downloads -> { count, files } */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return json(await readState(env))
  } catch (err) {
    console.error('[lagu] download count failed', err)
    return json({ error: 'unavailable' }, 500)
  }
}

/**
 * POST /api/downloads  { file?: string }
 * Adds one download (for the given file, if provided) unless this visitor has
 * already been counted in the last 5 seconds.
 */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const now = Date.now()

  let file = ''
  try {
    const body = (await request.json()) as { file?: unknown }
    if (typeof body?.file === 'string') file = body.file.slice(0, 200)
  } catch {
    /* no body */
  }

  try {
    const recent = await env.DB.prepare('SELECT ts FROM rate WHERE ip = ?')
      .bind(ip)
      .first<{ ts: number }>()

    if (recent && now - recent.ts < WINDOW_MS) {
      return json({ ...(await readState(env)), limited: true }, 429)
    }

    const statements = [
      env.DB.prepare(
        'INSERT INTO rate (ip, ts) VALUES (?, ?) ON CONFLICT(ip) DO UPDATE SET ts = excluded.ts'
      ).bind(ip, now),
      env.DB.prepare('UPDATE downloads SET count = count + 1 WHERE id = 1')
    ]
    if (file) {
      statements.push(
        env.DB.prepare(
          'INSERT INTO file_downloads (file, count) VALUES (?, 1) ON CONFLICT(file) DO UPDATE SET count = count + 1'
        ).bind(file)
      )
    }

    await env.DB.batch(statements)
    return json(await readState(env))
  } catch (err) {
    console.error('[lagu] download register failed', err)
    return json({ error: 'unavailable' }, 500)
  }
}
