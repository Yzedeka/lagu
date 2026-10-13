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
  trackCount: number
}

export function albumKeyOf(track: Track): string {
  return `${track.albumArtist || track.artist}\u0000${track.album}`
}

export function buildAlbums(tracks: Track[]): Album[] {
  const map = new Map<string, Album>()
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
        duration: 0,
        addedAt: track.addedAt
      }
      map.set(key, album)
    }
    album.tracks.push(track)
    album.duration += track.duration ?? 0
    album.addedAt = Math.max(album.addedAt, track.addedAt)
    if (!album.year && track.year) album.year = track.year
  }
  const albums = [...map.values()]
  for (const album of albums) album.tracks.sort(compareTracks)
  return albums
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
      group = { name: album.artist, albums: [], trackCount: 0 }
      map.set(album.artist, group)
    }
    group.albums.push(album)
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
