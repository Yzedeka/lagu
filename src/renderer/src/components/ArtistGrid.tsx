import type { Track } from '@shared/types'
import type { ArtistGroup } from '@renderer/lib/album'
import { AlbumArt } from './AlbumArt'
import { ArtistIcon, PauseIcon, PlayIcon } from '@renderer/icons'
import { useArtistImage } from '@renderer/state/useArtistImage'

interface ArtistGridProps {
  artists: ArtistGroup[]
  tracks: Track[]
  bios: Record<string, string>
  currentTrackId?: string | null
  playing: boolean
  onOpen: (name: string) => void
  onPlay: (name: string) => void
  onToggle: () => void
  onContextMenu?: (name: string, x: number, y: number) => void
}

interface ArtistCardProps {
  group: ArtistGroup
  tracks: Track[]
  bio?: string
  currentTrackId?: string | null
  playing: boolean
  onOpen: (name: string) => void
  onPlay: (name: string) => void
  onToggle: () => void
  onContextMenu?: (name: string, x: number, y: number) => void
}

function ArtistCard({
  group,
  tracks,
  bio,
  currentTrackId,
  playing,
  onOpen,
  onPlay,
  onToggle,
  onContextMenu
}: ArtistCardProps) {
  const image = useArtistImage(group.name)
  const artTrack = tracks.find((t) => t.hasArtwork) ?? tracks[0]
  const playingHere = playing && tracks.some((t) => t.id === currentTrackId)

  return (
    <div
      className="artist-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(group.name)}
      onContextMenu={(e) => {
        if (!onContextMenu) return
        e.preventDefault()
        onContextMenu(group.name, e.clientX, e.clientY)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(group.name)
      }}
    >
      <div className="artist-card__artwrap">
        <div className="artist-card__art">
          {image ? (
            <img className="artist-card__img art" src={image} alt="" draggable={false} />
          ) : artTrack ? (
            <AlbumArt trackId={artTrack.id} className="artist-card__img" iconSize={40} />
          ) : (
            <div className="artist-card__img art--fallback">
              <ArtistIcon size={40} />
            </div>
          )}
        </div>
        <button
          type="button"
          className="artist-card__play"
          title={playingHere ? 'Pause' : 'Play artist'}
          onClick={(e) => {
            e.stopPropagation()
            if (playingHere) onToggle()
            else onPlay(group.name)
          }}
        >
          {playingHere ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
        </button>
      </div>

      <div className="artist-card__name" title={group.name}>
        {group.name}
      </div>

      <div className="artist-card__bio" title={bio || undefined}>
        {bio ? bio : <span className="artist-card__bio--empty">No bio yet</span>}
      </div>

      <div className="artist-card__meta">
        {group.albums.length} album{group.albums.length === 1 ? '' : 's'} · {group.trackCount} track
        {group.trackCount === 1 ? '' : 's'}
      </div>
    </div>
  )
}

export function ArtistGrid({
  artists,
  tracks,
  bios,
  currentTrackId,
  playing,
  onOpen,
  onPlay,
  onToggle,
  onContextMenu
}: ArtistGridProps) {
  if (artists.length === 0) {
    return <div className="empty-state">No artists yet.</div>
  }

  return (
    <div className="artist-grid">
      {artists.map((group) => (
        <ArtistCard
          key={group.name}
          group={group}
          tracks={tracks.filter((t) => (t.albumArtist || t.artist) === group.name)}
          bio={bios[group.name]}
          currentTrackId={currentTrackId}
          playing={playing}
          onOpen={onOpen}
          onPlay={onPlay}
          onToggle={onToggle}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  )
}
