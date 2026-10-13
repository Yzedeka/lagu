import { useCallback, useEffect, useRef, useState } from 'react'

const API = '/api/downloads'

export interface RegisterResult {
  count: number
  /** True when the server rate-limited this request (no increment). */
  limited: boolean
}

export async function fetchDownloadCount(signal?: AbortSignal): Promise<number | null> {
  try {
    const res = await fetch(API, { headers: { accept: 'application/json' }, signal })
    if (!res.ok) return null
    const data = (await res.json()) as { count?: number }
    return typeof data.count === 'number' ? data.count : null
  } catch {
    return null
  }
}

export async function registerDownload(): Promise<RegisterResult | null> {
  try {
    const res = await fetch(API, { method: 'POST', headers: { accept: 'application/json' } })
    const data = (await res.json()) as { count?: number }
    if (typeof data.count !== 'number') return null
    return { count: data.count, limited: res.status === 429 }
  } catch {
    return null
  }
}

/**
 * Live download counter. Fetches the total on mount, refreshes periodically,
 * and increments when a download button is clicked (the server enforces a
 * 5-second window per visitor).
 */
export function useDownloadCount() {
  const [count, setCount] = useState<number | null>(null)
  const [limited, setLimited] = useState(false)
  const cooldown = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    let timer: number | undefined

    const load = async (): Promise<void> => {
      const value = await fetchDownloadCount(controller.signal)
      if (value != null) setCount(value)
    }

    void load()
    timer = window.setInterval(load, 30000)
    return () => {
      controller.abort()
      if (timer) window.clearInterval(timer)
    }
  }, [])

  const register = useCallback(async (): Promise<void> => {
    const now = Date.now()
    if (now < cooldown.current) {
      setLimited(true)
      return
    }
    cooldown.current = now + 5000
    const result = await registerDownload()
    if (result && !result.limited) {
      setCount(result.count)
      setLimited(false)
    } else if (result?.limited) {
      setLimited(true)
    }
  }, [])

  return { count, register, limited }
}
