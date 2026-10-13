import { useCallback, useEffect, useRef, useState } from 'react'

interface RangeProps {
  value: number
  max: number
  min?: number
  onChange: (value: number) => void
  className?: string
  ariaLabel: string
  disabled?: boolean
}

/**
 * Click-and-drag range control. Live-updates via `onChange`; used for the seek
 * bar, the volume slider and the settings sliders.
 */
export function Range({ value, max, min = 0, onChange, className, ariaLabel, disabled }: RangeProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(value)

  useEffect(() => {
    if (!dragging) setPreview(value)
  }, [value, dragging])

  const span = max - min || 1

  const valueFromEvent = useCallback(
    (clientX: number): number => {
      const el = ref.current
      if (!el) return min
      const rect = el.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return min + ratio * span
    },
    [min, span]
  )

  const beginDrag = useCallback(
    (clientX: number) => {
      if (disabled) return
      setDragging(true)
      const next = valueFromEvent(clientX)
      setPreview(next)
      onChange(next)
    },
    [disabled, onChange, valueFromEvent]
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent): void => {
      const next = valueFromEvent(e.clientX)
      setPreview(next)
      onChange(next)
    }
    const onUp = (): void => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, onChange, valueFromEvent])

  const shown = dragging ? preview : value
  const pct = Math.min(100, Math.max(0, ((shown - min) / span) * 100))

  return (
    <div
      ref={ref}
      className={`range ${className ?? ''} ${disabled ? 'range--disabled' : ''}`}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(shown)}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* capture is best-effort */
        }
        beginDrag(e.clientX)
      }}
    >
      <div className="range-track">
        <div className="range-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="range-thumb" style={{ left: `${pct}%` }} />
    </div>
  )
}
