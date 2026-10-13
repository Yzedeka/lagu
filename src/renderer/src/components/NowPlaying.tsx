import type { ReactNode } from 'react'
import type { Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { EditIcon } from '@renderer/icons'
import { Range } from './Range'
import { Visualizer } from './Visualizer'
import { formatTime } from '@renderer/lib/format'

interface NowPlayingProps {
  track: Track | null
  playing: boolean
  currentTime: number
  duration: number
  error: string | null
  visualizer: boolean
  lyricsOpen: boolean
  accent: string
  onSeek: (seconds: number) => void
  onEditLyrics: () => void
  lyricsSlot: ReactNode
}

export function NowPlaying({
  track,
  playing,
  currentTime,
  duration,
  error,
  visualizer,
  lyricsOpen,
  accent,
  onSeek,
  onEditLyrics,
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
            <AlbumArt trackId={track?.id} className="np-art" iconSize={72} />
          </div>
        )}
      </div>

      <div className="np-meta">
        <h1 className="np-title" title={track?.title}>
          {track ? track.title : 'Nothing playing'}
        </h1>
        <div className="np-sub">
          {track ? track.artist : 'Select a track from your library'}
          {track && track.album && track.album !== 'Unknown Album' && (
            <span className="np-album"> · {track.album}</span>
          )}
          {track?.year ? <span className="np-year"> · {track.year}</span> : null}
        </div>
      </div>

      <div className="np-progress">
        <span className="np-time">{formatTime(currentTime)}</span>
        <Range
          className="range--progress"
          value={currentTime}
          max={effectiveDuration || 1}
          onChange={onSeek}
          ariaLabel="Seek"
          disabled={!track || effectiveDuration <= 0}
        />
        <span className="np-time np-time--right">{formatTime(effectiveDuration)}</span>
        <button
          type="button"
          className="icon-btn"
          title="Lyrics - import .lrc"
          onClick={onEditLyrics}
          disabled={!track}
        >
          <EditIcon size={16} />
        </button>
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
