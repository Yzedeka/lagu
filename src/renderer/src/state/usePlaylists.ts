import { useCallback, useEffect, useState } from 'react'
import type { Playlist } from '@shared/types'

const api = window.lagu

export interface PlaylistsModel {
  playlists: Playlist[]
  create: (name: string, trackIds?: string[]) => Playlist
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  addTracks: (id: string, trackIds: string[]) => void
  removeTrack: (id: string, trackId: string) => void
  find: (id: string) => Playlist | undefined
}

export function usePlaylists(): PlaylistsModel {
  const [playlists, setPlaylists] = useState<Playlist[]>([])

  useEffect(() => {
    let cancelled = false
    void api.playlists.get().then((saved) => {
      if (!cancelled) setPlaylists(saved ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const mutate = useCallback((fn: (prev: Playlist[]) => Playlist[]) => {
    setPlaylists((prev) => {
      const next = fn(prev)
      void api.playlists.set(next)
      return next
    })
  }, [])

  const create = useCallback(
    (name: string, trackIds: string[] = []): Playlist => {
      const playlist: Playlist = {
        id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim() || 'New Playlist',
        trackIds,
        createdAt: Date.now()
      }
      mutate((prev) => [...prev, playlist])
      return playlist
    },
    [mutate]
  )

  const rename = useCallback(
    (id: string, name: string) => {
      mutate((prev) => prev.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)))
    },
    [mutate]
  )

  const remove = useCallback(
    (id: string) => {
      mutate((prev) => prev.filter((p) => p.id !== id))
    },
    [mutate]
  )

  const addTracks = useCallback(
    (id: string, trackIds: string[]) => {
      mutate((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, trackIds: [...p.trackIds, ...trackIds.filter((t) => !p.trackIds.includes(t))] }
            : p
        )
      )
    },
    [mutate]
  )

  const removeTrack = useCallback(
    (id: string, trackId: string) => {
      mutate((prev) =>
        prev.map((p) => (p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p))
      )
    },
    [mutate]
  )

  const find = useCallback((id: string) => playlists.find((p) => p.id === id), [playlists])

  return { playlists, create, rename, remove, addTracks, removeTrack, find }
}
