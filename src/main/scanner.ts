import { promises as fs, type Dirent } from 'node:fs'
import path from 'node:path'

export interface WalkEntry {
  path: string
  size: number
}

/**
 * Depth-first directory walk that yields audio-ish files. Hidden entries and
 * symlinked directories are skipped to avoid surprising scans and link loops.
 */
export async function* walkFiles(
  root: string,
  onDiscovered?: (count: number) => void
): AsyncGenerator<WalkEntry> {
  const stack: string[] = [root]
  let discovered = 0

  while (stack.length > 0) {
    const dir = stack.pop() as string
    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.isFile()) {
        discovered += 1
        onDiscovered?.(discovered)
        yield { path: full, size: 0 }
      } else if (entry.isSymbolicLink()) {
        // Resolve file symlinks but never recurse into directory symlinks.
        try {
          const stat = await fs.stat(full)
          if (stat.isFile()) {
            discovered += 1
            onDiscovered?.(discovered)
            yield { path: full, size: stat.size }
          }
        } catch {
          /* dangling symlink */
        }
      }
    }
  }
}

/** Run `worker` over `items` with bounded concurrency. */
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const runners = new Array(Math.min(limit, items.length || 1)).fill(0).map(async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}
