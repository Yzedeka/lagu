import type { RepeatMode, Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import {
  EditIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  LyricsIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon
} from '@renderer/icons'
import { Range } from './Range'
import { Visualizer } from './Visualizer'
import { formatTime } from '@renderer/lib/format'

interface BottomBarProps {
  track: Track | null
  playing: boolean
  currentTime: number
  duration: number
  shuffle: boolean
  repeat: RepeatMode
  visualizer: boolean
  queueOpen: boolean
  lyricsOpen: boolean
  lyricsAvailable: boolean
  isFullscreen: boolean
  accent: string
  onToggle: () => void
  onNext: () => void
  onPrev: () => void
  onSeek: (seconds: number) => void
  onToggleShuffle: () => void
  onCycleRepeat: () => void
  onToggleQueue: () => void
  onToggleLyrics: () => void
  onEditLyrics: () => void
  onToggleFullscreen: () => void
}

export function BottomBar({
  track,
  playing,
  currentTime,
  duration,
  shuffle,
  repeat,
  visualizer,
  queueOpen,
  lyricsOpen,
  lyricsAvailable,
  isFullscreen,
  accent,
  onToggle,
  onNext,
  onPrev,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onToggleQueue,
  onToggleLyrics,
  onEditLyrics,
  onToggleFullscreen
}: BottomBarProps) {
  const effectiveDuration = track?.duration && track.duration > 0 ? track.duration : duration || 0

  return (
    <footer className="bottom-bar">
      <div className="bottom-bar__content">
        {/* Now playing: transport button, art, meta, visualizer */}
        <div className="bb-now">
          <button
            type="button"
            className="play-btn bb-play"
            title={playing ? 'Pause' : 'Play'}
            onClick={onToggle}
            disabled={!track}
          >
            {playing ? <PauseIcon size={21} /> : <PlayIcon size={21} />}
          </button>
          <AlbumArt trackId={track?.id} className="bb-art" iconSize={16} />
          <div className="bb-track__meta">
            <span className="bb-title" title={track?.title}>
              {track?.title ?? 'Nothing playing'}
            </span>
            <span className="bb-sub">{track?.artist ?? '-'}</span>
          </div>
          {visualizer && (
            <div className="bb-visualizer">
              <Visualizer playing={playing} colour={accent} />
            </div>
          )}
        </div>

        {/* Transport */}
        <div className="bb-transport">
          <button
            type="button"
            className={`icon-btn ${shuffle ? 'icon-btn--active' : ''}`}
            title="Shuffle (S)"
            onClick={onToggleShuffle}
          >
            <ShuffleIcon size={16} />
          </button>
          <button type="button" className="icon-btn" title="Previous" onClick={onPrev} disabled={!track}>
            <PrevIcon size={18} />
          </button>
          <button type="button" className="icon-btn" title="Next" onClick={onNext} disabled={!track}>
            <NextIcon size={18} />
          </button>
          <button
            type="button"
            className={`icon-btn ${repeat !== 'off' ? 'icon-btn--active' : ''}`}
            title={`Repeat: ${repeat}`}
            onClick={onCycleRepeat}
          >
            {repeat === 'one' ? <RepeatOneIcon size={16} /> : <RepeatIcon size={16} />}
          </button>
        </div>

        {/* Timeline */}
        <div className="bb-timeline">
          <span className="bb-time">{formatTime(currentTime)}</span>
          <Range
            className="range--progress"
            value={currentTime}
            max={effectiveDuration || 1}
            onChange={onSeek}
            ariaLabel="Seek"
            disabled={!track || effectiveDuration <= 0}
          />
          <span className="bb-time bb-time--right">{formatTime(effectiveDuration)}</span>
        </div>

        {/* Utilities */}
        <div className="bb-utils">
          <button
            type="button"
            className={`icon-btn ${lyricsOpen ? 'icon-btn--active' : ''}`}
            title={lyricsAvailable ? 'Lyrics (L)' : 'No lyrics for this track'}
            onClick={onToggleLyrics}
            disabled={!track || (!lyricsAvailable && !lyricsOpen)}
          >
            <LyricsIcon size={17} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Lyrics - import / edit .lrc"
            onClick={onEditLyrics}
            disabled={!track}
          >
            <EditIcon size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${isFullscreen ? 'icon-btn--active' : ''}`}
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <FullscreenExitIcon size={17} /> : <FullscreenIcon size={17} />}
          </button>
          <button
            type="button"
            className={`icon-btn ${queueOpen ? 'icon-btn--active' : ''}`}
            title="Toggle queue"
            onClick={onToggleQueue}
          >
            <QueueIcon size={17} />
          </button>
        </div>
      </div>
    </footer>
  )
}
