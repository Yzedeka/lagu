import type { QueueState, RepeatMode } from '@shared/types'

export function currentId(queue: QueueState): string | null {
  if (queue.index < 0 || queue.index >= queue.order.length) return null
  return queue.order[queue.index] ?? null
}

/**
 * Index to play after the current one, or null to stop. Shuffle is applied to
 * `order` itself when it is turned on, so stepping is linear in both modes.
 */
export function nextIndex(queue: QueueState, repeat: RepeatMode): number | null {
  const { index, order } = queue
  if (order.length === 0) return null
  if (index + 1 < order.length) return index + 1
  return repeat === 'all' ? 0 : null
}

/** Index to play before the current one, or null to stay. */
export function prevIndex(queue: QueueState, repeat: RepeatMode): number | null {
  const { index, order } = queue
  if (order.length === 0) return null
  if (index - 1 >= 0) return index - 1
  return repeat === 'all' ? order.length - 1 : null
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Puts a shuffled queue back into its pre-shuffle order. Tracks removed since
 * shuffling stay removed, and tracks added since keep their place at the end.
 */
export function unshuffleOrder(order: string[], original: string[]): string[] {
  const remaining = new Map<string, number>()
  for (const id of order) remaining.set(id, (remaining.get(id) ?? 0) + 1)
  const restored: string[] = []
  for (const id of original) {
    const left = remaining.get(id) ?? 0
    if (left === 0) continue
    restored.push(id)
    remaining.set(id, left - 1)
  }
  for (const id of order) {
    const left = remaining.get(id) ?? 0
    if (left === 0) continue
    restored.push(id)
    remaining.set(id, left - 1)
  }
  return restored
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }
  const copy = [...items]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function makeQueue(order: string[], index: number): QueueState {
  return { order: [...order], index }
}
