import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseFile } from 'music-metadata'
import type { Track } from '@shared/types'
import type { Store } from './store'

/** Extensions Chromium can decode natively (plus what the OS build supports). */
export const SUPPORTED_EXTENSIONS = new Set([
  'mp3',
  'm4a',
  'm4b',
  'aac',
  'flac',
  'ogg',
  'oga',
  'opus',
  'wav',
  'weba',
  'mp4',
  'm4v',
  'mov',
  'webm',
  '3gp',
  '3g2'
])

/**
 * Formats that are real audio but that Chromium cannot decode. We surface these
 * so the UI can explain why a file is missing instead of silently dropping it.
 */
export const KNOWN_UNSUPPORTED_EXTENSIONS = new Set([
  'wma',
  'ape',
  'aiff',
  'aif',
  'dsf',
  'dff',
  'mpc',
  'wv',
  'tta',
  'mka',
  'caf',
  'ra',
  'ram',
  'mid',
  'midi'
])

export function extensionOf(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase()
  return ext
}

function mimeToExt(mime: string): string {
  const m = mime.toLowerCase()
  if (m.includes('png')) return 'png'
  if (m.includes('gif')) return 'gif'
  if (m.includes('webp')) return 'webp'
  if (m.includes('bmp')) return 'bmp'
  return 'jpg'
}

function clean(value: string | undefined): string {
  return (value ?? '').replace(/\0/g, '').trim()
}

const FOLDER_ART_BASENAMES = [
  'cover',
  'folder',
  'front',
  'album',
  'albumart',
  'albumartsmall',
  'artwork',
  'thumb',
  'coverart',
  'folderart',
  'poster'
]
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp'])
const dirArtCache = new Map<string, string | null>()

/** Clear per-directory artwork lookups (call before a scan so changes are seen). */
export function clearMetadataCaches(): void {
  dirArtCache.clear()
}

function stemOf(fileName: string): string {
  const ext = extensionOf(fileName)
  return (ext ? fileName.slice(0, fileName.length - ext.length - 1) : fileName).toLowerCase()
}

/** Find a cover image in a single directory, preferring conventional names. */
async function coverInDir(dir: string, preferredStem: string | null): Promise<string | null> {
  if (dirArtCache.has(dir)) return dirArtCache.get(dir) ?? null
  let result: string | null = null
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const images = entries.filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(extensionOf(e.name)))

    // 1. Exact or prefixed conventional names (cover.jpg, folder-front.png, …).
    outer: for (const base of FOLDER_ART_BASENAMES) {
      for (const entry of images) {
        const stem = stemOf(entry.name)
        if (stem === base || stem.startsWith(`${base}-`) || stem.startsWith(`${base}_`)) {
          result = path.join(dir, entry.name)
          break outer
        }
      }
    }

    // 2. An image named after the folder itself (e.g. "Nevermind.jpg").
    if (!result && preferredStem) {
      const wanted = preferredStem.toLowerCase()
      const hit = images.find((e) => stemOf(e.name) === wanted)
      if (hit) result = path.join(dir, hit.name)
    }

    // 3. Any image at all in the folder.
    if (!result && images.length > 0) result = path.join(dir, images[0].name)
  } catch {
    /* unreadable directory */
  }
  dirArtCache.set(dir, result)
  return result
}

/**
 * Look for cover art starting in the track's folder and walking up towards the
 * library root. Covers commonly sit one or two levels above the file.
 */
async function findCoverImage(startDir: string, stopDir: string): Promise<string | null> {
  let current = startDir
  for (let depth = 0; depth < 4; depth += 1) {
    const hit = await coverInDir(current, path.basename(current))
    if (hit) return hit
    if (current === stopDir) break
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

/**
 * Infer artist/title from common filename patterns when tags are missing:
 * "01 - Artist - Title", "Artist - Title", "01. Title", "01 Title".
 */
function inferFromFilename(base: string): { artist?: string; title?: string; trackNo?: number } {
  let rest = base
  let trackNo: number | undefined
  const numbered = /^(\d{1,3})\s*[.\-_)]\s*(.+)$/.exec(rest)
  if (numbered) {
    trackNo = Number(numbered[1])
    rest = numbered[2].trim()
  }
  const parts = rest.split(/\s+-\s+/)
  if (parts.length >= 2) {
    const artist = parts[0].trim()
    const title = parts.slice(1).join(' - ').trim()
    if (artist && title) return { artist, title, trackNo }
  }
  return { title: rest.trim() || base, trackNo }
}

async function cacheArtworkFile(
  store: Store,
  sourceKey: string,
  data: Buffer,
  ext: string
): Promise<string> {
  const fileName = `${store.hashPath(sourceKey)}.${ext}`
  const dest = path.join(store.artworkDir, fileName)
  try {
    await fs.access(dest)
  } catch {
    await fs.writeFile(dest, data)
  }
  return fileName
}

/**
 * Read tags, embedded artwork and folder artwork for a local audio file and
 * produce a Track. Never throws: on failure it returns a Track built from the
 * filename so the file still appears (and can be played) in the library.
 */
export async function readTrack(filePath: string, folder: string, store: Store): Promise<Track> {
  const stat = await fs.stat(filePath)
  const stem = path.basename(filePath, path.extname(filePath))
  const dir = path.dirname(filePath)

  const base: Track = {
    id: filePath,
    source: 'file',
    locator: filePath,
    title: stem,
    artist: 'Unknown Artist',
    album: 'Unknown Album',
    albumArtist: '',
    genre: [],
    hasArtwork: false,
    folder,
    addedAt: stat.birthtimeMs || stat.mtimeMs || Date.now(),
    fileMtime: stat.mtimeMs,
    fileSize: stat.size
  }

  try {
    const meta = await parseFile(filePath, { duration: true, skipCovers: false })
    const common = meta.common
    const format = meta.format

    base.title = clean(common.title) || base.title
    base.artist = clean(common.artist) || clean(common.albumartist) || base.artist
    base.album = clean(common.album) || base.album
    base.albumArtist = clean(common.albumartist) || base.artist
    base.trackNo = common.track?.no ?? undefined
    base.discNo = common.disk?.no ?? undefined
    base.year = common.year ?? undefined
    base.genre = (common.genre ?? []).map(clean).filter(Boolean)
    base.duration = format.duration ?? undefined
    base.codec = format.codec ?? format.container ?? undefined
    base.bitrate = format.bitrate ?? undefined
    base.sampleRate = format.sampleRate ?? undefined
    base.channels = format.numberOfChannels ?? undefined
    base.lossless = format.lossless ?? undefined

    const picture = common.picture?.[0]
    if (picture && picture.data && picture.data.length > 0) {
      const ext = mimeToExt(picture.format || 'image/jpeg')
      base.artworkFile = await cacheArtworkFile(store, filePath, Buffer.from(picture.data), ext)
      base.artworkMime = picture.format || 'image/jpeg'
      base.hasArtwork = true
    }
  } catch {
    // Metadata parse failure: keep filename-derived Track, still playable.
  }

  // Fill gaps from filename / folder structure when tags are missing.
  const inferred = inferFromFilename(stem)
  if (base.title === stem && inferred.title && inferred.title !== stem) base.title = inferred.title
  if (base.artist === 'Unknown Artist' && inferred.artist) base.artist = inferred.artist
  if (base.trackNo == null && inferred.trackNo != null) base.trackNo = inferred.trackNo
  if (base.album === 'Unknown Album' && dir && dir !== folder) {
    base.album = path.basename(dir)
  }
  if (!base.albumArtist) base.albumArtist = base.artist

  // No embedded art: look for a cover image near the file, then up the tree.
  if (!base.hasArtwork) {
    const artPath = await findCoverImage(dir, folder)
    if (artPath) {
      try {
        const data = await fs.readFile(artPath)
        const ext = extensionOf(artPath) || 'jpg'
        base.artworkFile = await cacheArtworkFile(store, artPath, data, ext)
        base.artworkMime = `image/${ext === 'jpg' ? 'jpeg' : ext}`
        base.hasArtwork = true
      } catch {
        /* ignore unreadable cover */
      }
    }
  }

  return base
}

/** Build a Track for a remote URL without fetching it. */
export function trackFromUrl(rawUrl: string): { track?: Track; error?: string } {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { error: 'Not a valid URL.' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: 'Only http(s) audio URLs are supported.' }
  }
  const name = decodeURIComponent(path.basename(url.pathname)) || url.hostname
  const title = name.replace(/\.[a-z0-9]+$/i, '') || url.hostname
  return {
    track: {
      id: `url:${url.toString()}`,
      source: 'url',
      locator: url.toString(),
      title,
      artist: url.hostname,
      album: 'Streams',
      albumArtist: '',
      genre: [],
      hasArtwork: false,
      folder: '',
      addedAt: Date.now()
    }
  }
}
