import type { ReactNode } from 'react'
import type { Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { SeekBar } from './SeekBar'
import { Visualizer } from './Visualizer'

interface NowPlayingProps {
  track: Track | null
  playing: boolean
  duration: number
  error: string | null
  visualizer: boolean
  lyricsOpen: boolean
  disc: boolean
  accent: string
  onSeek: (seconds: number) => void
  onOpenArtist: (name: string) => void
  lyricsSlot: ReactNode
}

export function NowPlaying({
  track,
  playing,
  duration,
  error,
  visualizer,
  lyricsOpen,
  disc,
  accent,
  onSeek,
  onOpenArtist,
  lyricsSlot
}: NowPlayingProps) {
  // Prefer the tagged duration so long tracks show their real length instead of
  // the element's early/partial estimate while it is still being parsed.
  const effectiveDuration = track?.duration && track.duration > 0 ? track.duration : duration || 0

  return (
    <div className="now-playing">
      <div className={`np-stage ${lyricsOpen ? 'np-stage--full' : ''}`}>
        {lyricsOpen ? (
          lyricsSlot
        ) : (
          <div className="np-art-wrap">
            {disc ? (
              <div className="np-disc">
                <AlbumArt trackId={track?.id} className="np-disc__label" iconSize={72} />
              </div>
            ) : (
              <AlbumArt trackId={track?.id} className="np-art" iconSize={72} />
            )}
          </div>
        )}
      </div>

      <div className="np-meta">
        <h1 className="np-title" title={track?.title}>
          {track ? track.title : 'Nothing playing'}
        </h1>
        <div className="np-sub">
          {track ? (
            <button
              type="button"
              className="np-artist-link"
              title={`Open ${track.albumArtist || track.artist}`}
              onClick={() => onOpenArtist(track.albumArtist || track.artist)}
            >
              {track.artist}
            </button>
          ) : (
            'Select a track from your library'
          )}
          {track && track.album && track.album !== 'Unknown Album' && (
            <span className="np-album"> · {track.album}</span>
          )}
          {track?.year ? <span className="np-year"> · {track.year}</span> : null}
        </div>
      </div>

      <div className="np-progress">
        <SeekBar
          timeClass="np-time"
          duration={effectiveDuration}
          onSeek={onSeek}
          disabled={!track || effectiveDuration <= 0}
        />
      </div>

      {error && <div className="np-error">{error}</div>}

      {visualizer && (
        <div className="np-visualizer">
          <Visualizer playing={playing} colour={accent} />
        </div>
      )}
    </div>
  )
}
