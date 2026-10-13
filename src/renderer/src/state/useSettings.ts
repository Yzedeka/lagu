import { useCallback, useEffect, useState } from 'react'
import type { AppSettings } from '@shared/types'
import { defaultSettings } from '@renderer/state/defaults'

const api = window.lagu

export interface SettingsModel {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  reload: () => Promise<void>
  loaded: boolean
}

export function useSettings(): SettingsModel {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void api.settings.get().then((persisted) => {
      if (cancelled) return
      setSettings(persisted)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    void api.settings.set(patch)
  }, [])

  const reload = useCallback(async () => {
    setSettings(await api.settings.get())
  }, [])

  return { settings, update, reload, loaded }
}
