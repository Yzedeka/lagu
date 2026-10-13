/**
 * Online album-art lookup.
 *
 * Uses the iTunes Search API (no key, very broad coverage) with Deezer as a
 * fallback. Results are scored against the track's artist/album/title so we
 * only accept a confident match - a wrong cover is worse than no cover.
 */

export interface CoverQuery {
  artist?: string
  album?: string
  title?: string
}

export interface CoverResult {
  url: string
  provider: 'itunes' | 'deezer'
  id: string
  ext: string
}

const UNKNOWN_ARTIST = 'unknown artist'
const UNKNOWN_ALBUM = 'unknown album'

/** Generic words that should never count as a meaningful match. */
const STOPWORDS = new Set([
  'song',
  'songs',
  'track',
  'tracks',
  'audio',
  'video',
  'music',
  'unknown',
  'artist',
  'album',
  'the',
  'and',
  'feat',
  'ft',
  'test',
  'demo',
  'untitled',
  'new',
  'full',
  'remix',
  'version'
])

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\((?:feat|ft|with)[^)]*\)|\[(?:feat|ft|with)[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(' ')
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  )
}

/** Fraction of the smaller token set that the two sets share. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const token of a) if (b.has(token)) shared += 1
  return shared / Math.min(a.size, b.size)
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Lagu Music Player (local)' }
    })
    if (!response.ok) return null
    return (await response.json()) as unknown
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function extFromUrl(url: string): string {
  const match = /\.([a-z0-9]+)(?:\?|$)/i.exec(url)
  const ext = match?.[1]?.toLowerCase()
  return ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'jpg'
}

/** Upscale an iTunes 100px thumbnail to a larger render. */
function itunesHiRes(url: string): string {
  return url.replace(/\/\d+x\d+bb\./, '/600x600bb.')
}

interface ItunesItem {
  artistName?: string
  collectionName?: string
  trackName?: string
  artworkUrl100?: string
  collectionId?: number
  trackId?: number
}

function scoreItunes(item: ItunesItem, q: Required<Pick<CoverQuery, 'artist' | 'album' | 'title'>>): number {
  if (!item.artworkUrl100) return 0
  const itemArtist = tokens(item.artistName ?? '')
  const itemName = tokens(item.collectionName || item.trackName || '')

  const queryArtist = tokens(q.artist)
  const queryName = tokens(q.album || q.title)

  const artistScore = queryArtist.size > 0 ? overlap(queryArtist, itemArtist) : 1
  const nameScore = queryName.size > 0 ? overlap(queryName, itemName) : 0

  if (queryName.size === 0) return 0
  if (queryArtist.size > 0) {
    if (artistScore < 0.5 || nameScore < 0.34) return 0
    return artistScore * 0.55 + nameScore * 0.45
  }
  // No usable artist: require a strong title/album match to avoid junk covers.
  if (nameScore < 0.6) return 0
  return nameScore
}

export async function searchCover(query: CoverQuery): Promise<CoverResult | null> {
  const artist = query.artist && query.artist.toLowerCase() !== UNKNOWN_ARTIST ? query.artist : ''
  const album = query.album && query.album.toLowerCase() !== UNKNOWN_ALBUM ? query.album : ''
  const title = query.title ?? ''
  if (!artist && !album && !title) return null

  const term = [artist, album || title].filter(Boolean).join(' ').trim()
  if (!term) return null

  // --- iTunes ---------------------------------------------------------------
  const entity = album ? 'album' : 'song'
  const itunes = (await fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=8`
  )) as { results?: ItunesItem[] } | null

  if (itunes?.results && itunes.results.length > 0) {
    const scored = itunes.results
      .map((item) => ({ item, score: scoreItunes(item, { artist, album, title }) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
    const best = scored[0]
    if (best && best.score >= 0.55 && best.item.artworkUrl100) {
      const url = itunesHiRes(best.item.artworkUrl100)
      const id = String(best.item.collectionId ?? best.item.trackId ?? url)
      return { url, provider: 'itunes', id, ext: extFromUrl(url) }
    }
  }

  // --- Deezer fallback ------------------------------------------------------
  const deezer = (await fetchJson(
    `https://api.deezer.com/search?q=${encodeURIComponent(term)}&limit=8`
  )) as
    | {
        data?: {
          artist?: { name?: string }
          album?: { title?: string; cover_xl?: string; cover_big?: string; id?: number }
          title?: string
        }[]
      }
    | null

  if (deezer?.data && deezer.data.length > 0) {
    const queryArtist = tokens(artist)
    const queryName = tokens(album || title)
    if (queryName.size === 0) return null
    const candidates = deezer.data
      .map((entry) => {
        const cover = entry.album?.cover_xl ?? entry.album?.cover_big
        if (!cover) return { entry, score: 0 }
        const artistScore = queryArtist.size > 0 ? overlap(queryArtist, tokens(entry.artist?.name ?? '')) : 1
        const nameScore = overlap(queryName, tokens(entry.album?.title ?? entry.title ?? ''))
        if (queryArtist.size > 0) {
          if (artistScore < 0.5 || nameScore < 0.34) return { entry, score: 0 }
          return { entry, score: artistScore * 0.55 + nameScore * 0.45 }
        }
        if (nameScore < 0.6) return { entry, score: 0 }
        return { entry, score: nameScore }
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
    const best = candidates[0]
    const cover = best?.entry.album?.cover_xl ?? best?.entry.album?.cover_big
    if (best && best.score >= 0.55 && cover) {
      return {
        url: cover,
        provider: 'deezer',
        id: String(best.entry.album?.id ?? cover),
        ext: extFromUrl(cover)
      }
    }
  }

  return null
}

/** Download cover bytes. Returns null on any failure. */
export async function downloadCover(url: string): Promise<Buffer | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Lagu Music Player (local)' }
    })
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > 15_000_000) return null
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Find an artist profile picture. Deezer's artist search exposes artist images
 * (the iTunes musicArtist entity does not), so it is used here.
 */
export async function searchArtistImage(
  name: string
): Promise<{ url: string; ext: string } | null> {
  const query = tokens(name)
  if (query.size === 0) return null

  const data = (await fetchJson(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`
  )) as
    | {
        data?: {
          name?: string
          picture_xl?: string
          picture_big?: string
          picture_medium?: string
        }[]
      }
    | null

  if (!data?.data || data.data.length === 0) return null

  const scored = data.data
    .map((entry) => {
      const url = entry.picture_xl ?? entry.picture_big ?? entry.picture_medium
      if (!url) return { url: '', score: 0 }
      return { url, score: overlap(query, tokens(entry.name ?? '')) }
    })
    .filter((entry) => entry.url && entry.score > 0)
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (!best || best.score < 0.6) return null
  return { url: best.url, ext: extFromUrl(best.url) }
}
