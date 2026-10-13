import type { Track } from './types'

/** Custom privileged scheme used to stream local files into the renderer. */
export const MEDIA_SCHEME = 'lagu'

/** Build a renderer-safe URL for an absolute local file path. */
export function mediaUrlFor(absolutePath: string): string {
  return `${MEDIA_SCHEME}://local/${encodeURIComponent(absolutePath)}`
}

/** Resolve the URL an <audio> element should load for a track. */
export function playableUrl(track: Track): string {
  return track.source === 'url' ? track.locator : mediaUrlFor(track.locator)
}
