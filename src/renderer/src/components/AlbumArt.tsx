import { DiscIcon } from '@renderer/icons'
import { useArtwork } from '@renderer/state/useArtwork'

interface AlbumArtProps {
  trackId?: string | null
  className?: string
  iconSize?: number
}

/** Artwork image with a consistent fallback tile. */
export function AlbumArt({ trackId, className, iconSize = 24 }: AlbumArtProps) {
  const url = useArtwork(trackId)
  if (url) {
    return <img key={url} className={`art ${className ?? ''}`} src={url} alt="" draggable={false} />
  }
  return (
    <div className={`art art--fallback ${className ?? ''}`}>
      <DiscIcon size={iconSize} />
    </div>
  )
}
