import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AddUrlResult, LibraryFolder, PinnedItem, ScanError, ScanProgress, Track, UnsupportedFile } from '@shared/types'
import { compareTracks } from '@shared/sort'
import { bumpArtworkVersion } from '@renderer/state/useArtwork'

const api = window.lagu

/** Scan batches arriving within this window are merged into one re-sort. */
const BATCH_FLUSH_MS = 250

export interface LibraryModel {
  tracks: Track[]
  byId: Map<string, Track>
  folders: LibraryFolder[]
  scanning: boolean
  progress: ScanProgress | null
  unsupported: UnsupportedFile[]
  errors: ScanError[]
  artworkProgress: { done: number; total: number } | null
  hiddenCount: number
  pinned: PinnedItem[]
  addFolder: () => Promise<string | null>
  removeFolder: (id: string) => Promise<void>
  rescan: (folderId?: string) => Promise<void>
  addUrl: (url: string) => Promise<AddUrlResult>
  fetchArtwork: (trackId: string) => Promise<void>
  fetchMissingArtwork: () => Promise<number>
  removeTracks: (trackIds: string[]) => Promise<void>
  trashTracks: (trackIds: string[]) => Promise<number>
  restoreHidden: () => Promise<void>
  setPinned: (pinned: PinnedItem[]) => Promise<void>
}

export function useLibrary(): LibraryModel {
  const [tracks, setTracks] = useState<Track[]>([])
  const [folders, setFolders] = useState<LibraryFolder[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [unsupported, setUnsupported] = useState<UnsupportedFile[]>([])
  const [errors, setErrors] = useState<ScanError[]>([])
  const [artworkProgress, setArtworkProgress] = useState<{ done: number; total: number } | null>(null)
  const [hiddenCount, setHiddenCount] = useState(0)
  const [pinned, setPinnedState] = useState<PinnedItem[]>([])

  // Merge incoming tracks by id, keeping a canonical sort order.
  const mergeTracks = useCallback((incoming: Track[]) => {
    setTracks((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]))
      for (const track of incoming) map.set(track.id, track)
      return [...map.values()].sort(compareTracks)
    })
  }, [])

  // Buffer scan batches so a large scan re-sorts the library a few times a
  // second instead of once per 25-track batch.
  const pendingRef = useRef<Track[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushPending = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = null
    const incoming = pendingRef.current
    pendingRef.current = []
    if (incoming.length > 0) mergeTracks(incoming)
  }, [mergeTracks])

  const dropPending = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = null
    pendingRef.current = []
  }, [])

  useEffect(() => {
    let cancelled = false
    void api.library.state().then((state) => {
      if (cancelled) return
      setFolders(state.folders)
      setTracks([...state.tracks].sort(compareTracks))
      setScanning(state.scanning)
      setHiddenCount(state.hiddenCount)
      setPinnedState(state.pinned ?? [])
    })

    const offProgress = api.events.onProgress((p) => {
      setProgress(p)
      setScanning(p.scanning)
    })
    const offBatch = api.events.onBatch((batch) => {
      pendingRef.current.push(...batch.tracks)
      if (!flushTimerRef.current) flushTimerRef.current = setTimeout(flushPending, BATCH_FLUSH_MS)
    })
    const offDone = api.events.onDone((done) => {
      // The full state fetched below supersedes anything still buffered.
      dropPending()
      setScanning(false)
      setProgress(null)
      setUnsupported(done.unsupported)
      setErrors(done.errors)
      // Re-sync folders/tracks in case the scan was started outside the hook.
      bumpArtworkVersion()
      void api.library.state().then((state) => {
        setFolders(state.folders)
        setTracks([...state.tracks].sort(compareTracks))
      })
    })
    const offRefresh = api.events.onRefresh(() => {
      // Filesystem watcher / artwork lookups - pull fresh state. Any queued
      // batch is older than this snapshot.
      dropPending()
      bumpArtworkVersion()
      void api.library.state().then((state) => {
        setFolders(state.folders)
        setTracks([...state.tracks].sort(compareTracks))
        setHiddenCount(state.hiddenCount)
        setPinnedState(state.pinned ?? [])
      })
    })
    const offArtwork = api.events.onArtworkProgress((p) => {
      setArtworkProgress(p.done >= p.total ? null : p)
    })

    return () => {
      cancelled = true
      offProgress()
      offBatch()
      offDone()
      offRefresh()
      offArtwork()
      dropPending()
    }
  }, [flushPending, dropPending])

  const addFolder = useCallback(async () => {
    const picked = await api.library.pickFolder()
    if (!picked) return null
    const folder = await api.library.addFolder(picked)
    if (folder) setFolders((prev) => (prev.some((f) => f.id === folder.id) ? prev : [...prev, folder]))
    return picked
  }, [])

  const removeFolder = useCallback(async (id: string) => {
    const folder = folders.find((f) => f.id === id)
    const next = await api.library.removeFolder(id)
    setFolders(next)
    if (folder) {
      setTracks((prev) => prev.filter((t) => t.folder !== folder.path))
    }
  }, [folders])

  const rescan = useCallback(async (folderId?: string) => {
    setErrors([])
    await api.library.rescan(folderId)
  }, [])

  const addUrl = useCallback(
    async (url: string) => {
      const result = await api.library.addUrl(url)
      if (result.ok && result.track) mergeTracks([result.track])
      return result
    },
    [mergeTracks]
  )

  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks])

  const fetchArtwork = useCallback(async (trackId: string) => {
    await api.artwork.fetch(trackId)
    bumpArtworkVersion()
  }, [])

  const fetchMissingArtwork = useCallback(async () => {
    const count = await api.artwork.fetchMissing()
    return count
  }, [])

  const removeTracks = useCallback(async (trackIds: string[]) => {
    await api.library.remove(trackIds)
  }, [])

  const trashTracks = useCallback(async (trackIds: string[]) => {
    return api.library.trash(trackIds)
  }, [])

  const restoreHidden = useCallback(async () => {
    await api.library.restoreHidden()
  }, [])

  const setPinned = useCallback(async (next: PinnedItem[]) => {
    setPinnedState(next)
    await api.pins.set(next)
  }, [])

  return {
    tracks,
    byId,
    folders,
    scanning,
    progress,
    unsupported,
    errors,
    artworkProgress,
    hiddenCount,
    pinned,
    addFolder,
    removeFolder,
    rescan,
    addUrl,
    fetchArtwork,
    fetchMissingArtwork,
    removeTracks,
    trashTracks,
    restoreHidden,
    setPinned
  }
}
