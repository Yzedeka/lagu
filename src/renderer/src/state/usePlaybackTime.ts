import { useSyncExternalStore } from 'react'
import { engine } from '@renderer/player/engine'

// The playback position ticks several times a second. Keeping it in a tiny
// external store (instead of React state at the top of the tree) means only
// the components that actually show the time re-render on each tick.

let time = 0
const listeners = new Set<() => void>()

function set(next: number): void {
  if (next === time) return
  time = next
  listeners.forEach((cb) => cb())
}

const sync = (): void => set(engine.currentTime)
engine.on('time', sync)
engine.on('loaded', sync)

/** Reset the displayed position, e.g. when a new track starts loading. */
export function resetPlaybackTime(): void {
  set(0)
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

const getSnapshot = (): number => time

export function usePlaybackTime(): number {
  return useSyncExternalStore(subscribe, getSnapshot)
}
