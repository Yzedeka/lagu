import type { Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { ImageIcon, PlusIcon, QueueIcon } from '@renderer/icons'
import { VirtualList } from './VirtualList'
import { formatTime } from '@renderer/lib/format'

export const TRACK_ROW_HEIGHT = 44

function PlayingBars() {
  return (
    <span className="playing-bars" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  )
}

interface TrackListProps {
  tracks: Track[]
  onPlay: (index: number) => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  onFindCover?: (track: Track) => void
  onContextMenu?: (track: Track, x: number, y: number) => void
  currentTrackId?: string | null
  showAlbum?: boolean
  showArtwork?: boolean
  emptyMessage?: string
}

export function TrackList({
  tracks,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onFindCover,
  onContextMenu,
  currentTrackId,
  showAlbum = true,
  showArtwork = true,
  emptyMessage = 'Nothing here yet.'
}: TrackListProps) {
  return (
    <VirtualList
      items={tracks}
      rowHeight={TRACK_ROW_HEIGHT}
      className="track-list"
      getKey={(track, i) => `${track.id}:${i}`}
      empty={<div className="empty-state">{emptyMessage}</div>}
      renderRow={(track, index) => {
        const isCurrent = track.id === currentTrackId
        const subtitle = showAlbum ? track.artist : undefined
        return (
          <div
            className={`track-row ${isCurrent ? 'track-row--playing' : ''}`}
            onDoubleClick={() => onPlay(index)}
            onContextMenu={(e) => {
              if (!onContextMenu) return
              e.preventDefault()
              onContextMenu(track, e.clientX, e.clientY)
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onPlay(index)
            }}
          >
            <button
              type="button"
              className="track-row__hit"
              onClick={() => onPlay(index)}
              aria-label={`Play ${track.title}`}
            />
            <div className="track-num">
              {isCurrent ? <PlayingBars /> : <span>{index + 1}</span>}
            </div>
            {showArtwork && <AlbumArt trackId={track.id} className="track-art" iconSize={18} />}
            <div className="track-main">
              <span className="track-title" title={track.title}>
                {track.title}
              </span>
              {subtitle && (
                <span className="track-sub" title={track.artist}>
                  {track.artist}
                </span>
              )}
            </div>
            {showAlbum && (
              <div className="track-album" title={track.album}>
                {track.album}
              </div>
            )}
            <div className="track-dur">{formatTime(track.duration)}</div>
            <div className="track-actions">
              {onFindCover && !track.hasArtwork && (
                <button
                  type="button"
                  className="icon-btn"
                  title="Find cover online"
                  onClick={() => onFindCover(track)}
                >
                  <ImageIcon size={14} />
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                title="Play next"
                onClick={() => onPlayNext(track)}
              >
                <PlusIcon size={14} />
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Add to queue"
                onClick={() => onAddToQueue(track)}
              >
                <QueueIcon size={14} />
              </button>
            </div>
          </div>
        )
      }}
    />
  )
}
