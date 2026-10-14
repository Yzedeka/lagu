import { useMemo, useState } from 'react'
import type { Track } from '@shared/types'
import type { Album } from '@renderer/lib/album'
import { AlbumArt } from './AlbumArt'
import { PauseIcon, PlayIcon } from '@renderer/icons'
import { SearchBar } from './SearchBar'
import { TrackList } from './TrackList'
import { formatTotalDuration } from '@renderer/lib/format'

interface AlbumViewProps {
  album: Album
  playing: boolean
  currentTrackId: string | null
  onPlayContext: (tracks: Track[], index: number) => void
  onToggle: () => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  onFindCover?: (track: Track) => void
  onContextMenu: (track: Track, x: number, y: number) => void
  onOpenArtist: (name: string) => void
}

export function AlbumView({
  album,
  playing,
  currentTrackId,
  onPlayContext,
  onToggle,
  onPlayNext,
  onAddToQueue,
  onFindCover,
  onContextMenu,
  onOpenArtist
}: AlbumViewProps) {
  const [query, setQuery] = useState('')
  const artTrack = album.tracks.find((t) => t.hasArtwork) ?? album.tracks[0]
  const playingHere = playing && album.tracks.some((t) => t.id === currentTrackId)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return album.tracks
    return album.tracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    )
  }, [album.tracks, query])

  return (
    <div className="profile">
      <header className="profile__hero">
        <AlbumArt trackId={artTrack?.id} className="profile__art" iconSize={56} />
        <div className="profile__info">
          <div className="profile__kind">Album</div>
          <h1 className="profile__name">{album.name}</h1>
          <div className="profile__meta">
            <button
              type="button"
              className="profile__artist-link"
              onClick={() => onOpenArtist(album.artist)}
            >
              {album.artist}
            </button>
            {album.year ? ` · ${album.year}` : ''} · {album.tracks.length} track
            {album.tracks.length === 1 ? '' : 's'} · {formatTotalDuration(album.duration)}
          </div>
          <div className="profile__actions">
            <button
              type="button"
              className="play-btn"
              title={playingHere ? 'Pause' : 'Play album'}
              disabled={album.tracks.length === 0}
              onClick={() => (playingHere ? onToggle() : onPlayContext(album.tracks, 0))}
            >
              {playingHere ? <PauseIcon size={21} /> : <PlayIcon size={21} />}
            </button>
          </div>
        </div>
      </header>

      <div className="profile__toolbar">
        <SearchBar
          value={query}
          placeholder="Search this album…"
          compact
          onChange={setQuery}
          onSubmit={() => undefined}
          onClear={() => setQuery('')}
        />
        <span className="profile__count">
          {filtered.length} track{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="profile__body">
        <TrackList
          tracks={filtered}
          currentTrackId={currentTrackId}
          showAlbum={false}
          showArtwork={false}
          onPlay={(i) => onPlayContext(filtered, i)}
          onPlayNext={onPlayNext}
          onAddToQueue={onAddToQueue}
          onFindCover={onFindCover}
          onContextMenu={onContextMenu}
          emptyMessage={query ? 'No matching tracks.' : 'No tracks.'}
        />
      </div>
    </div>
  )
}
