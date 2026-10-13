import { createContext, useContext, type ReactNode } from 'react'
import { useDownloadCount } from './useDownloads'

type Value = ReturnType<typeof useDownloadCount>

const Ctx = createContext<Value | null>(null)

export function DownloadProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useDownloadCount()}>{children}</Ctx.Provider>
}

export function useDownloads(): Value {
  const value = useContext(Ctx)
  if (!value) throw new Error('useDownloads used outside DownloadProvider')
  return value
}

export function formatCount(value: number | null): string {
  return value == null ? '-' : value.toLocaleString('en-US')
}
