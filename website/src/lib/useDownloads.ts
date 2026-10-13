import { useCallback, useEffect, useRef, useState } from 'react'

const API = '/api/downloads'

export interface DownloadState {
  count: number
  files: Record<string, number>
}

export interface RegisterResult extends DownloadState {
  /** True when the server rate-limited this request (no increment). */
  limited: boolean
}

async function readState(signal?: AbortSignal): Promise<DownloadState | null> {
  try {
    const res = await fetch(API, { headers: { accept: 'application/json' }, signal })
    if (!res.ok) return null
    const data = (await res.json()) as { count?: number; files?: Record<string, number> }
    if (typeof data.count !== 'number') return null
    return { count: data.count, files: data.files ?? {} }
  } catch {
    return null
  }
}

/** Count a download (optionally for a specific file). */
export async function registerDownload(file?: string): Promise<RegisterResult | null> {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ file: file ?? '' })
    })
    const data = (await res.json()) as { count?: number; files?: Record<string, number> }
    if (typeof data.count !== 'number') return null
    return { count: data.count, files: data.files ?? {}, limited: res.status === 429 }
  } catch {
    return null
  }
}

/**
 * Live download counter. Fetches the total and per-file counts on mount,
 * refreshes periodically, and increments on download clicks (the server
 * enforces a 5-second window per visitor).
 */
export function useDownloadCount() {
  const [count, setCount] = useState<number | null>(null)
  const [files, setFiles] = useState<Record<string, number>>({})
  const [limited, setLimited] = useState(false)
  const cooldown = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    let timer: number | undefined

    const load = async (): Promise<void> => {
      const state = await readState(controller.signal)
      if (state) {
        setCount(state.count)
        setFiles(state.files)
      }
    }

    void load()
    timer = window.setInterval(load, 30000)
    return () => {
      controller.abort()
      if (timer) window.clearInterval(timer)
    }
  }, [])

  const register = useCallback(async (file?: string): Promise<void> => {
    const now = Date.now()
    if (now < cooldown.current) {
      setLimited(true)
      return
    }
    cooldown.current = now + 5000
    const result = await registerDownload(file)
    if (result && !result.limited) {
      setCount(result.count)
      setFiles(result.files)
      setLimited(false)
    } else if (result?.limited) {
      setLimited(true)
    }
  }, [])

  return { count, files, register, limited }
}
