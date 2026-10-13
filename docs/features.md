# Features

## Music library

- Add **multiple library folders**; each is scanned recursively.
- **Rescan** on demand, or let the built-in watcher pick up changes live - drop a
  new file into a watched folder and it appears (and is playable) almost
  instantly.
- Browse the same music four ways:
  - **Library** - a searchable grid of every song (with a grid / list toggle),
    matching titles, artists and albums as you type.
  - **Albums** - an artwork grid, with a sort menu (Artist, Album name, Year,
    Recently added, Track count, ascending/descending).
  - **Artists** - artist cards with profile art, a short bio and album/track
    counts that open a full artist profile.
  - **Folders** - the folders you added, with track counts and durations.
- **Search** from the sidebar (type and press Enter) or live in the Library.
- **Pins** - pin artists, albums and tracks to the sidebar for one-click access.
- Your files are **never moved, renamed or modified**.

## Playback

- Play/pause, previous/next, seek, and volume with mute.
- A **persistent Queue** you can reorder by dragging and prune with a click; it
  is restored between sessions.
- **Shuffle** and **repeat** (off / all / one).
- **Crossfade** between tracks (configurable, 0-20 seconds).
- **8D audio** - a rotating spatial effect for local files.
- The player survives a library rescan: your place in the queue is kept.

## Artwork & theming

- Embedded artwork is read from tags, with a **folder-art fallback**
  (`cover.jpg`, `folder.png`, `front.jpg`, an image named after the album, or any
  image in the folder - searched up the folder tree).
- **Online lookup** (opt-in) searches iTunes and Deezer for missing covers.
- The dominant colours of the current artwork drive the interface accent,
  progress bars, selected controls and visualizer bars.
- Four themes: **Dark**, **Light**, **Grey** and **Black** (near-AMOLED).

## Lyrics

- **Line-by-line** synchronized lyrics from `.lrc` files, embedded tags or
  online sources.
- **Word-by-word (Enhanced LRC)** highlighting when timestamps are available.
- A **global timing offset** plus **per-track offsets**.
- **Auto-scan** (opt-in) that fetches lyrics online for tracks that have none,
  preferring word-level, falling back to line-level, then plain.
- Graceful handling of missing or unsynchronized lyrics - it never pretends
  lyrics are synced when they are not.

## Editing

Right-click a track, album or artist to:

- **Edit** title, artist, album, album artist, year and track number.
- **Set cover** from a local image.
- **Find cover online**.
- **Import .lrc** / **Remove .lrc** / **Edit .lrc** timing.
- **Rename artist** across all of their tracks.
- **Remove from library** (reversible) or **Delete files** (moves to the system
  trash, with confirmation).

Edits are stored as overrides in the app - the files themselves are untouched.

## Interface

- Compact three-part layout: sidebar, main area, queue panel.
- **Resizable sidebar and queue** (drag their edges). The queue gets slimmer as
  you drag - it drops row timestamps, then titles, then the "Queue" label, down
  to just the cover and drag handle.
- A **collapsible Folders** section, and a compact footer with search, settings,
  volume (hover for a vertical slider) and folder shortcuts.
- The **Now Playing** view has the artwork front and centre with a pill-shaped
  seek bar; lyrics render on the background, not in a box.
- A **bottom bar** with the play button on the left, the seek bar and times in
  the middle, and transport plus utilities on the right.
- In **fullscreen Now Playing** the bottom bar auto-hides and pops up when you
  move the mouse to the bottom edge.
- Secondary panels (sidebar, queue) can be hidden for an even more minimal view.

## Personalization

- **Custom keybinds** - rebind every keyboard action from Settings → Keybinds.
- **Performance mode** - one switch that removes all animations, transitions and
  visual extras for the smoothest possible experience on low-end machines.
- A **categorized, searchable Settings** page with cache management and a
  full reset.
