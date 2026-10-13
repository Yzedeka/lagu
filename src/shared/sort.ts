import type { Track } from './types'

/** Canonical track ordering: artist, album, disc, track number, title. */
export function compareTracks(a: Track, b: Track): number {
  return (
    a.artist.localeCompare(b.artist) ||
    a.album.localeCompare(b.album) ||
    (a.discNo ?? 0) - (b.discNo ?? 0) ||
    (a.trackNo ?? 0) - (b.trackNo ?? 0) ||
    a.title.localeCompare(b.title) ||
    a.locator.localeCompare(b.locator)
  )
}
