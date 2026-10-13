import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/types'

const api = window.lagu

/** Live auto-update status from the main process. */
export function useUpdater(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>({ phase: 'idle' })

  useEffect(() => {
    let cancelled = false
    void api.update.get().then((initial) => {
      if (!cancelled) setStatus(initial)
    })
    const off = api.update.onStatus(setStatus)
    return () => {
      cancelled = true
      off()
    }
  }, [])

  return status
}
