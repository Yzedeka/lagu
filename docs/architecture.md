# Architecture

Lagu is an Electron application written in TypeScript, split cleanly into a
Node-side **main process**, a **preload** bridge and a React **renderer**. All
three share a typed contract in `src/shared`.

```
src/
  main/          Node: filesystem, scanning, metadata, persistence
    index.ts        app lifecycle and window
    ipc/            (ipc.ts) typed IPC handlers
    library.ts      library service: folders, scans, overrides, pins
    scanner.ts      directory walk + bounded-concurrency map
    metadata.ts     tags + artwork discovery
    lyrics.ts       LRC parsing and online lookup
    coverart.ts     online cover / artist-image lookup
    downloads.ts    yt-dlp search, download and library import
    protocol.ts     lagu:// media scheme (range requests)
    store.ts        persistence + user-visible data folder
  preload/       contextBridge -> window.lagu (typed)
  renderer/src/
    App.tsx         composition + theming + shortcuts
    components/     UI (Sidebar, NowPlaying, Browse, AlbumView, ...)
    icons/          every icon, easy to swap
    lib/            pure helpers (album grouping, formatting)
    player/         engine (audio + crossfade + 8D) and queue logic
    state/          React hooks (library, player, settings, artwork)
    theme/          palette extraction and CSS variables
    styles/         one stylesheet with theme tokens
  shared/        types, IPC channel names, media URL helpers
```

## Process model

- **Main** owns the filesystem: it scans folders, reads metadata, caches
  artwork, persists settings, and streams local audio through a custom
  `lagu://` protocol (with real HTTP range responses so seeking works).
- **Preload** exposes a single typed object, `window.lagu`, over
  `contextBridge`. `contextIsolation` is on and `nodeIntegration` is off - the
  renderer never touches Node directly.
- **Renderer** is a normal React app. It talks to the main process only through
  `window.lagu`.

Because every OS interaction goes through that one contract
(`src/shared/ipc.ts`), porting to another shell - Android, for example - means
implementing one bridge, not rewriting the app.

## Playback engine

`player/engine.ts` wraps two `HTMLAudioElement`s plus a Web Audio graph:

- **Local files** are routed element → gain → master → destination, with the
  master also feeding an `AnalyserNode`. Two elements allow a sample-accurate
  **crossfade**; the analyser powers the **visualizer**; a **panner node** in the
  chain provides **8D audio**.
- **Remote streams** stay on the native output path. Routing a cross-origin
  stream through Web Audio would silence it, so streams never crossfade and simply
  report no analyser data.
- The engine is a **module singleton**, because `createMediaElementSource` may
  only be called once per element.

The queue itself is pure logic (`player/queue.ts`) and is kept separate from the
audio engine, so shuffle, repeat and reordering are easy to reason about.

## Library indexing

`library.ts` keeps two maps: **base tracks** (raw scanned tags plus derived
assets like cached artwork) and **effective tracks** (base merged with your
overrides). Everything the UI sees is effective; reverting an edit is exact
because the base is untouched.

Scans stream results to the UI in batches and read metadata with bounded
concurrency, so large libraries never block the interface. A filesystem watcher
keeps folders live, and each change is debounced before the library refreshes.

## Theming

`theme/palette.ts` extracts a small palette from the current artwork (a coarse
colour histogram over a 48×48 canvas), then derives the accent, hover variant,
low-alpha fill, panel tint and a contrast-safe text colour, adapted to whether
the active theme is light or dark. The result is written to CSS custom properties
on the document root; the stylesheet is built entirely from those tokens, which
is why themes and artwork colours swap instantly.

## Persistence

`store.ts` writes plain JSON into `~/Lagu` (see
[Data & Storage](data-and-storage.md)) and regenerates a human-readable catalog
whenever the library changes.

## Dependencies

Deliberately small:

- **Electron 44**, **electron-vite 5**, **Vite 7**, **TypeScript 7**, **React 19**.
- **music-metadata** for tags and embedded artwork.
- **material-symbols** (icons) and **@fontsource-variable/inter** (text), both
  bundled locally so the app works offline.
- **electron-builder** for packaging.

Online features (cover/artist lookup, lyrics) use plain `fetch` against iTunes,
Deezer and LRCLIB - no API keys, and all opt-in.
