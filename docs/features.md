# Features

## Music library

- Add **multiple library folders**; each is scanned recursively.
- **Rescan** on demand, or let the built-in watcher pick up changes live - drop a
  new file into a watched folder and it appears (and is playable) almost
  instantly.
- Browse the same music four ways:
  - **Library** - a searchable grid of every song (with a grid / list toggle),
    matching titles, artists and albums as you type.
  - **Albums** - a large artwork grid, with a sort menu (Artist, Album name,
    Year, Recently added, Track count, ascending/descending).
  - **Artists** - artist cards with profile art, a short bio and album/track
    counts that open a full artist profile.
  - **Playlists** - your own playlists, with custom covers (see below).
  - **Folders** - the folders you added, with track counts and durations.
- **Global search** from the sidebar: as you type, a results panel appears with
  **Playlists**, **Artists**, **Albums** and **Songs** - click any result to open
  or play it.
- **Pins** - pin artists, albums, tracks and playlists to the sidebar.
- Your files are **never moved, renamed or modified**.

## Downloads

- **Download music** from the sidebar (cloud icon next to **Add stream URL**).
- Search YouTube through **yt-dlp**, pick a result and save it as **MP3, M4A or
  Opus** at the quality you choose (Best, 320, 192 or 128 kbps).
- Paste a **YouTube playlist or album link** to download the whole collection
  into its own subfolder, with per-item and overall progress.
- Choose a destination folder per download, or set a **default folder, format
  and quality** in **Settings → Downloads**.
- Finished tracks are added to the library automatically and never start
  playing on their own. **yt-dlp and ffmpeg are bundled** with packaged builds.
- Source builds fall back to system tools, or you can fetch them with
  `npm run fetch:ytdlp`.

## Playlists

- Create playlists and add tracks from the right-click menu on a song, album or
  artist (**Add to playlist…**).
- Rename, delete and reorder-free manage them; each playlist has its own cover,
  which you can **set from a local image** or leave to show the first track's art.
- **Pin playlists** to the sidebar and search them like anything else.

## Playback

- Play/pause, previous/next, seek, and volume with mute.
- A **persistent Queue** you can reorder by dragging and prune with a click; it
  is restored between sessions. Its total runtime is shown in the panel header.
- The queue has **no visible scrollbar**; the narrowest layouts drop artwork and
  metadata instead of clipping the title.
- Three queue densities in Settings - **Normal** (default) and **Compact** - plus
  a **resizable width** (drag its edge).
- **Shuffle** and **repeat** (off / all / one).
- **Crossfade** between tracks (configurable, 0-20 seconds).
- **8D audio** - a smooth, rotating spatial effect for local files.
- **Open audio files with Lagu** - set it as your default music app and files
  open straight into the player.
- The player survives a library rescan: your place in the queue is kept.

## Artwork & theming

- Embedded artwork is read from tags, with a **folder-art fallback**
  (`cover.jpg`, `folder.png`, `front.jpg`, an image named after the album, or any
  image in the folder - searched up the folder tree).
- **Online lookup** (opt-in) searches iTunes and Deezer for missing covers. It
  only ever runs when you ask - editing tags never changes your covers.
- The dominant colours of the current artwork drive the interface accent,
  progress bars, selected controls and visualizer bars.
- **3D album covers** - an optional mode that shows each album as a sleeve with a
  record sticking out of the side, spinning on hover, with the cover on the
  record's label.
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
- **Add to playlist…**.
- **Remove from library** (reversible) or **Delete files** (moves to the system
  trash, with confirmation).

Edits are stored as overrides in the app - the files themselves are untouched.

## Interface

- Compact three-part layout: sidebar, main area, queue panel.
- A **collapsible Folders** section and a footer with search, settings and folder
  shortcuts.
- A redesigned **bottom bar**: the playing track and visualizer on the left,
  shuffle/previous/next/repeat, the **centered timeline**, then the lyrics, `.lrc`
  editor, **volume** (horizontal) and fullscreen/queue controls on the right.
- **Now Playing** puts the artwork front and centre; lyrics render on the
  background, not in a box. An optional **disc mode** shows a spinning record
  with the cover in the middle instead of the sleeve.
- **Resizable sidebar and queue** (drag their edges).
- In **fullscreen Now Playing** the bottom bar auto-hides and pops up when you
  move the mouse to the bottom edge.

## Personalization

- **Custom keybinds** - rebind every keyboard action from Settings → Keybinds.
- **Font** - pick the interface typeface (Inter, System, Serif, Monospace,
  Rounded).
- **Performance mode** - one switch that removes all animations, transitions and
  visual extras for the smoothest possible experience on low-end machines.
- **Discord Rich Presence** - show the track you're playing as your Discord
  status (requires your own Discord application ID).
- A **categorized, searchable Settings** page with cache management and a
  full reset.
