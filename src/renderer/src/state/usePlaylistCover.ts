import { useEffect, useState } from 'react'

const api = window.lagu

/** Resolve a playlist's custom cover file to a renderer-safe URL. */
export function usePlaylistCover(cover: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!cover) {
      setUrl(null)
      return
    }
    let cancelled = false
    void api.playlists
      .coverUrl(cover)
      .then((value) => {
        if (!cancelled) setUrl(value || null)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [cover])

  return url
}
