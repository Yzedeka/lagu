import type { Playlist, Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { PlaylistIcon } from '@renderer/icons'
import { usePlaylistCover } from '@renderer/state/usePlaylistCover'

interface PlaylistArtProps {
  playlist: Playlist
  byId: Map<string, Track>
  className: string
  iconSize?: number
}

/** A playlist cover: the custom cover if set, else the first available track art. */
export function PlaylistArt({ playlist, byId, className, iconSize = 28 }: PlaylistArtProps) {
  const custom = usePlaylistCover(playlist.cover)

  if (custom) {
    return <img className={`art ${className}`} src={custom} alt="" draggable={false} />
  }

  const artId =
    playlist.trackIds.find((id) => byId.get(id)?.hasArtwork) ?? playlist.trackIds[0] ?? null
  if (artId) return <AlbumArt trackId={artId} className={className} iconSize={iconSize} />

  return (
    <div className={`art art--fallback ${className}`}>
      <PlaylistIcon size={iconSize} />
    </div>
  )
}
