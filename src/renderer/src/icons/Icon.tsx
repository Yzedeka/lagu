import type { CSSProperties } from 'react'

export interface IconProps {
  size?: number
  className?: string
  style?: CSSProperties
  /** Use the filled variant of the symbol. */
  filled?: boolean
}

/**
 * Base icon renderer.
 *
 * Every icon in `./index.tsx` is a thin wrapper around this. It renders a
 * Google Material Symbols (Rounded) glyph by name - the glyph name is the
 * ligature text. The font is bundled locally so icons work offline, and is
 * trimmed to just the glyphs named in `./index.tsx`.
 *
 * To swap an icon, either change the glyph name in `./index.tsx` (any name from
 * https://fonts.google.com/icons works) and run `npm run icons:subset`, or
 * replace that icon's export with your own SVG element - the only contract is
 * that it accepts `IconProps`.
 */
export function Icon({
  name,
  size = 18,
  className,
  style,
  filled = false
}: IconProps & { name: string }) {
  return (
    <span
      className={`material-symbols-rounded msym ${filled ? 'msym--filled' : ''} ${className ?? ''}`}
      style={{ fontSize: size, ...style }}
      aria-hidden
    >
      {name}
    </span>
  )
}
