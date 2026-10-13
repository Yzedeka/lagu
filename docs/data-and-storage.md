# Data & Storage

Lagu keeps everything in a **user-visible folder** on your computer, not hidden
away in an app cache:

```
~/Lagu/
  settings.json     settings, library folders, queue, pins, hidden items, bios
  metadata.json     your metadata edits (overrides)
  library.json      the scanned track index
  lyrics/           every .lrc file (imported and auto-fetched online)
  artwork/          cached covers and artist images
  catalog/
    albums.json     the sorted album catalog, with track lists and file paths
    artists.json    the sorted artist catalog, with album lists
```

`~` is your home directory (`/home/you` on Linux, `/Users/you` on macOS,
`C:\Users\you` on Windows).

## What each file is

- **settings.json** - the app's configuration: your settings, the library folders
  you added, the current queue, pinned items, hidden tracks and artist bios.
- **metadata.json** - every metadata edit you made, keyed by file path. Deleting
  a track's entry reverts it to the file's real tags.
- **library.json** - the cached index of scanned tracks, so the library appears
  instantly on launch before a rescan.
- **lyrics/** - the `.lrc` files you imported plus any lyrics fetched online.
- **artwork/** - the covers and artist images Lagu has cached (embedded, from a
  folder, chosen by you, or fetched online).
- **catalog/** - a plain, human-readable snapshot of your library, regenerated
  whenever the library changes.

## The catalog

`catalog/albums.json` groups your music into albums:

```json
{
  "artist": "Radiohead",
  "album": "In Rainbows",
  "year": 2007,
  "trackCount": 10,
  "duration": 2540.5,
  "tracks": [
    { "title": "15 Step", "artist": "Radiohead", "trackNo": 1, "duration": 237.3, "file": "/music/..." }
  ]
}
```

`catalog/artists.json` groups it by artist:

```json
{ "name": "Radiohead", "trackCount": 10, "albums": ["In Rainbows"] }
```

It is a convenience export - delete it any time and Lagu will recreate it.

## Opening the folder

**Settings → Data → Open** reveals the folder in your file manager.

## Migration

If you used an earlier build, Lagu copies your existing settings, index, metadata,
artwork cache and lyrics cache into `~/Lagu` the first time it starts. Nothing is
deleted from the old location.

## Backups

Because everything is plain files under one folder, backing up Lagu means copying
`~/Lagu`. Your music itself is never touched.
