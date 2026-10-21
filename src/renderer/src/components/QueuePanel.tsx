import { useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { QueueMode, QueueState, Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { VirtualList } from './VirtualList'
import { CloseIcon, GripIcon, QueueIcon } from '@renderer/icons'
import { formatTime, formatTotalDuration } from '@renderer/lib/format'

// Must match the `.queue--normal/.queue--compact .queue-row` heights in global.css.
const ROW_HEIGHT = 34
const COMPACT_ROW_HEIGHT = 28

type QueueEntry = { id: string; index: number; track: Track }

interface QueuePanelProps {
  queue: QueueState
  resolve: (id: string) => Track | undefined
  width: number
  mode: QueueMode
  onResize: (width: number) => void
  onResizeEnd: (width: number) => void
  onJump: (index: number) => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
}

export function QueuePanel({
  queue,
  resolve,
  width,
  mode,
  onResize,
  onResizeEnd,
  onJump,
  onRemove,
  onMove
}: QueuePanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const startX = useRef(0)
  const startWidth = useRef(width)

  const clamp = (value: number): number => Math.min(560, Math.max(140, value))
  const narrow = width < 180

  const beginResize = (e: ReactPointerEvent): void => {
    e.preventDefault()
    startX.current = e.clientX
    startWidth.current = Math.max(140, width)
    const move = (ev: PointerEvent): void => {
      onResize(clamp(startWidth.current - (ev.clientX - startX.current)))
    }
    const up = (ev: PointerEvent): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onResizeEnd(clamp(startWidth.current - (ev.clientX - startX.current)))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const items = useMemo(
    () =>
      queue.order
        .map((id, index) => ({ id, index, track: resolve(id) }))
        .filter((entry): entry is QueueEntry => Boolean(entry.track)),
    [queue.order, resolve]
  )

  const total = useMemo(
    () => items.reduce((sum, entry) => sum + (entry.track.duration ?? 0), 0),
    [items]
  )

  const handleDrop = (event: DragEvent, to: number): void => {
    event.preventDefault()
    if (dragIndex != null && dragIndex !== to) onMove(dragIndex, to)
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <aside
      className={`queue queue--${mode}`}
      style={{ width: Math.max(140, width) }}
      data-narrow={narrow ? 'true' : undefined}
    >
      <div
        className="queue__resizer"
        title="Drag to resize"
        onPointerDown={beginResize}
        role="separator"
        aria-orientation="vertical"
      />
      <header className="queue__header">
        <span className="queue__title">
          <QueueIcon size={14} className="queue__icon" />
          <span className="queue__label">Up Next</span>
        </span>
        <span className="queue__total">{formatTotalDuration(total)}</span>
      </header>

      {items.length === 0 ? (
        <div className="queue__list">
          <div className="empty-state">Queue is empty.</div>
        </div>
      ) : (
        <VirtualList
          className="queue__list"
          items={items}
          rowHeight={mode === 'compact' ? COMPACT_ROW_HEIGHT : ROW_HEIGHT}
          getKey={(entry) => `${entry.id}:${entry.index}`}
          renderRow={(entry) => {
            const isCurrent = entry.index === queue.index
            return (
              <div
                className={`queue-row ${isCurrent ? 'queue-row--current' : ''} ${
                  overIndex === entry.index && dragIndex !== entry.index ? 'queue-row--over' : ''
                }`}
                draggable
                onDragStart={() => setDragIndex(entry.index)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOverIndex(entry.index)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                onDrop={(e) => handleDrop(e, entry.index)}
                onClick={() => onJump(entry.index)}
              >
                <span className="queue-grip" title="Drag to reorder">
                  <GripIcon size={14} />
                </span>
                <AlbumArt trackId={entry.track.id} className="queue-art" iconSize={14} />
                <div className="queue-main">
                  <span className="queue-title-text">{entry.track.title}</span>
                  <span className="queue-sub">{entry.track.artist}</span>
                </div>
                <span className="queue-dur">{formatTime(entry.track.duration)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  title="Remove from queue"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(entry.index)
                  }}
                >
                  <CloseIcon size={13} />
                </button>
              </div>
            )
          }}
        />
      )}
    </aside>
  )
}
