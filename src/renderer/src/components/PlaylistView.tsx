import { useEffect, useMemo, useState } from 'react'
import type { Playlist, Track } from '@shared/types'
import { PlaylistArt } from './PlaylistArt'
import { EditIcon, PauseIcon, PlayIcon, TrashIcon } from '@renderer/icons'
import { TrackList } from './TrackList'
import { formatTotalDuration } from '@renderer/lib/format'

interface PlaylistViewProps {
  playlist: Playlist
  tracks: Track[]
  playing: boolean
  currentTrackId: string | null
  onPlayContext: (tracks: Track[], index: number) => void
  onToggle: () => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  onFindCover?: (track: Track) => void
  onTrackContextMenu: (track: Track, x: number, y: number) => void
  onRename: (name: string) => void
  onDelete: () => void
}

export function PlaylistView({
  playlist,
  tracks,
  playing,
  currentTrackId,
  onPlayContext,
  onToggle,
  onPlayNext,
  onAddToQueue,
  onFindCover,
  onTrackContextMenu,
  onRename,
  onDelete
}: PlaylistViewProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(playlist.name)

  useEffect(() => {
    setDraft(playlist.name)
    setEditing(false)
  }, [playlist.id, playlist.name])

  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks])
  const total = tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0)
  const playingHere = playing && tracks.some((t) => t.id === currentTrackId)

  const save = (): void => {
    onRename(draft)
    setEditing(false)
  }

  return (
    <div className="profile">
      <header className="profile__hero">
        <PlaylistArt playlist={playlist} byId={byId} className="profile__art" iconSize={56} />

        <div className="profile__info">
          <div className="profile__kind">Playlist</div>
          {editing ? (
            <input
              className="text-input playlist__name-input"
              value={draft}
              autoFocus
              spellCheck={false}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') {
                  setDraft(playlist.name)
                  setEditing(false)
                }
              }}
            />
          ) : (
            <h1 className="profile__name">
              {playlist.name}
              <button
                type="button"
                className="icon-btn"
                title="Rename playlist"
                onClick={() => setEditing(true)}
              >
                <EditIcon size={15} />
              </button>
            </h1>
          )}
          <div className="profile__meta">
            {tracks.length} track{tracks.length === 1 ? '' : 's'}
            {tracks.length > 0 ? ` · ${formatTotalDuration(total)}` : ''}
          </div>

          <div className="profile__actions">
            <button
              type="button"
              className="play-btn"
              title={playingHere ? 'Pause' : 'Play playlist'}
              disabled={tracks.length === 0}
              onClick={() => (playingHere ? onToggle() : onPlayContext(tracks, 0))}
            >
              {playingHere ? <PauseIcon size={21} /> : <PlayIcon size={21} />}
            </button>
            <button
              type="button"
              className="ghost-btn ghost-btn--danger"
              title="Delete playlist"
              onClick={onDelete}
            >
              <TrashIcon size={14} /> Delete
            </button>
          </div>
        </div>
      </header>

      <div className="profile__body">
        <TrackList
          tracks={tracks}
          currentTrackId={currentTrackId}
          showAlbum
          onPlay={(i) => onPlayContext(tracks, i)}
          onPlayNext={onPlayNext}
          onAddToQueue={onAddToQueue}
          onFindCover={onFindCover}
          onContextMenu={onTrackContextMenu}
          emptyMessage="This playlist is empty. Right-click a track and choose “Add to playlist…”."
        />
      </div>
    </div>
  )
}
