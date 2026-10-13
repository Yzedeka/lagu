import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseFile } from 'music-metadata'
import type { Lyrics, LyricWord, LyricsLine, Track } from '@shared/types'
import type { Store } from './store'

const LINE_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g
const WORD_TAG = /<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>/g
const META_TAG = /^\[[a-z]{2,10}:[^\]]*\]$/i

function toMs(min: string, sec: string, frac?: string): number {
  const f = Number((frac ?? '0').padEnd(3, '0').slice(0, 3))
  return Number(min) * 60_000 + Number(sec) * 1000 + f
}

/** Extract every line-level `[mm:ss.xx]` timestamp from a raw line. */
function lineStamps(line: string): number[] {
  const stamps: number[] = []
  LINE_TAG.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = LINE_TAG.exec(line)) !== null) stamps.push(toMs(match[1], match[2], match[3]))
  return stamps
}

/** Parse Enhanced LRC `<mm:ss.xx>` word tags out of a line's content. */
function parseWords(content: string, lineStart: number | undefined): LyricWord[] {
  const marks: { time: number; start: number; end: number }[] = []
  WORD_TAG.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = WORD_TAG.exec(content)) !== null) {
    marks.push({ time: toMs(match[1], match[2], match[3]), start: match.index, end: WORD_TAG.lastIndex })
  }
  if (marks.length === 0) return []

  const words: LyricWord[] = []
  const leading = content.slice(0, marks[0].start).trim()
  if (leading) words.push({ time: lineStart ?? marks[0].time, text: leading })
  for (let i = 0; i < marks.length; i += 1) {
    const end = i + 1 < marks.length ? marks[i + 1].start : content.length
    const text = content.slice(marks[i].end, end).trim()
    if (text) words.push({ time: marks[i].time, text })
  }
  return words
}

/**
 * Parse an LRC document, including Enhanced LRC word timings.
 * Only reports `synced: true` when every non-empty line is timestamped.
 */
export function parseLrc(content: string): Lyrics {
  const rawLines = content.split(/\r?\n/)
  const lines: LyricsLine[] = []
  const plainParts: string[] = []
  let enhanced = false

  for (const raw of rawLines) {
    const line = raw.trim()
    if (!line) continue

    const stamps = lineStamps(line)
    if (stamps.length === 0 && META_TAG.test(line)) continue

    const body = line.replace(LINE_TAG, '')
    const words = parseWords(body, stamps[0])
    if (words.length > 0) enhanced = true
    const text = words.length > 0 ? words.map((w) => w.text).join(' ') : body.trim()

    const times = stamps.length > 0 ? stamps : words.length > 0 ? [words[0].time] : []
    if (times.length === 0) {
      if (text) {
        lines.push({ time: null, text })
        plainParts.push(text)
      }
      continue
    }
    for (const time of times) {
      lines.push({ time, text, words: words.length > 0 ? words : undefined })
    }
    if (text) plainParts.push(text)
  }

  const hasTimed = lines.some((l) => l.time !== null)
  const allTimed = lines.length > 0 && lines.every((l) => l.time !== null)

  if (!hasTimed) {
    return { synced: false, source: 'lrc-file', lines: [], plain: plainParts.join('\n') }
  }

  lines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0))

  if (!allTimed) {
    // Mixed timestamps: present as unsynchronized to stay honest.
    return {
      synced: false,
      source: 'lrc-file',
      lines: [],
      plain: lines.map((l) => l.text).filter(Boolean).join('\n')
    }
  }

  return { synced: true, source: 'lrc-file', lines, enhanced }
}

async function readSidecarLrc(filePath: string): Promise<string | null> {
  const dir = path.dirname(filePath)
  const base = path.basename(filePath, path.extname(filePath))
  for (const name of [`${base}.lrc`, `${base}.LRC`]) {
    try {
      return await fs.readFile(path.join(dir, name), 'utf8')
    } catch {
      /* try next */
    }
  }
  return null
}

interface EmbeddedLyricsTag {
  syncText?: { text?: string; timestamp?: number }[]
  text?: string
}

/**
 * Resolve lyrics for a track, preferring (in order):
 * user-imported .lrc → sidecar .lrc next to the file → embedded tags.
 */
export async function getLyrics(track: Track, store: Store): Promise<Lyrics> {
  const imported = await store.readImportedLyrics(track.id)
  if (imported) {
    const parsed = parseLrc(imported)
    if (parsed.lines.length > 0 || parsed.plain) {
      return { ...parsed, source: 'lrc-file', imported: true }
    }
  }

  if (track.source !== 'file') {
    return { synced: false, source: 'none', lines: [] }
  }

  const sidecar = await readSidecarLrc(track.locator)
  if (sidecar) {
    const parsed = parseLrc(sidecar)
    if (parsed.lines.length > 0 || parsed.plain) {
      return { ...parsed, source: 'lrc-file' }
    }
  }

  try {
    const meta = await parseFile(track.locator, { skipCovers: true, duration: false })
    const tags = (meta.common.lyrics ?? []) as unknown as EmbeddedLyricsTag[]
    for (const tag of tags) {
      if (Array.isArray(tag.syncText) && tag.syncText.length > 0) {
        const lines: LyricsLine[] = tag.syncText
          .map((entry) => ({
            time: typeof entry.timestamp === 'number' ? entry.timestamp : null,
            text: (entry.text ?? '').trim()
          }))
          .filter((l) => l.text.length > 0)
        if (lines.length > 0 && lines.every((l) => l.time !== null)) {
          lines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
          return { synced: true, source: 'embedded', lines }
        }
        if (lines.length > 0) {
          return {
            synced: false,
            source: 'embedded',
            lines: [],
            plain: lines.map((l) => l.text).join('\n')
          }
        }
      }
      if (tag.text && tag.text.trim()) {
        return { synced: false, source: 'embedded', lines: [], plain: tag.text.trim() }
      }
    }
  } catch {
    /* ignore */
  }

  // Fall back to lyrics fetched online earlier (cached, never overwritten).
  const online = await store.readOnlineLyrics(track.id)
  if (online) {
    const parsed = parseLrc(online)
    if (parsed.lines.length > 0 || parsed.plain) {
      return { ...parsed, source: 'online' }
    }
  }

  return { synced: false, source: 'none', lines: [] }
}

// --- online lyrics (LRCLIB) ------------------------------------------------

interface LrclibItem {
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

function normTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((t) => t.length > 1)
  )
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared += 1
  return shared / Math.min(a.size, b.size)
}

async function lrclibJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Lagu Music Player (local music player)' }
    })
    if (!response.ok) return null
    return (await response.json()) as unknown
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function scoreLyricItem(
  item: LrclibItem,
  artistTokens: Set<string>,
  titleTokens: Set<string>,
  duration?: number
): number {
  if (item.instrumental) return 0
  if (!item.syncedLyrics && !item.plainLyrics) return 0
  const artistScore = tokenOverlap(artistTokens, normTokens(item.artistName ?? ''))
  const titleScore = tokenOverlap(titleTokens, normTokens(item.trackName ?? ''))
  if (artistTokens.size > 0 && artistScore < 0.5) return 0
  if (titleTokens.size > 0 && titleScore < 0.5) return 0
  let score = artistScore * 0.5 + titleScore * 0.5
  if (item.syncedLyrics) score += 0.12
  // Prefer word-level (Enhanced LRC) when a source happens to provide it.
  if (item.syncedLyrics && /<\d{1,3}:\d{1,2}/.test(item.syncedLyrics)) score += 0.2
  if (duration && item.duration) {
    const diff = Math.abs(item.duration - duration)
    if (diff <= 3) score += 0.1
    else if (diff > 8) score -= 0.2
  }
  return score
}

/**
 * Look up lyrics online. Prefers timestamped (and word-level "Enhanced") LRC
 * from LRCLIB, falling back to plain, sentence-by-sentence lyrics.
 */
export async function fetchOnlineLyrics(query: {
  artist: string
  title: string
  album?: string
  duration?: number
}): Promise<string | null> {
  const artist = query.artist && query.artist.toLowerCase() !== 'unknown artist' ? query.artist : ''
  const title = query.title ?? ''
  if (!title && !artist) return null

  // 1. Exact endpoint (needs artist + track + album).
  const exactParams = new URLSearchParams()
  if (artist) exactParams.set('artist_name', artist)
  if (title) exactParams.set('track_name', title)
  if (query.album) exactParams.set('album_name', query.album)
  const exact = (await lrclibJson(`https://lrclib.net/api/get?${exactParams.toString()}`)) as LrclibItem | null
  if (exact && !exact.instrumental && (exact.syncedLyrics || exact.plainLyrics)) {
    return exact.syncedLyrics?.trim() || exact.plainLyrics?.trim() || null
  }

  // 2. Search + best match.
  const searchParams = new URLSearchParams()
  if (title) searchParams.set('track_name', title)
  if (artist) searchParams.set('artist_name', artist)
  let list = (await lrclibJson(`https://lrclib.net/api/search?${searchParams.toString()}`)) as
    | LrclibItem[]
    | null
  if (!Array.isArray(list) || list.length === 0) {
    list = (await lrclibJson(
      `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${title}`.trim())}`
    )) as LrclibItem[] | null
  }
  if (!Array.isArray(list) || list.length === 0) return null

  const artistTokens = normTokens(artist)
  const titleTokens = normTokens(title)
  const best = list
    .map((item) => ({ item, score: scoreLyricItem(item, artistTokens, titleTokens, query.duration) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]

  if (!best || best.score < 0.55) return null
  return best.item.syncedLyrics?.trim() || best.item.plainLyrics?.trim() || null
}
