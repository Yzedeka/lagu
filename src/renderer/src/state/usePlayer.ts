import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, QueueState, RepeatMode, Track } from '@shared/types'
import { engine } from '@renderer/player/engine'
import {
  currentId,
  makeQueue,
  moveItem,
  nextIndex,
  prevIndex,
  shuffleArray,
  unshuffleOrder
} from '@renderer/player/queue'

const api = window.lagu

export interface PlayerModel {
  queue: QueueState
  currentTrack: Track | null
  playing: boolean
  currentTime: number
  duration: number
  error: string | null
  playContext: (tracks: Track[], startIndex: number) => void
  playTrack: (track: Track) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  jumpTo: (index: number) => void
  playNext: (track: Track) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  moveInQueue: (from: number, to: number) => void
  clearQueue: () => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
}

export function usePlayer(
  resolve: (id: string) => Track | undefined,
  settings: AppSettings,
  update: (patch: Partial<AppSettings>) => void
): PlayerModel {
  const [queue, setQueue] = useState<QueueState>({ order: [], index: -1 })
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // Bumped by next/prev so moving to an entry with the same track id (repeat
  // all on a one-track queue, consecutive duplicates) still reloads it.
  const [advanceGen, setAdvanceGen] = useState(0)

  const queueRef = useRef(queue)
  queueRef.current = queue
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const resolveRef = useRef(resolve)
  resolveRef.current = resolve
  const autoplayRef = useRef(true)
  const loadedIdRef = useRef<string | null>(null)
  const loadedGenRef = useRef(0)
  const queueLoadedRef = useRef(false)

  const trackId = currentId(queue)
  const currentTrack = trackId ? resolve(trackId) ?? null : null
  const currentResolved = currentTrack != null

  // --- load the current queue entry into the engine -------------------------
  useEffect(() => {
    if (!trackId) {
      engine.stop()
      loadedIdRef.current = null
      return
    }
    if (trackId === loadedIdRef.current && advanceGen === loadedGenRef.current) return
    // A restored queue can arrive before the library; this re-runs once the
    // track resolves.
    const track = resolveRef.current(trackId)
    if (!track) return

    loadedIdRef.current = trackId
    loadedGenRef.current = advanceGen
    setError(null)
    setCurrentTime(0)
    setDuration(track.duration ?? 0)
    const autoplay = autoplayRef.current
    autoplayRef.current = true
    engine.load(track, autoplay).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to play this track.')
      setPlaying(false)
    })
  }, [trackId, advanceGen, currentResolved])

  // --- engine event bridge --------------------------------------------------
  const advance = useCallback((dir: 1 | -1) => {
    const q = queueRef.current
    const s = settingsRef.current
    const idx = dir === 1 ? nextIndex(q, s.repeat) : prevIndex(q, s.repeat)
    if (idx == null) {
      if (dir === 1) {
        engine.pause()
        setPlaying(false)
      }
      return
    }
    autoplayRef.current = true
    setQueue((prev) => ({ ...prev, index: idx }))
    setAdvanceGen((g) => g + 1)
  }, [])

  useEffect(() => {
    const offs = [
      engine.on('play', () => setPlaying(true)),
      engine.on('pause', () => setPlaying(false)),
      engine.on('time', () => setCurrentTime(engine.currentTime)),
      engine.on('duration', () => setDuration(engine.duration)),
      engine.on('loaded', () => {
        setDuration(engine.duration)
        setCurrentTime(engine.currentTime)
      }),
      engine.on('error', () => {
        setError('This file could not be played - unsupported format or unavailable source.')
        setPlaying(false)
      }),
      engine.on('ended', () => {
        if (settingsRef.current.repeat === 'one') {
          engine.seek(0)
          void engine.play().catch(() => undefined)
          return
        }
        advance(1)
      })
    ]
    return () => offs.forEach((off) => off())
  }, [advance])

  // --- apply volume/mute ----------------------------------------------------
  useEffect(() => {
    engine.setVolume(settings.volume)
    engine.setMuted(settings.muted)
  }, [settings.volume, settings.muted])

  // --- crossfade ------------------------------------------------------------
  const nextIdx = useMemo(() => {
    if (settings.repeat === 'one' || queue.order.length === 0) return null
    return nextIndex(queue, settings.repeat)
  }, [queue, settings.repeat])

  const nextIdxRef = useRef<number | null>(null)
  nextIdxRef.current = nextIdx

  const nextTrack = nextIdx != null ? resolve(queue.order[nextIdx]) ?? null : null
  const nextTrackId = nextTrack?.id ?? null

  useEffect(() => {
    engine.setCrossfade(settings.crossfade)
  }, [settings.crossfade])

  useEffect(() => {
    engine.set8D(settings.eightD)
  }, [settings.eightD])

  useEffect(() => {
    engine.setNextTrack(nextTrack)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextTrackId, settings.crossfade])

  useEffect(() => {
    return engine.onCrossfade((id) => {
      // The engine already switched playback; just move the queue pointer and
      // stop the load effect from restarting the track.
      loadedIdRef.current = id
      autoplayRef.current = true
      const idx = nextIdxRef.current
      if (idx != null) setQueue((prev) => ({ ...prev, index: idx }))
    })
  }, [])

  // --- restore + persist queue ---------------------------------------------
  useEffect(() => {
    void api.queue.load().then((saved) => {
      if (saved.order.length > 0) {
        autoplayRef.current = false
        setQueue(saved)
      }
      queueLoadedRef.current = true
    })
  }, [])

  useEffect(() => {
    if (!queueLoadedRef.current) return
    void api.queue.save(queue)
  }, [queue])

  const playContext = useCallback((tracks: Track[], startIndex: number) => {
    if (tracks.length === 0) return
    const ids = tracks.map((t) => t.id)
    const s = settingsRef.current
    const index = Math.max(0, Math.min(startIndex, ids.length - 1))
    autoplayRef.current = true
    setError(null)
    if (s.shuffle) {
      const selected = ids[index]
      const rest = ids.filter((_, i) => i !== index)
      setQueue({ order: [selected, ...shuffleArray(rest)], index: 0, original: ids })
    } else {
      setQueue(makeQueue(ids, index))
    }
  }, [])

  const playTrack = useCallback((track: Track) => {
    const q = queueRef.current
    const idx = q.order.indexOf(track.id)
    autoplayRef.current = true
    if (idx >= 0) {
      setQueue((prev) => ({ ...prev, index: idx }))
    } else {
      setQueue((prev) => ({ ...prev, order: [...prev.order, track.id], index: prev.order.length }))
    }
  }, [])

  const toggle = useCallback(() => {
    if (!currentId(queueRef.current)) return
    if (engine.paused) void engine.play().catch(() => undefined)
    else engine.pause()
  }, [])

  const next = useCallback(() => advance(1), [advance])

  const prev = useCallback(() => {
    if (engine.currentTime > 3) {
      engine.seek(0)
      return
    }
    advance(-1)
  }, [advance])

  const seek = useCallback((seconds: number) => {
    engine.seek(seconds)
    setCurrentTime(seconds)
  }, [])

  const jumpTo = useCallback((index: number) => {
    autoplayRef.current = true
    setQueue((prev) => ({ ...prev, index }))
  }, [])

  const playNext = useCallback((track: Track) => {
    setQueue((prev) => {
      if (prev.order.length === 0) {
        autoplayRef.current = true
        return makeQueue([track.id], 0)
      }
      const at = prev.index < 0 ? prev.order.length : prev.index + 1
      const order = [...prev.order]
      order.splice(at, 0, track.id)
      return { ...prev, order }
    })
  }, [])

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => {
      if (prev.order.length === 0) {
        autoplayRef.current = true
        return makeQueue([track.id], 0)
      }
      return { ...prev, order: [...prev.order, track.id] }
    })
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      if (index < 0 || index >= prev.order.length) return prev
      const order = prev.order.filter((_, i) => i !== index)
      let idx = prev.index
      if (index < prev.index) {
        idx -= 1
      } else if (index === prev.index) {
        loadedIdRef.current = null
        autoplayRef.current = true
        idx = order.length === 0 ? -1 : Math.min(idx, order.length - 1)
      }
      return { ...prev, order, index: idx }
    })
  }, [])

  const moveInQueue = useCallback((from: number, to: number) => {
    setQueue((prev) => {
      if (from === to) return prev
      const currentTrackId = prev.order[prev.index]
      const order = moveItem(prev.order, from, to)
      const index = currentTrackId ? order.indexOf(currentTrackId) : prev.index
      return { ...prev, order, index }
    })
  }, [])

  const clearQueue = useCallback(() => {
    engine.stop()
    loadedIdRef.current = null
    setPlaying(false)
    setQueue({ order: [], index: -1 })
  }, [])

  const setVolume = useCallback(
    (v: number) => update({ volume: Math.min(1, Math.max(0, v)) }),
    [update]
  )

  const toggleMute = useCallback(() => update({ muted: !settingsRef.current.muted }), [update])

  const toggleShuffle = useCallback(() => {
    const nextShuffle = !settingsRef.current.shuffle
    update({ shuffle: nextShuffle })
    if (nextShuffle) {
      setQueue((prev) => {
        const cur = prev.order[prev.index]
        if (!cur) return prev
        const rest = prev.order.filter((_, i) => i !== prev.index)
        return { order: [cur, ...shuffleArray(rest)], index: 0, original: prev.order }
      })
    } else {
      setQueue((prev) => {
        if (!prev.original) return prev
        const cur = prev.order[prev.index]
        const order = unshuffleOrder(prev.order, prev.original)
        const index = cur ? order.indexOf(cur) : prev.index
        return { order, index }
      })
    }
  }, [update])

  const cycleRepeat = useCallback(() => {
    const order: RepeatMode[] = ['off', 'all', 'one']
    const idx = order.indexOf(settingsRef.current.repeat)
    update({ repeat: order[(idx + 1) % order.length] })
  }, [update])

  return {
    queue,
    currentTrack,
    playing,
    currentTime,
    duration,
    error,
    playContext,
    playTrack,
    toggle,
    next,
    prev,
    seek,
    jumpTo,
    playNext,
    addToQueue,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat
  }
}
