# Limitations

Lagu is honest about what it cannot do. These are the real constraints, not
hand-waving.

## Audio formats

Playback uses Chromium's decoders, so the following play natively:

`mp3`, `m4a`, `m4b`, `aac`, `flac`, `ogg`, `oga`, `opus`, `wav`, `weba`, `mp4`,
`m4v`, `mov`, `webm`, `3gp`, `3g2`.

Formats Chromium cannot decode are **not** played and are reported in the UI as
unsupported rather than silently ignored:

`wma`, `ape`, `aiff`, `aif`, `dsf`, `dff`, `mpc`, `wv`, `tta`, `mka`, `caf`,
`ra`, `ram`, `mid`, `midi`.

There is no transcoding step. If you need WMA/APE/AIFF/DSD support, that would be
an ffmpeg-backed feature - deliberately left out to keep the app small and
reliable.

### Video containers

MP4 and MOV files are indexed and their **audio** tracks play. There is no video
playback.

## Online features are opt-in

Nothing touches the network unless you enable it. Cover lookup, artist images and
lyrics are all off by default and gated behind their settings.

- **Cover/artist lookup** uses iTunes and Deezer. Artist "images" come from
  Deezer; for some artists Deezer itself returns album artwork as the artist
  picture, so that is what you will see.
- **Lyrics** use LRCLIB. Word-level (Enhanced) LRC is only used when a source
  actually provides it; otherwise you get line-level, then plain.

## Remote streams

Streams play on the native output path. A cross-origin stream routed through Web
Audio would be silenced, so streams:

- do not crossfade,
- do not drive the visualizer,
- have no analyser data.

If a remote server does not support range requests, seeking on that stream may be
limited.

## Lyrics

- Synchronization depends on the source. Untimed lyrics are shown as plain text
  with a clear note - Lagu never claims sync it does not have.
- The global offset applies to all tracks; per-track offsets override it.
- Lyrics are matched by artist/title, so unusual spellings can miss.

## Editing

- Metadata edits are **app-side overrides**, not written into your files. Your
  original files are never modified, which also means the edits are only visible
  inside Lagu.
- **Delete files** moves files to the system trash (with a confirmation) rather
  than erasing them permanently.

## Platform notes

- Cross-built Windows/macOS packages are **unsigned**; signing must be done on
  the target OS or in CI.
- On **native Wayland**, the taskbar icon comes from the desktop entry (app id),
  not the icon a client sets, so the window icon may not appear there. Under
  X11/XWayland it does.
- The bundled icon font (Material Symbols) is the full variable font (~5 MB). It
  could be subset later if bundle size matters.
