import { useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { QueueState, Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { CloseIcon, GripIcon, QueueIcon } from '@renderer/icons'
import { formatTime, formatTotalDuration } from '@renderer/lib/format'

interface QueuePanelProps {
  queue: QueueState
  resolve: (id: string) => Track | undefined
  width: number
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

  const clamp = (value: number): number => Math.min(560, Math.max(120, value))

  const beginResize = (e: ReactPointerEvent): void => {
    e.preventDefault()
    startX.current = e.clientX
    startWidth.current = width
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

  const items = queue.order
    .map((id, index) => ({ id, index, track: resolve(id) }))
    .filter((entry): entry is { id: string; index: number; track: Track } => Boolean(entry.track))

  const total = items.reduce((sum, entry) => sum + (entry.track.duration ?? 0), 0)

  const handleDrop = (event: DragEvent, to: number): void => {
    event.preventDefault()
    if (dragIndex != null && dragIndex !== to) onMove(dragIndex, to)
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <aside className="queue" style={{ width }}>
      <div
        className="queue__resizer"
        title="Drag to resize"
        onPointerDown={beginResize}
        role="separator"
        aria-orientation="vertical"
      />
      <header className="queue__header">
        <span className="queue__title">
          <QueueIcon size={14} /> Up Next
        </span>
      </header>

      <div className="queue__list">
        {items.length === 0 && <div className="empty-state">Queue is empty.</div>}
        {items.map((entry) => {
          const isCurrent = entry.index === queue.index
          return (
            <div
              key={`${entry.id}:${entry.index}`}
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
        })}
      </div>

      <footer className="queue__footer">{formatTotalDuration(total)}</footer>
    </aside>
  )
}
