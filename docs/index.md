# Lagu Music Player

**Lagu** is a minimalist, fast desktop music player for your local library. It is
built as a real desktop application - sharp edges, subtle borders, restrained
contrast - and treats **album artwork as the visual centrepiece**, letting each
cover tint the interface with its own accent colours.

It is not a Spotify clone and not a web dashboard. It is a small, practical tool
for people who keep their music on disk.

> Version 0.4.1 (b0.4.1) - source available - built with Electron, React and TypeScript.

## What it does

- **Local library** - add any number of folders, scan them, and browse by
  Library, Albums, Artists, Playlists and Folders. Your files are never moved,
  renamed or modified.
- **Real playback** - play/pause, previous/next, seek, volume, a persistent
  **Queue** you can reorder, plus shuffle and repeat.
- **Playlists** - build your own collections, give them custom covers, pin and
  search them.
- **Open with Lagu** - set it as your default audio app; files open and play.
- **Downloads** - search YouTube through yt-dlp and save tracks as MP3, M4A or
  Opus into the folder you choose.
- **Custom keybinds** - rebind any keyboard action, or flick on **Performance
  mode** to strip every animation.
- **Dynamic theming** - the dominant colours of the current artwork become the
  interface accent. Four themes, a fixed-accent option, a choice of fonts, and
  optional **3D album covers**.
- **Slim visualizer** - a subtle, rounded spectrum that reacts to the audio and
  borrows its colour from the artwork.
- **Synchronized lyrics** - line-by-line and **word-by-word (Enhanced LRC)**,
  with a per-track timing offset and optional online lookup.
- **Editing** - fix titles, artists, albums, years and covers without touching
  the files.
- **Crossfade & 8D audio** - blend tracks together, or rotate the sound around
  your head.
- **Discord Rich Presence** - show what you're playing as your Discord status.
- **Pins** - keep artists, albums, tracks and playlists one click away.

## Documentation

| Guide | What's inside |
| --- | --- |
| [Getting Started](getting-started.md) | Install, run and build from source |
| [Features](features.md) | Everything the player can do |
| [Library & Metadata](library-and-metadata.md) | Scanning, tags, artwork and editing |
| [Playback](playback.md) | Queue, crossfade, 8D audio and the visualizer |
| [Lyrics](lyrics.md) | LRC, Enhanced LRC, offsets and online lookup |
| [Customization](customization.md) | Themes, settings, icons and layout |
| [Keyboard Shortcuts](shortcuts.md) | Every shortcut in one table |
| [Data & Storage](data-and-storage.md) | The `~/Lagu` folder and its catalog |
| [Architecture](architecture.md) | How the app is put together |
| [Building & Packaging](building-and-packaging.md) | AppImage, deb, exe, app and the APK plan |
| [Limitations](limitations.md) | Formats and platform notes |

## Design philosophy

- Minimalist, clean and practical.
- Sharp edges and subtle borders - no excessive rounding.
- Dark charcoal interface with restrained contrast.
- No unnecessary animations, gradients, cards or decorative clutter.
- Icons instead of emoji.
- Compact, but album artwork stays the focus.
- Text stays readable no matter what colours the artwork throws at it.
