import type { Playlist, Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { PlaylistIcon, PlusIcon } from '@renderer/icons'

interface PlaylistGridProps {
  playlists: Playlist[]
  byId: Map<string, Track>
  onOpen: (id: string) => void
  onCreate: () => void
  onContextMenu: (playlist: Playlist, x: number, y: number) => void
}

export function PlaylistGrid({ playlists, byId, onOpen, onCreate, onContextMenu }: PlaylistGridProps) {
  const art = (playlist: Playlist): string | null =>
    playlist.trackIds.find((id) => byId.get(id)?.hasArtwork) ?? playlist.trackIds[0] ?? null

  return (
    <div className="album-grid">
      <div
        className="album-tile playlist-tile playlist-tile--new"
        role="button"
        tabIndex={0}
        onClick={onCreate}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCreate()
        }}
      >
        <div className="playlist-tile__newicon">
          <PlusIcon size={26} />
        </div>
        <div className="album-tile__name">New playlist</div>
        <div className="album-tile__artist">Create a playlist</div>
      </div>

      {playlists.map((playlist) => (
        <div
          key={playlist.id}
          className="album-tile playlist-tile"
          role="button"
          tabIndex={0}
          onClick={() => onOpen(playlist.id)}
          onContextMenu={(e) => {
            e.preventDefault()
            onContextMenu(playlist, e.clientX, e.clientY)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onOpen(playlist.id)
          }}
        >
          <div className="album-tile__art">
            <AlbumArt trackId={art(playlist) ?? undefined} className="album-tile__img" iconSize={28} />
            <span className="playlist-tile__badge">
              <PlaylistIcon size={13} />
            </span>
          </div>
          <div className="album-tile__name" title={playlist.name}>
            {playlist.name}
          </div>
          <div className="album-tile__artist">
            {playlist.trackIds.length} track{playlist.trackIds.length === 1 ? '' : 's'}
          </div>
        </div>
      ))}
    </div>
  )
}
