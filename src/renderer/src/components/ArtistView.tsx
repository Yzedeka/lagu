import { useEffect, useMemo, useState } from 'react'
import type { Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { ArtistIcon, EditIcon, PauseIcon, PlayIcon } from '@renderer/icons'
import { SearchBar } from './SearchBar'
import { AlbumGrid } from './AlbumGrid'
import { TrackList } from './TrackList'
import { useArtistImage } from '@renderer/state/useArtistImage'
import { buildAlbums, sortAlbums, type Album } from '@renderer/lib/album'
import { formatTotalDuration } from '@renderer/lib/format'

const api = window.lagu

interface ArtistViewProps {
  name: string
  tracks: Track[]
  playing: boolean
  currentTrackId: string | null
  onPlayContext: (tracks: Track[], index: number) => void
  onToggle: () => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  onFindCover?: (track: Track) => void
  onContextMenu: (track: Track, x: number, y: number) => void
  onAlbumContextMenu: (album: Album, x: number, y: number) => void
  onOpenAlbum: (album: Album) => void
}

export function ArtistView({
  name,
  tracks,
  playing,
  currentTrackId,
  onPlayContext,
  onToggle,
  onPlayNext,
  onAddToQueue,
  onFindCover,
  onContextMenu,
  onAlbumContextMenu,
  onOpenAlbum
}: ArtistViewProps) {
  const image = useArtistImage(name)
  const [bio, setBio] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [tab, setTab] = useState<'albums' | 'tracks'>('albums')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    void api.artists.getBio(name).then((value) => {
      if (cancelled) return
      setBio(value)
      setDraft(value)
      setEditing(false)
    })
    return () => {
      cancelled = true
    }
  }, [name])

  const albums = useMemo(() => sortAlbums(buildAlbums(tracks), 'year', false), [tracks])
  const total = tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0)
  const artTrack = tracks.find((t) => t.hasArtwork) ?? tracks[0]
  const playingHere = playing && tracks.some((t) => t.id === currentTrackId)

  const q = query.trim().toLowerCase()
  const filteredAlbums = q
    ? albums.filter(
        (a) => a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
      )
    : albums
  const filteredTracks = q
    ? tracks.filter(
        (t) => t.title.toLowerCase().includes(q) || t.album.toLowerCase().includes(q)
      )
    : tracks

  const save = async (): Promise<void> => {
    const value = await api.artists.setBio(name, draft)
    setBio(value)
    setEditing(false)
  }

  return (
    <div className="profile">
      <header className="profile__hero">
        {image ? (
          <img className="profile__art profile__art--round art" src={image} alt="" draggable={false} />
        ) : artTrack ? (
          <AlbumArt trackId={artTrack.id} className="profile__art profile__art--round" iconSize={56} />
        ) : (
          <div className="profile__art profile__art--round art--fallback">
            <ArtistIcon size={56} />
          </div>
        )}

        <div className="profile__info">
          <div className="profile__kind">Artist</div>
          <h1 className="profile__name">{name}</h1>
          <div className="profile__meta">
            {tracks.length} track{tracks.length === 1 ? '' : 's'} - {albums.length} album
            {albums.length === 1 ? '' : 's'} - {formatTotalDuration(total)}
          </div>

          <div className="profile__actions">
            <button
              type="button"
              className="play-btn"
              title={playingHere ? 'Pause' : 'Play'}
              disabled={tracks.length === 0}
              onClick={() => (playingHere ? onToggle() : onPlayContext(tracks, 0))}
            >
              {playingHere ? <PauseIcon size={21} /> : <PlayIcon size={21} />}
            </button>
          </div>

          <div className="profile__bio">
            {editing ? (
              <div className="profile__bio-edit">
                <textarea
                  className="text-input"
                  rows={3}
                  value={draft}
                  placeholder="Write a short bio for this artist…"
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="profile__bio-actions">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setDraft(bio)
                      setEditing(false)
                    }}
                  >
                    Cancel
                  </button>
                  <button type="button" className="primary-btn" onClick={() => void save()}>
                    Save
                  </button>
                </div>
              </div>
            ) : bio ? (
              <div className="profile__bio-text">
                <p>{bio}</p>
                <button type="button" className="icon-btn" title="Edit bio" onClick={() => setEditing(true)}>
                  <EditIcon size={15} />
                </button>
              </div>
            ) : (
              <button type="button" className="ghost-btn" onClick={() => setEditing(true)}>
                <EditIcon size={14} /> Add a bio
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="profile__toolbar">
        <div className="segmented">
          <button
            type="button"
            className={tab === 'albums' ? 'button--active' : ''}
            onClick={() => setTab('albums')}
          >
            Albums
          </button>
          <button
            type="button"
            className={tab === 'tracks' ? 'button--active' : ''}
            onClick={() => setTab('tracks')}
          >
            Tracks
          </button>
        </div>
        <SearchBar
          value={query}
          placeholder={tab === 'albums' ? 'Search albums…' : 'Search tracks…'}
          compact
          onChange={setQuery}
          onSubmit={() => undefined}
          onClear={() => setQuery('')}
        />
        <span className="profile__count">
          {tab === 'albums'
            ? `${filteredAlbums.length} album${filteredAlbums.length === 1 ? '' : 's'}`
            : `${filteredTracks.length} track${filteredTracks.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="profile__body">
        {tab === 'albums' ? (
          <AlbumGrid
            albums={filteredAlbums}
            onOpen={onOpenAlbum}
            onPlay={(album) => onPlayContext(album.tracks, 0)}
            onContextMenu={onAlbumContextMenu}
          />
        ) : (
          <TrackList
            tracks={filteredTracks}
            currentTrackId={currentTrackId}
            onPlay={(i) => onPlayContext(filteredTracks, i)}
            onPlayNext={onPlayNext}
            onAddToQueue={onAddToQueue}
            onFindCover={onFindCover}
            onContextMenu={onContextMenu}
            emptyMessage={query ? 'No matching tracks.' : 'No tracks.'}
          />
        )}
      </div>
    </div>
  )
}
