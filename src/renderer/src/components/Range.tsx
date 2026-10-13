import { useCallback, useEffect, useRef, useState } from 'react'

interface RangeProps {
  value: number
  max: number
  min?: number
  onChange: (value: number) => void
  className?: string
  ariaLabel: string
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
}

/**
 * Click-and-drag range control. Live-updates via `onChange`; used for the seek
 * bar, the volume slider and the settings sliders.
 */
export function Range({
  value,
  max,
  min = 0,
  onChange,
  className,
  ariaLabel,
  disabled,
  orientation = 'horizontal'
}: RangeProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(value)
  const vertical = orientation === 'vertical'

  useEffect(() => {
    if (!dragging) setPreview(value)
  }, [value, dragging])

  const span = max - min || 1

  const valueFromPoint = useCallback(
    (clientX: number, clientY: number): number => {
      const el = ref.current
      if (!el) return min
      const rect = el.getBoundingClientRect()
      const ratio = vertical
        ? Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height))
        : Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return min + ratio * span
    },
    [min, span, vertical]
  )

  const beginDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return
      setDragging(true)
      const next = valueFromPoint(clientX, clientY)
      setPreview(next)
      onChange(next)
    },
    [disabled, onChange, valueFromPoint]
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent): void => {
      const next = valueFromPoint(e.clientX, e.clientY)
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
  }, [dragging, onChange, valueFromPoint])

  const shown = dragging ? preview : value
  const pct = Math.min(100, Math.max(0, ((shown - min) / span) * 100))

  return (
    <div
      ref={ref}
      className={`range ${vertical ? 'range--vertical' : ''} ${className ?? ''} ${
        disabled ? 'range--disabled' : ''
      }`}
      role="slider"
      aria-label={ariaLabel}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(shown)}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* capture is best-effort */
        }
        beginDrag(e.clientX, e.clientY)
      }}
    >
      <div className="range-track">
        <div
          className="range-fill"
          style={vertical ? { height: `${pct}%` } : { width: `${pct}%` }}
        />
      </div>
      <div
        className="range-thumb"
        style={vertical ? { bottom: `${pct}%` } : { left: `${pct}%` }}
      />
    </div>
  )
}
