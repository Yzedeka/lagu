# Customization

Open **Settings** from the sidebar (or press **Ctrl + ,**). Everything here is
saved and restored between sessions.

## Appearance

| Setting | Options |
| --- | --- |
| **Theme** | Dark (charcoal), Light, Grey, Black (near-AMOLED) |
| **Accent colour** | Follow the artwork, or pick a fixed colour (presets + colour picker) |
| **Corner radius** | 0-8px; 0 keeps everything sharp |
| **Density** | Comfortable or Compact |

Accent colours are contrast-corrected per theme, so text stays readable whether
the artwork is bright, dark or somewhere in between. When a track has no artwork,
a consistent default accent is used.

## Motion & panels

- **Animations** - master switch for transitions and view effects.
- **Audio visualizer** - show or hide the spectrum.
- **Show sidebar** / **Show queue** - toggle the secondary panels.

## Playback

- **8D audio** - rotating spatial effect (local files).
- **Crossfade** - blend seconds between tracks (0 disables).

## Lyrics

- **Auto-scan lyrics online** - fetch lyrics for tracks that have none.
- **Timing offset** - the default shift, in seconds, up to ten minutes.

## Album art

- **Look up covers online** - search iTunes/Deezer for missing artwork.
- **Fetch missing covers** - run the lookup over the whole library.

## Library

- **Hidden items** - tracks you removed from the library, with a **Restore**
  button.

## Data

- **Data folder** - the location of everything Lagu stores, with an **Open**
  button.

## Interface zoom

- Zoom the whole interface in and out, or reset it. Also available with
  **Ctrl + =**, **Ctrl + -** and **Ctrl + 0**.

## The sidebar

- **Drag its right edge** to resize it (150-440px).
- **Pin** artists, albums and tracks to it for quick access; each pin shows the
  album cover or artist image.
- The top-left shows the app icon and wordmark, centred.

## Icons

Every icon lives in **`src/renderer/src/icons/`**:

- `Icon.tsx` - the base renderer, which draws a Material Symbols glyph by name.
- `index.tsx` - one export per icon.

To change an icon, either swap the glyph name (any name from
[fonts.google.com/icons](https://fonts.google.com/icons) works):

```tsx
export const PlayIcon = (p: IconProps) => <Icon name="play_circle" filled {...p} />
```

...or return your own SVG - the only contract is that it accepts `IconProps`.
`Icon` and `IconProps` are re-exported for exactly this.

## Artwork-driven accents

When a track starts, Lagu extracts a small palette from its artwork (a coarse
colour histogram over a downscaled canvas), picks the most usable colour, and
derives the accent, a brighter hover variant, a low-alpha fill and a panel tint
from it - clamped so contrast stays comfortable on the active theme.
