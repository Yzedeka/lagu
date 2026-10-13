import { useEffect, useState } from 'react'

const api = window.lagu
const cache = new Map<string, Promise<string | null>>()
let version = 0
const listeners = new Set<() => void>()

/**
 * Invalidate cached artwork URLs. Called when the library changes (e.g. after
 * an online cover lookup), so components re-request the current artwork.
 */
export function bumpArtworkVersion(): void {
  version += 1
  cache.clear()
  listeners.forEach((notify) => notify())
}

/** Fetch (and memoize) the cached artwork URL for a track. */
export function artworkFor(trackId: string): Promise<string | null> {
  let entry = cache.get(trackId)
  if (!entry) {
    entry = api.track.artworkUrl(trackId).catch(() => null)
    cache.set(trackId, entry)
  }
  return entry
}

export function useArtwork(trackId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const [tick, setTick] = useState(version)

  useEffect(() => {
    const notify = (): void => setTick(version)
    listeners.add(notify)
    return () => {
      listeners.delete(notify)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!trackId) {
      setUrl(null)
      return
    }
    void artworkFor(trackId).then((result) => {
      if (!cancelled) setUrl(result)
    })
    return () => {
      cancelled = true
    }
  }, [trackId, tick])

  return url
}
