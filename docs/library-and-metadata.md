# Library & Metadata

## Adding folders

Use **Add folder** in the sidebar (the folder-plus icon next to "Folders"). You
can add several folders; each is scanned independently and remembered between
sessions. Removing a folder from the library **never deletes its files** - it
just stops indexing them.

## Scanning

The scanner walks each folder recursively, skipping hidden entries and symlinked
directories (to avoid loops). It reads metadata with bounded concurrency so the
interface stays responsive while it works, and streams results to the UI in
batches. A slim progress indicator shows `scanned / total`.

A **filesystem watcher** runs on every library folder, so new, changed or removed
files are picked up automatically without a manual rescan.

## Supported audio formats

| Kind | Extensions |
| --- | --- |
| Native playback | `mp3`, `m4a`, `m4b`, `aac`, `flac`, `ogg`, `oga`, `opus`, `wav`, `weba`, `mp4`, `m4v`, `mov`, `webm`, `3gp`, `3g2` |

MP4 and MOV files are indexed and their audio tracks play. Formats Chromium
cannot decode (`wma`, `ape`, `aiff`, `dsf`, `dff`, and others) are **detected and
reported** as unsupported instead of being silently dropped - see
[Limitations](limitations.md).

## Metadata

Tags are read from the file (`music-metadata`): title, artist, album, album
artist, track/disc number, year, genre, duration, codec, bitrate, sample rate and
channels.

When tags are missing, Lagu fills the gaps sensibly:

- **Filename inference** - `01 - Artist - Title`, `Artist - Title`, `01. Title`.
- **Album from the folder name** when no album tag exists.

## Artwork

Artwork is found in this order:

1. **Embedded** picture in the file's tags.
2. **Folder artwork** next to the file, then walking up towards the library root
   (up to four levels). It looks for conventional names - `cover`, `folder`,
   `front`, `album`, `albumart`, `artwork`, `thumb`, `coverart`, `folderart`,
   `poster` (including prefixed variants like `cover-front.jpg`) - then an image
   named after the folder, then any image.
3. **Online lookup** (opt-in) against iTunes and Deezer.

Cached artwork is stored in the app data folder, keyed so that an album's cover is
only downloaded once.

### Online cover lookup

Enable **Settings → Album art → Look up covers online** (off by default). Once
enabled:

- Tracks missing artwork are looked up during scans and for newly added files.
- A **Fetch missing covers** button processes the whole library with progress.
- Per-track/album **Find cover online** actions appear in the right-click menus.
- Results are scored against artist, album and title (with generic words like
  "song" filtered out) so a wrong cover is rejected rather than applied.
- **Editing metadata re-runs the lookup** for the new artist/album/title, so
  corrections pull the right cover. Manually chosen covers are never
  overwritten, and embedded/folder art is respected.

## Editing metadata

Right-click a track or album and choose **Edit**. You can change title, artist,
album, album artist, year and track number. Renaming an artist also updates the
album artist when they matched, so the track immediately re-files under the new
artist and album.

> Edits are **overrides stored in the app** (`metadata.json` in the data folder) -
> your files are never modified. **Reset** in the edit dialog discards the
> overrides and falls back to the file's real tags.
