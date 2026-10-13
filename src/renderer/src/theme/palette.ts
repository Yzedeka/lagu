import type { AccentMode, Density, ThemeMode } from '@shared/types'

export interface Palette {
  /** Primary accent, ready to use as a CSS color. */
  accent: string
  /** Variant for hover/active states. */
  accentBright: string
  /** Low-alpha accent for subtle fills. */
  accentSoft: string
  /** A tint of the accent for panel washes. */
  tint: string
  /** Text color that stays readable on top of `accent`. */
  contrast: string
}

interface Rgb {
  r: number
  g: number
  b: number
}

const BLACK: Rgb = { r: 12, g: 12, b: 12 }
const WHITE: Rgb = { r: 255, g: 255, b: 255 }

function toHex({ r, g, b }: Rgb): string {
  const f = (n: number): string => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${f(r)}${f(g)}${f(b)}`
}

function fromHex(hex: string): Rgb {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0
  }
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number): number => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function saturation(c: Rgb): number {
  const max = Math.max(c.r, c.g, c.b) / 255
  const min = Math.min(c.r, c.g, c.b) / 255
  if (max === min) return 0
  const l = (max + min) / 2
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min)
}

function lightness(c: Rgb): number {
  return (Math.max(c.r, c.g, c.b) + Math.min(c.r, c.g, c.b)) / (2 * 255)
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  }
}

function withAlpha(c: Rgb, alpha: number): string {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`
}

/**
 * Build a legible accent set from a source colour, adapting to light or dark
 * chrome so text on top of the accent and the accent itself stay readable.
 */
export function buildPalette(source: Rgb, isLight: boolean): Palette {
  let toned = source
  if (isLight) {
    // On light chrome the accent needs to be dark enough to read as a fill.
    if (relativeLuminance(toned) > 0.42) toned = mix(toned, BLACK, 0.45)
  } else if (relativeLuminance(toned) < 0.12) {
    toned = mix(toned, WHITE, 0.35)
  }

  const bright = isLight ? mix(toned, BLACK, 0.18) : mix(toned, WHITE, 0.28)
  const tint = isLight ? mix(toned, WHITE, 0.88) : mix(toned, BLACK, 0.82)
  return {
    accent: toHex(toned),
    accentBright: toHex(bright),
    accentSoft: withAlpha(toned, isLight ? 0.14 : 0.16),
    tint: toHex(tint),
    contrast: relativeLuminance(toned) > 0.5 ? '#121212' : '#f4f4f4'
  }
}

export function paletteFromColor(hex: string, isLight: boolean): Palette {
  return buildPalette(fromHex(hex), isLight)
}

export function isLightTheme(theme: ThemeMode): boolean {
  return theme === 'light' || theme === 'grey'
}

/**
 * Extract a small, restrained palette from artwork using a coarse colour
 * histogram. Returns null when nothing usable is found (caller falls back).
 */
export async function extractPalette(url: string, isLight: boolean): Promise<Palette | null> {
  const bitmap = await loadImage(url)
  if (!bitmap) return null

  try {
    const size = 48
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)

    interface Bucket {
      r: number
      g: number
      b: number
      count: number
    }
    const buckets = new Map<number, Bucket>()

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 125) continue
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.r += r
        bucket.g += g
        bucket.b += b
        bucket.count += 1
      } else {
        buckets.set(key, { r, g, b, count: 1 })
      }
    }

    let best: Rgb | null = null
    let bestScore = -1
    for (const bucket of buckets.values()) {
      const color: Rgb = {
        r: bucket.r / bucket.count,
        g: bucket.g / bucket.count,
        b: bucket.b / bucket.count
      }
      const l = lightness(color)
      if (l < 0.12 || l > 0.92) continue
      const sat = saturation(color)
      const midBonus = 1 - Math.abs(l - 0.5) * 1.2
      const score = (sat * 1.6 + 0.25) * Math.pow(bucket.count, 0.35) * Math.max(0.15, midBonus)
      if (score > bestScore) {
        bestScore = score
        best = color
      }
    }

    if (!best) return null
    return buildPalette(best, isLight)
  } catch {
    return null
  }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Fallback accents per theme, used when artwork is missing or extraction fails. */
export const FALLBACK_ACCENTS: Record<ThemeMode, string> = {
  dark: '#7d97b8',
  light: '#3f6ea5',
  grey: '#3f6ea5',
  black: '#7d97b8'
}

export interface ApplyThemeOptions {
  theme: ThemeMode
  radius: number
  density: Density
  animations: boolean
  performance: boolean
  palette: Palette
}

/** Push theme + accent + layout customisation into CSS custom properties. */
export function applyTheme({
  theme,
  radius,
  density,
  animations,
  performance,
  palette
}: ApplyThemeOptions): void {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.density = density
  root.dataset.animations = animations ? 'on' : 'off'
  root.dataset.performance = performance ? 'on' : 'off'
  root.style.setProperty('--radius', `${radius}px`)
  root.style.setProperty('--accent', palette.accent)
  root.style.setProperty('--accent-bright', palette.accentBright)
  root.style.setProperty('--accent-soft', palette.accentSoft)
  root.style.setProperty('--tint', palette.tint)
  root.style.setProperty('--accent-contrast', palette.contrast)
}

/** Resolve the effective palette for the current settings + artwork. */
export function resolvePalette(
  theme: ThemeMode,
  accentMode: AccentMode,
  accentColor: string,
  artworkPalette: Palette | null
): Palette {
  const light = isLightTheme(theme)
  if (accentMode === 'fixed') return paletteFromColor(accentColor, light)
  return artworkPalette ?? paletteFromColor(FALLBACK_ACCENTS[theme], light)
}
