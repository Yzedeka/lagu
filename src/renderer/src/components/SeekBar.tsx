import { Range } from './Range'
import { formatTime } from '@renderer/lib/format'
import { usePlaybackTime } from '@renderer/state/usePlaybackTime'

interface SeekBarProps {
  /** Class for the time labels, e.g. `bb-time` or `np-time`. */
  timeClass: string
  duration: number
  disabled: boolean
  onSeek: (seconds: number) => void
}

/**
 * Elapsed time + progress slider + total time. This is the only part of the
 * player chrome that re-renders on every playback tick.
 */
export function SeekBar({ timeClass, duration, disabled, onSeek }: SeekBarProps) {
  const currentTime = usePlaybackTime()
  return (
    <>
      <span className={timeClass}>{formatTime(currentTime)}</span>
      <Range
        className="range--progress"
        value={currentTime}
        max={duration || 1}
        onChange={onSeek}
        ariaLabel="Seek"
        disabled={disabled}
      />
      <span className={`${timeClass} ${timeClass}--right`}>{formatTime(duration)}</span>
    </>
  )
}
