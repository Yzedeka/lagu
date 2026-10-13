/// <reference types="@cloudflare/workers-types" />

interface Env {
  /** D1 database binding (see wrangler.toml). */
  DB: D1Database
}

/** Minimum gap between counted downloads, per visitor. */
const WINDOW_MS = 5_000

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}

async function readCount(env: Env): Promise<number> {
  const row = await env.DB.prepare('SELECT count FROM downloads WHERE id = 1').first<{
    count: number
  }>()
  return row?.count ?? 0
}

/** GET /api/downloads -> { count } */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return json({ count: await readCount(env) })
  } catch (err) {
    console.error('[lagu] download count failed', err)
    return json({ error: 'unavailable' }, 500)
  }
}

/**
 * POST /api/downloads
 * Increments the counter once per visitor every 5 seconds. Rate-limited
 * requests get a 429 and do not change the total.
 */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const now = Date.now()

  try {
    const recent = await env.DB.prepare('SELECT ts FROM rate WHERE ip = ?')
      .bind(ip)
      .first<{ ts: number }>()

    if (recent && now - recent.ts < WINDOW_MS) {
      return json({ count: await readCount(env), limited: true }, 429)
    }

    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO rate (ip, ts) VALUES (?, ?) ON CONFLICT(ip) DO UPDATE SET ts = excluded.ts'
      ).bind(ip, now),
      env.DB.prepare('UPDATE downloads SET count = count + 1 WHERE id = 1')
    ])

    return json({ count: await readCount(env) })
  } catch (err) {
    console.error('[lagu] download register failed', err)
    return json({ error: 'unavailable' }, 500)
  }
}
