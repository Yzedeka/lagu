# Getting Started

## Requirements

- **Node.js 20+** (developed against Node 26)
- **npm** (or pnpm/bun)
- Linux, macOS or Windows

## Run from source

```bash
npm install
npm run dev
```

`npm run dev` starts electron-vite with hot reload for the renderer and restarts
the main process on change.

> On some sandboxed environments the shell sets `ELECTRON_RUN_AS_NODE=1`, which
> makes Electron run as plain Node and crash with `electron.app is undefined`.
> Launch with `env -u ELECTRON_RUN_AS_NODE npm run dev` in that case.

## Build (unpackaged)

```bash
npm run build      # bundles main, preload and renderer into out/
npm run start      # runs the built app
```

## Build installers

```bash
npm run dist          # current platform
npm run dist:linux    # AppImage + .deb
npm run dist:win      # NSIS .exe
npm run dist:mac      # .app + .zip
npm run dist:all      # all three
```

Artifacts are written to `build/`. See
[Building & Packaging](building-and-packaging.md) for details.

## Check the code

```bash
npm run typecheck   # main + preload + renderer
```

## First launch

1. Lagu opens on **Folders** if your library is empty.
2. Click **Add folder** (the folder-plus icon in the sidebar) and pick a music
   folder. You can add as many as you like.
3. Lagu scans the folder, reads tags and artwork, and fills the library.
4. Pick a track, or open **Albums** / **Artists** to browse.

Everything you change is stored in a user-visible folder - see
[Data & Storage](data-and-storage.md).
