import { useEffect, useRef, useState, type ReactNode } from 'react'

interface VirtualListProps<T> {
  items: T[]
  rowHeight: number
  renderRow: (item: T, index: number) => ReactNode
  getKey: (item: T, index: number) => string
  overscan?: number
  className?: string
  empty?: ReactNode
}

/**
 * Minimal fixed-height virtual list. Keeps rendering cheap even with tens of
 * thousands of tracks, which matters while a scan is streaming in.
 */
export function VirtualList<T>({
  items,
  rowHeight,
  renderRow,
  getKey,
  overscan = 8,
  className,
  empty
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setHeight(el.clientHeight))
    observer.observe(el)
    setHeight(el.clientHeight)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // Reset scroll when the list identity changes dramatically.
    if (items.length === 0) setScrollTop(0)
  }, [items.length])

  const total = items.length * rowHeight
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const visibleCount = Math.ceil((height || 0) / rowHeight) + overscan * 2
  const end = Math.min(items.length, start + visibleCount)
  const slice = items.slice(start, end)

  return (
    <div
      ref={containerRef}
      className={`vlist ${className ?? ''}`}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {items.length === 0 ? (
        <div className="vlist-empty">{empty}</div>
      ) : (
        <div className="vlist-inner" style={{ height: total }}>
          {slice.map((item, i) => {
            const index = start + i
            return (
              <div
                key={getKey(item, index)}
                className="vlist-row"
                style={{ height: rowHeight, top: index * rowHeight }}
              >
                {renderRow(item, index)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
