import { parseBlob } from 'music-metadata'

export interface MobileTrack {
  id: string
  /** Object URL for the audio file. */
  url: string
  title: string
  artist: string
  album: string
  duration?: number
  /** Object URL for the embedded cover, when present. */
  artwork?: string
}

/** Turn a picked File into a playable track, reading tags and cover art. */
export async function trackFromFile(file: File): Promise<MobileTrack> {
  const fallback = file.name.replace(/\.[^.]+$/, '')
  const track: MobileTrack = {
    id: `${file.name}:${file.size}:${file.lastModified}`,
    url: URL.createObjectURL(file),
    title: fallback,
    artist: 'Unknown Artist',
    album: 'Unknown Album'
  }

  try {
    const meta = await parseBlob(file, { duration: true })
    const { common, format } = meta
    track.title = common.title?.trim() || track.title
    track.artist = (common.artist || common.albumartist || '').trim() || track.artist
    track.album = common.album?.trim() || track.album
    track.duration = format.duration ?? undefined

    const picture = common.picture?.[0]
    if (picture && picture.data.length > 0) {
      track.artwork = URL.createObjectURL(
        new Blob([new Uint8Array(picture.data)], { type: picture.format || 'image/jpeg' })
      )
    }
  } catch {
    /* keep the filename-based fallback */
  }

  return track
}

export function formatTime(seconds: number | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
