import type { Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { PlusIcon, QueueIcon } from '@renderer/icons'
import { formatTime } from '@renderer/lib/format'

interface SongGridProps {
  tracks: Track[]
  onPlay: (index: number) => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  onContextMenu?: (track: Track, x: number, y: number) => void
  currentTrackId?: string | null
  emptyMessage?: string
}

function PlayingBars() {
  return (
    <span className="playing-bars" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  )
}

export function SongGrid({
  tracks,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onContextMenu,
  currentTrackId,
  emptyMessage = 'No songs yet.'
}: SongGridProps) {
  if (tracks.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>
  }

  return (
    <div className="song-grid">
      {tracks.map((track, index) => {
        const isCurrent = track.id === currentTrackId
        return (
          <div
            key={`${track.id}:${index}`}
            className={`song-tile ${isCurrent ? 'song-tile--playing' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onPlay(index)}
            onContextMenu={(e) => {
              if (!onContextMenu) return
              e.preventDefault()
              onContextMenu(track, e.clientX, e.clientY)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onPlay(index)
            }}
          >
            <div className="song-tile__art">
              <AlbumArt trackId={track.id} className="song-tile__img" iconSize={30} />
              {isCurrent && (
                <span className="song-tile__now">
                  <PlayingBars />
                </span>
              )}
              <div className="song-tile__actions">
                <button
                  type="button"
                  className="song-tile__btn"
                  title="Play next"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayNext(track)
                  }}
                >
                  <PlusIcon size={14} />
                </button>
                <button
                  type="button"
                  className="song-tile__btn"
                  title="Add to queue"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddToQueue(track)
                  }}
                >
                  <QueueIcon size={14} />
                </button>
              </div>
            </div>
            <div className="song-tile__text">
              <span className="song-tile__title" title={track.title}>
                {track.title}
              </span>
              <span className="song-tile__sub" title={track.artist}>
                {track.artist}
              </span>
            </div>
            <span className="song-tile__dur">{formatTime(track.duration)}</span>
          </div>
        )
      })}
    </div>
  )
}
