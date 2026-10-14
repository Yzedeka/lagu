# Customization

Open **Settings** from the sidebar (or press **Ctrl + ,**). Everything here is
saved and restored between sessions. Settings are grouped into categories down
the left, with a **search box** that filters every option on the page.

## Appearance

| Setting | Options |
| --- | --- |
| **Theme** | Dark (charcoal), Light, Grey, Black (near-AMOLED) |
| **Accent colour** | Follow the artwork, or pick a fixed colour (presets + colour picker) |
| **Corner radius** | 0-8px; 0 keeps everything sharp |
| **Density** | Comfortable or Compact |
| **Font** | Inter (default), System UI, Serif, Monospace, Rounded |
| **Animations** | Master switch for transitions and view effects |
| **Performance mode** | Disables *every* animation, transition and visual extra (also hides the visualizer and backdrop blur) |
| **3D album covers** | Show albums as a sleeve with a record sticking out of the side (square corners while on) |
| **Interface zoom** | Zoom the whole UI, or reset it |
| **Sidebar width** | Set the sidebar width without dragging (150-440px) |

Accent colours are contrast-corrected per theme, so text stays readable whether
the artwork is bright, dark or somewhere in between. When a track has no artwork,
a consistent default accent is used.

## Panels

- **Show sidebar** / **Show queue** - toggle the secondary panels.
- **Queue style** - **Normal** (default) or **Compact** row density.
- **Queue width** - set the queue width without dragging (drag its edge too).
- **Audio visualizer** - show or hide the spectrum.

## Playback

- **8D audio** - rotating spatial effect (local files).
- **Now Playing disc mode** - show a spinning record with the cover in the middle
  instead of the sleeve.
- **Crossfade** - blend seconds between tracks (0 disables).
- **Scan on startup** - rescan your library folders each time Lagu launches.

## Lyrics

- **Auto-scan lyrics online** - fetch lyrics for tracks that have none.
- **Timing offset** - the default shift, in seconds, up to ten minutes.
- **Text size** - the lyric font size in the Now Playing view.
- **Alignment** - centre or left.

## Songs

- **Tracks** - how many songs are in your library.
- **Hidden items** - tracks you removed, with a **Restore** button.
- **Show track numbers** - toggle the number column in lists.
- **Default album sort** + **Sort direction** - how the Albums grid opens.

## Artwork

- **Look up covers online** - search iTunes/Deezer for missing artwork.
- **Fetch missing covers** - run the lookup over the whole library. Editing tags
  never changes covers on its own - only these actions do.

## Playlists

- Playlists live in the **Playlists** view. Right-click a playlist to **Set
  cover…**, **Remove cover**, **Pin to sidebar** or **Delete**.
- Playlists without a custom cover show the first track's artwork.

## Integrations

- **Discord Rich Presence** - show the track you're playing as your Discord
  status. Paste your own **Discord application ID** (create one at
  discord.com/developers) and have Discord running.

## Keybinds

Every keyboard action can be rebound. Click a binding, then press the key you
want (**Esc** cancels). **Reset keybinds** restores the defaults. The shortcuts
help overlay (**?**) always reflects your current bindings.

## Data

- **Data folder** - the location of everything Lagu stores, with an **Open**
  button.
- **Clear cover cache** - delete cached artwork (re-fetched when needed).
- **Clear lyrics cache** - delete downloaded lyrics; imported `.lrc` files are
  kept.
- **Reset all settings** - restore every option to its default.

## The sidebar

- **Drag its right edge** to resize it; when it gets slim the "Now Playing"
  label wraps to two lines and the footer controls shrink to fit.
- **Pin** artists, albums, tracks and playlists to it for quick access; each pin
  shows the album cover or artist image.
- The **Folders** section can be collapsed with its chevron, and the footer
  holds the search, settings and folder shortcuts. (Volume lives in the bottom
  bar.)

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
