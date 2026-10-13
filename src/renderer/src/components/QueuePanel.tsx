import { useState, type DragEvent } from 'react'
import type { QueueState, Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { CloseIcon, GripIcon, QueueIcon, TrashIcon } from '@renderer/icons'
import { formatTime, formatTotalDuration } from '@renderer/lib/format'

interface QueuePanelProps {
  queue: QueueState
  resolve: (id: string) => Track | undefined
  onJump: (index: number) => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
  onClear: () => void
  onClose: () => void
}

export function QueuePanel({ queue, resolve, onJump, onRemove, onMove, onClear, onClose }: QueuePanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

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
    <aside className="queue">
      <header className="queue__header">
        <span className="queue__title">
          <QueueIcon size={14} /> Up Next
        </span>
        <div className="queue__header-actions">
          {queue.order.length > 0 && (
            <button type="button" className="icon-btn" title="Clear queue" onClick={onClear}>
              <TrashIcon size={14} />
            </button>
          )}
          <button type="button" className="icon-btn" title="Hide queue" onClick={onClose}>
            <CloseIcon size={14} />
          </button>
        </div>
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

      <footer className="queue__footer">
        {items.length} track{items.length === 1 ? '' : 's'} · {formatTotalDuration(total)}
      </footer>
    </aside>
  )
}
