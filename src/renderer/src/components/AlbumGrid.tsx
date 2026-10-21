import type { Track } from '@shared/types'
import type { Album } from '@renderer/lib/album'
import { AlbumArt } from './AlbumArt'
import { PlayIcon } from '@renderer/icons'

interface AlbumGridProps {
  albums: Album[]
  onOpen: (album: Album) => void
  onPlay: (album: Album) => void
  onContextMenu?: (album: Album, x: number, y: number) => void
}

function artworkTrack(album: Album): string {
  const withArt = album.tracks.find((t: Track) => t.hasArtwork)
  return (withArt ?? album.tracks[0])?.id ?? ''
}

export function AlbumGrid({ albums, onOpen, onPlay, onContextMenu }: AlbumGridProps) {
  return (
    <div className="album-grid">
      {albums.map((album) => (
        <div
          key={album.key}
          className="album-tile"
          role="button"
          tabIndex={0}
          onClick={() => onOpen(album)}
          onContextMenu={(e) => {
            if (!onContextMenu) return
            e.preventDefault()
            onContextMenu(album, e.clientX, e.clientY)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onOpen(album)
          }}
        >
          <div className="album-tile__art album-tile__art--cover">
            <div className="cover3d">
              <div className="cover3d__disc" aria-hidden>
                <AlbumArt trackId={artworkTrack(album)} className="cover3d__label" iconSize={18} />
              </div>
              <AlbumArt trackId={artworkTrack(album)} className="album-tile__img" iconSize={28} />
            </div>
            <button
              type="button"
              className="album-tile__play"
              title="Play album"
              aria-label={`Play ${album.name}`}
              onClick={(e) => {
                e.stopPropagation()
                onPlay(album)
              }}
            >
              <PlayIcon size={13} filled />
            </button>
          </div>
          <div className="album-tile__name" title={album.name}>
            {album.name}
          </div>
          <div className="album-tile__artist" title={album.artist}>
            {album.artist}
          </div>
        </div>
      ))}
    </div>
  )
}
