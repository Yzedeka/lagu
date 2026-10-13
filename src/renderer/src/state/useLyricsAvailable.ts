import { useEffect, useState } from 'react'

const api = window.lagu

/** True when the track has lyrics (synced, plain, imported or online). */
export function useLyricsAvailable(trackId: string | null, revision = 0): boolean {
  const [has, setHas] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!trackId) {
      setHas(false)
      return
    }
    void api.track.lyrics(trackId).then((lyrics) => {
      if (cancelled) return
      setHas(lyrics.synced || Boolean(lyrics.plain) || lyrics.lines.length > 0)
    })
    return () => {
      cancelled = true
    }
  }, [trackId, revision])

  return has
}
