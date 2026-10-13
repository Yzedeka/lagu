import type { MobileTrack } from './tracks'

export interface MobileAlbum {
  key: string
  name: string
  artist: string
  year?: number
  tracks: MobileTrack[]
  duration: number
}

export interface MobileArtist {
  name: string
  albums: MobileAlbum[]
  trackCount: number
}

export function albumKeyOf(track: MobileTrack): string {
  return `${track.albumArtist || track.artist}\u0000${track.album}`
}

export function buildAlbums(tracks: MobileTrack[]): MobileAlbum[] {
  const map = new Map<string, MobileAlbum>()
  for (const track of tracks) {
    const key = albumKeyOf(track)
    let album = map.get(key)
    if (!album) {
      album = {
        key,
        name: track.album,
        artist: track.albumArtist || track.artist,
        year: track.year,
        tracks: [],
        duration: 0
      }
      map.set(key, album)
    }
    album.tracks.push(track)
    album.duration += track.duration ?? 0
    if (!album.year && track.year) album.year = track.year
  }
  const albums = [...map.values()]
  for (const album of albums) {
    album.tracks.sort((a, b) => (a.trackNo ?? 0) - (b.trackNo ?? 0))
  }
  albums.sort((a, b) => a.artist.localeCompare(b.artist) || a.name.localeCompare(b.name))
  return albums
}

export function buildArtists(tracks: MobileTrack[]): MobileArtist[] {
  const albums = buildAlbums(tracks)
  const map = new Map<string, MobileArtist>()
  for (const album of albums) {
    let group = map.get(album.artist)
    if (!group) {
      group = { name: album.artist, albums: [], trackCount: 0 }
      map.set(album.artist, group)
    }
    group.albums.push(album)
    group.trackCount += album.tracks.length
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** First track with artwork (used for album/artist cover fallbacks). */
export function artworkTrack(tracks: MobileTrack[]): MobileTrack | undefined {
  return tracks.find((t) => t.artwork) ?? tracks[0]
}

export function formatTotalDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}
