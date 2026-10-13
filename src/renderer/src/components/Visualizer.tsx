import { useEffect, useRef } from 'react'
import { engine } from '@renderer/player/engine'

const BAR_COUNT = 44
const BAR_GAP = 5

interface VisualizerProps {
  playing: boolean
  /** Accent colour derived from the current artwork. */
  colour: string
}

/** Slim frequency visualizer. Falls back to a calm idle line on streams. */
export function Visualizer({ playing, colour }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let width = 0
    let height = 0

    const resize = (): void => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const analyser = engine.analyser
    const bins = analyser ? analyser.frequencyBinCount : 0
    const data = analyser ? new Uint8Array(bins) : null
    const levels = new Float32Array(BAR_COUNT)

    // Map bars logarithmically across the useful audio band, otherwise the
    // coarse low bins dominate and only the first bar moves.
    const minBin = 2
    const maxBin = bins > 0 ? Math.max(minBin + 1, Math.floor(bins * 0.7)) : 1
    const binFor = (i: number): number => {
      const t = i / (BAR_COUNT - 1)
      return Math.min(bins - 1, Math.round(minBin * (maxBin / minBin) ** t))
    }

    const draw = (): void => {
      raf = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, width, height)

      const gap = BAR_GAP
      const barWidth = Math.max(2, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT)
      const radius = Math.min(barWidth / 2, 4)

      if (analyser && data) analyser.getByteFrequencyData(data)

      for (let i = 0; i < BAR_COUNT; i += 1) {
        let target: number
        if (analyser && data && playing) {
          const centre = binFor(i)
          const lo = Math.max(0, centre - 1)
          const hi = Math.min(bins - 1, centre + 2)
          let sum = 0
          for (let b = lo; b <= hi; b += 1) sum += data[b] ?? 0
          target = sum / (hi - lo + 1) / 255
          target = Math.pow(target, 1.25)
        } else {
          target = 0.06 + 0.02 * Math.sin(Date.now() / 700 + i / 3)
        }
        // Ease toward the target so bars settle instead of flickering.
        levels[i] += (target - levels[i]) * (target > levels[i] ? 0.55 : 0.18)
        const level = levels[i]
        const barHeight = Math.max(barWidth, level * height)
        const x = i * (barWidth + gap)
        const y = height - barHeight
        ctx.globalAlpha = 0.42 + level * 0.58
        ctx.fillStyle = colour
        ctx.beginPath()
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barHeight, radius)
        } else {
          ctx.rect(x, y, barWidth, barHeight)
        }
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [playing, colour])

  return <canvas ref={canvasRef} className="visualizer" aria-hidden />
}
