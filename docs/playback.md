# Playback

## The queue

Playing a track from any list loads that list into the **Queue** and
starts at the chosen track. The queue is a real, editable list:

- **Reorder** by dragging a row.
- **Remove** a row with its close button.
- **Play next** / **Add to queue** from any track's right-click menu or row
  hover buttons.
- The queue and your position in it are **restored between sessions**.
- Choose its density in Settings → Panels: **Normal** (default) or **Compact**,
  and drag its left edge to resize. Its total runtime sits in the panel header.

## Shuffle and repeat

- **Shuffle** reorders playback so the current track stays put and the rest are
  randomised.
- **Repeat** cycles off → all → one. Repeat-one restarts the track when it ends.

## Crossfade

Blend the end of a track into the next one, like a DJ.

- Configure it in **Settings → Playback → Crossfade** in seconds (0 disables,
  up to 20). The default is 4 seconds.
- Implemented with two audio elements routed through the Web Audio graph, so the
  fade is sample-accurate.
- Very short tracks are guarded so a crossfade can never skip them, and remote
  streams (which stay on the native output path) are not crossfaded.

## 8D audio

**Settings → Playback → 8D audio** (off by default) rotates the sound around your
head using an HRTF panner node - one revolution roughly every 12 seconds.

- Applies to **local files** (they run through Web Audio).
- Remote streams are unaffected, since routing a cross-origin stream through Web
  Audio would silence it.

## Visualizer

A slim, rounded spectrum sits under the controls in Now Playing and in the bottom
bar.

- Bars react to the live audio via an `AnalyserNode` and ease smoothly between
  frames.
- Bar colour is derived from the current artwork's accent.
- Turn it off in **Settings → Motion & panels → Audio visualizer**.

## Seeking

Drag the pill-shaped progress bar in Now Playing or the bar in the bottom bar.
The elapsed time is shown on the left and the total duration on the right. Lagu
prefers the **tagged duration**, so a seven-minute track reads `7:00`
immediately instead of the audio element's early estimate.

## Unavailable files

If a file cannot be played (missing, moved, or an unsupported codec inside a
supported container), the player shows a clear inline error instead of failing
silently, and playback moves on with the queue intact.
