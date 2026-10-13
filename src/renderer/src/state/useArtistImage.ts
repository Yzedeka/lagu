import { useEffect, useState } from 'react'

const api = window.lagu
const cache = new Map<string, Promise<string | null>>()
let version = 0
const listeners = new Set<() => void>()

export function bumpArtistImageVersion(): void {
  version += 1
  cache.clear()
  listeners.forEach((notify) => notify())
}

export function artistImageFor(name: string): Promise<string | null> {
  const key = name.toLowerCase()
  let entry = cache.get(key)
  if (!entry) {
    entry = api.artwork.artistImage(name).catch(() => null)
    cache.set(key, entry)
  }
  return entry
}

export function useArtistImage(name: string | null | undefined): string | null {
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
    if (!name) {
      setUrl(null)
      return
    }
    void artistImageFor(name).then((result) => {
      if (!cancelled) setUrl(result)
    })
    return () => {
      cancelled = true
    }
  }, [name, tick])

  return url
}
