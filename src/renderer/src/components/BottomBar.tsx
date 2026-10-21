import { useEffect, useRef, useState, type RefObject } from 'react'
import type { RepeatMode, Track } from '@shared/types'
import { AlbumArt } from './AlbumArt'
import { ContextMenu, type MenuItem } from './ContextMenu'
import {
  EditIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  LyricsIcon,
  MoreIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  VolumeIcon,
  VolumeMuteIcon
} from '@renderer/icons'
import { Range } from './Range'
import { SeekBar } from './SeekBar'
import { Visualizer } from './Visualizer'

interface BottomBarProps {
  track: Track | null
  playing: boolean
  duration: number
  volume: number
  muted: boolean
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
  onSetVolume: (value: number) => void
  onToggleMute: () => void
  onToggleShuffle: () => void
  onCycleRepeat: () => void
  onToggleQueue: () => void
  onToggleLyrics: () => void
  onEditLyrics: () => void
  onToggleFullscreen: () => void
}

/**
 * Width tiers for the bar. Each step down hides something; anything hidden
 * moves into the overflow menu so it stays reachable.
 */
type BarSize = 'wide' | 'regular' | 'compact' | 'narrow' | 'tiny' | 'micro'

const BAR_SIZES: [number, BarSize][] = [
  [1280, 'wide'],
  [1100, 'regular'],
  [900, 'compact'],
  [720, 'narrow'],
  [600, 'tiny']
]

function barSizeFor(width: number): BarSize {
  return BAR_SIZES.find(([min]) => width >= min)?.[1] ?? 'micro'
}

const RANK: Record<BarSize, number> = {
  wide: 5,
  regular: 4,
  compact: 3,
  narrow: 2,
  tiny: 1,
  micro: 0
}

function useBarSize(): [RefObject<HTMLElement | null>, BarSize] {
  const ref = useRef<HTMLElement | null>(null)
  const [size, setSize] = useState<BarSize>('wide')
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setSize(barSizeFor(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, size]
}

export function BottomBar({
  track,
  playing,
  duration,
  volume,
  muted,
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
  onSetVolume,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleQueue,
  onToggleLyrics,
  onEditLyrics,
  onToggleFullscreen
}: BottomBarProps) {
  const effectiveDuration = track?.duration && track.duration > 0 ? track.duration : duration || 0
  const [barRef, size] = useBarSize()
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const below = (tier: BarSize): boolean => RANK[size] < RANK[tier]

  const overflow: MenuItem[] = [
    ...(below('tiny')
      ? [
          {
            label: 'Lyrics',
            icon: <LyricsIcon size={15} />,
            disabled: !track || (!lyricsAvailable && !lyricsOpen),
            onClick: onToggleLyrics
          },
          { label: 'Queue', icon: <QueueIcon size={15} />, onClick: onToggleQueue }
        ]
      : []),
    ...(below('narrow')
      ? [
          {
            label: shuffle ? 'Shuffle: on' : 'Shuffle: off',
            icon: <ShuffleIcon size={15} />,
            onClick: onToggleShuffle
          },
          {
            label: `Repeat: ${repeat}`,
            icon: repeat === 'one' ? <RepeatOneIcon size={15} /> : <RepeatIcon size={15} />,
            onClick: onCycleRepeat
          }
        ]
      : []),
    ...(below('compact')
      ? [
          {
            label: isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
            icon: isFullscreen ? <FullscreenExitIcon size={15} /> : <FullscreenIcon size={15} />,
            onClick: onToggleFullscreen
          }
        ]
      : []),
    {
      label: 'Import / edit lyrics',
      icon: <EditIcon size={15} />,
      disabled: !track,
      onClick: onEditLyrics
    }
  ]

  return (
    <footer className="bottom-bar" ref={barRef} data-size={size}>
      <div className="bottom-bar__content">
        {/* Left: now playing + transport */}
        <div className="bb-side bb-side--left">
          <div className="bb-now">
            <button
              type="button"
              className="play-btn bb-play"
              title={playing ? 'Pause' : 'Play'}
              onClick={onToggle}
              disabled={!track}
            >
              {playing ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
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

          <div className="bb-transport">
            <button
              type="button"
              className={`icon-btn bb-opt--mode ${shuffle ? 'icon-btn--active' : ''}`}
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
              className={`icon-btn bb-opt--mode ${repeat !== 'off' ? 'icon-btn--active' : ''}`}
              title={`Repeat: ${repeat}`}
              onClick={onCycleRepeat}
            >
              {repeat === 'one' ? <RepeatOneIcon size={16} /> : <RepeatIcon size={16} />}
            </button>
          </div>
        </div>

        {/* Center: timeline */}
        <div className="bb-center">
          <div className="bb-timeline">
            <SeekBar
              timeClass="bb-time"
              duration={effectiveDuration}
              onSeek={onSeek}
              disabled={!track || effectiveDuration <= 0}
            />
          </div>
        </div>

        {/* Right: volume + utilities */}
        <div className="bb-side bb-side--right">
          <div className="bb-utils">
            <div className="bb-volume">
              <button
                type="button"
                className="icon-btn"
                title={muted ? 'Unmute' : 'Mute'}
                onClick={onToggleMute}
              >
                {muted || volume === 0 ? <VolumeMuteIcon size={16} /> : <VolumeIcon size={16} />}
              </button>
              <Range
                className="range--volume"
                value={muted ? 0 : volume}
                max={1}
                onChange={(v) => {
                  if (muted && v > 0) onToggleMute()
                  onSetVolume(v)
                }}
                ariaLabel="Volume"
              />
            </div>

            <button
              type="button"
              className={`icon-btn bb-opt--panel ${lyricsOpen ? 'icon-btn--active' : ''}`}
              title={lyricsAvailable ? 'Lyrics (L)' : 'No lyrics for this track'}
              onClick={onToggleLyrics}
              disabled={!track || (!lyricsAvailable && !lyricsOpen)}
            >
              <LyricsIcon size={17} />
            </button>
            <button
              type="button"
              className="icon-btn bb-opt--edit"
              title="Lyrics - import / edit .lrc"
              onClick={onEditLyrics}
              disabled={!track}
            >
              <EditIcon size={16} />
            </button>
            <button
              type="button"
              className={`icon-btn bb-opt--fullscreen ${isFullscreen ? 'icon-btn--active' : ''}`}
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? <FullscreenExitIcon size={17} /> : <FullscreenIcon size={17} />}
            </button>
            <button
              type="button"
              className={`icon-btn bb-opt--panel ${queueOpen ? 'icon-btn--active' : ''}`}
              title="Toggle queue"
              onClick={onToggleQueue}
            >
              <QueueIcon size={17} />
            </button>
            {below('regular') && (
              <button
                type="button"
                className={`icon-btn ${menu ? 'icon-btn--active' : ''}`}
                title="More"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  if (menu) {
                    setMenu(null)
                    return
                  }
                  const rect = e.currentTarget.getBoundingClientRect()
                  setMenu({ x: rect.right - 224, y: rect.top - overflow.length * 34 - 18 })
                }}
              >
                <MoreIcon size={17} />
              </button>
            )}
          </div>
        </div>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={overflow} onClose={() => setMenu(null)} />}
    </footer>
  )
}
