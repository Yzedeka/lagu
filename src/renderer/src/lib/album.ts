import type { AlbumSort, Track } from '@shared/types'
import { compareTracks } from '@shared/sort'

export interface Album {
  key: string
  name: string
  artist: string
  year?: number
  tracks: Track[]
  duration: number
  addedAt: number
}

export interface ArtistGroup {
  name: string
  albums: Album[]
  /** Every track on this artist's albums. */
  tracks: Track[]
  trackCount: number
}

const VARIOUS_ARTISTS = 'Various Artists'
const UNKNOWN_ALBUM = 'Unknown Album'

/**
 * Album key from a single track's tags. Albums whose tracks agree on their
 * artist keep this as their key, and pins saved by older versions use it
 * (see `findAlbum`).
 */
export function albumKeyOf(track: Track): string {
  return `${track.albumArtist || track.artist}\u0000${track.album}`
}

/** The lead artist of "A feat. B", "A & B", "A, B", "A x B" and the like. */
function leadArtist(name: string): string {
  const lead = name.split(
    /\s*(?:,|;|&|\/|\+|\bx\b|\bfeat\b\.?|\bft\b\.?|\bfeaturing\b|\bwith\b)\s*/i
  )[0]
  return (lead || name).trim().toLowerCase()
}

/** Folder a file lives in, treating "CD1"/"Disc 2" subfolders as their parent. */
function albumFolder(track: Track): string | null {
  if (track.source !== 'file') return null
  const parts = track.locator.split(/[\\/]/)
  parts.pop()
  if (parts.length > 1 && /^(?:cd|dis[ck])\s*\d+$/i.test(parts[parts.length - 1])) parts.pop()
  return parts.join('/')
}

/**
 * Whether tag-level groups that share an album name and folder are one album.
 * Files rarely carry an album-artist tag, so an album with guest artists
 * ("A", "A feat. B") or a compilation would otherwise split into one album per
 * artist. Groups stay apart only when they look like different albums: no
 * lead artist in common and clashing track numbers.
 */
function belongTogether(groups: Track[][]): boolean {
  const leads = groups.map((g) => new Set(g.map((t) => leadArtist(t.albumArtist || t.artist))))
  if ([...leads[0]].some((lead) => leads.every((set) => set.has(lead)))) return true
  const seen = new Set<string>()
  for (const track of groups.flat()) {
    if (track.trackNo == null) continue
    const slot = `${track.discNo ?? 1}:${track.trackNo}`
    if (seen.has(slot)) return false
    seen.add(slot)
  }
  return true
}

/** Artist shown for a merged album: the shared lead artist, else "Various Artists". */
function mergedArtist(tracks: Track[]): string {
  const leads = new Map<string, string>()
  for (const track of tracks) {
    const name = track.albumArtist || track.artist
    const lead = leadArtist(name)
    // Prefer the bare spelling ("A") over a credited one ("A feat. B").
    if (!leads.has(lead) || name.trim().toLowerCase() === lead) leads.set(lead, name)
  }
  return leads.size === 1 ? [...leads.values()][0] : VARIOUS_ARTISTS
}

export function buildAlbums(tracks: Track[]): Album[] {
  // Bucket by folder + album name, then by tagged artist within each bucket.
  const buckets = new Map<string, Map<string, Track[]>>()
  for (const track of tracks) {
    const folder = albumFolder(track)
    const tagKey = albumKeyOf(track)
    // Streams and untagged files have nothing but their tags to go on.
    const bucketKey =
      folder == null || track.album === UNKNOWN_ALBUM
        ? `tag\u0000${tagKey}`
        : `dir\u0000${folder}\u0000${track.album.trim().toLowerCase()}`
    let bucket = buckets.get(bucketKey)
    if (!bucket) {
      bucket = new Map()
      buckets.set(bucketKey, bucket)
    }
    const group = bucket.get(tagKey)
    if (group) group.push(track)
    else bucket.set(tagKey, [track])
  }

  const albums: Album[] = []
  const usedKeys = new Set<string>()
  const add = (key: string, scope: string, artist: string, list: Track[]): void => {
    const unique = usedKeys.has(key) ? `${key}\u0000${scope}` : key
    usedKeys.add(unique)
    const album: Album = {
      key: unique,
      name: list[0].album,
      artist,
      year: undefined,
      tracks: [...list].sort(compareTracks),
      duration: 0,
      addedAt: 0
    }
    for (const track of list) {
      album.duration += track.duration ?? 0
      album.addedAt = Math.max(album.addedAt, track.addedAt)
      if (!album.year && track.year) album.year = track.year
    }
    albums.push(album)
  }

  for (const [bucketKey, bucket] of buckets) {
    const groups = [...bucket.entries()]
    if (groups.length > 1 && belongTogether(groups.map(([, list]) => list))) {
      const all = groups.flatMap(([, list]) => list)
      const artist = mergedArtist(all)
      add(`${artist}\u0000${all[0].album}`, bucketKey, artist, all)
      continue
    }
    for (const [key, list] of groups) {
      add(key, bucketKey, list[0].albumArtist || list[0].artist, list)
    }
  }

  return albums
}

/**
 * Find an album by key. Also accepts the per-track key that pins saved before
 * albums with several artists were merged.
 */
export function findAlbum(albums: Album[], ref: string): Album | null {
  return (
    albums.find((a) => a.key === ref) ??
    albums.find((a) => a.tracks.some((t) => albumKeyOf(t) === ref)) ??
    null
  )
}

export function sortAlbums(albums: Album[], sort: AlbumSort, desc: boolean): Album[] {
  const sorted = [...albums]
  sorted.sort((a, b) => {
    switch (sort) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'year':
        return (a.year ?? 0) - (b.year ?? 0) || a.artist.localeCompare(b.artist)
      case 'added':
        return a.addedAt - b.addedAt
      case 'tracks':
        return a.tracks.length - b.tracks.length
      case 'artist':
      default:
        return a.artist.localeCompare(b.artist) || a.name.localeCompare(b.name)
    }
  })
  return desc ? sorted.reverse() : sorted
}

export function buildArtists(tracks: Track[]): ArtistGroup[] {
  const albums = buildAlbums(tracks)
  const map = new Map<string, ArtistGroup>()
  for (const album of albums) {
    let group = map.get(album.artist)
    if (!group) {
      group = { name: album.artist, albums: [], tracks: [], trackCount: 0 }
      map.set(album.artist, group)
    }
    group.albums.push(album)
    group.tracks.push(...album.tracks)
    group.trackCount += album.tracks.length
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export interface FolderGroup {
  path: string
  trackCount: number
  duration: number
}

export function buildFolders(tracks: Track[]): FolderGroup[] {
  const map = new Map<string, FolderGroup>()
  for (const track of tracks) {
    const key = track.folder || '(streams)'
    let group = map.get(key)
    if (!group) {
      group = { path: key, trackCount: 0, duration: 0 }
      map.set(key, group)
    }
    group.trackCount += 1
    group.duration += track.duration ?? 0
  }
  return [...map.values()].sort((a, b) => a.path.localeCompare(b.path))
}
