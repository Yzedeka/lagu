# Lyrics

Lagu shows synchronized lyrics over the Now Playing artwork. Open them with the
lyrics button in the bottom bar, or press **L**.

## Where lyrics come from

In order of preference:

1. **User-imported `.lrc`** (you pick a file; it is copied into the app, never
   into your music folders).
2. **Sidecar `.lrc`** next to the audio file (`Song.lrc`).
3. **Embedded** lyrics in the tags.
4. **Online** lyrics fetched earlier (cached).

Local lyrics always win over online ones.

## Synchronized and unsynchronized

- **Line-by-line** lyrics highlight the current line and dim the rest, scrolling
  as the song plays.
- **Word-by-word** lyrics (Enhanced LRC) highlight each word as it is sung.
- Plain, untimed lyrics are shown as text with a clear note that they are **not
  synchronized** - Lagu never pretends timestamps exist when they do not.

## Enhanced LRC (word-for-word)

Enhanced LRC adds word timestamps inside each line:

```
[00:12.00]<00:12.00>Words <00:12.40>appear <00:12.90>one <00:13.30>by <00:13.80>one
```

Lagu parses these automatically and switches to word highlighting for that line.

## Timing offset

If lyrics drift out of sync:

- **Global offset** - **Settings → Lyrics → Timing offset**, in seconds, up to
  ten minutes either way. This is the default for every track.
- **Per-track offset** - open the pencil (**Edit .lrc**) in the lyrics view, or
  use **Edit .lrc** in a track's right-click menu. A per-track offset **overrides**
  the global one for that track only, and you can reset it back to the default.

## Importing and removing `.lrc`

These live in the **track right-click menu**:

- **Import .lrc** - choose a `.lrc` file; it is copied into the app's lyrics
  cache.
- **Remove .lrc** - drop the imported lyrics and fall back to sidecar/embedded.
- **Edit .lrc** - set the per-track timing offset.

## Auto-scan for lyrics online

**Settings → Lyrics → Auto-scan lyrics online** (off by default). When a track
has no local lyrics, Lagu searches **LRCLIB** and:

- prefers **word-level (Enhanced) LRC**,
- falls back to **line-level** synchronized lyrics,
- then to **plain** lyrics if nothing is timed.

Results are cached to disk, tagged as `online`, and never overwrite your own
imports or local files.
