/**
 * Shared domain types used by both the Electron main process and the renderer.
 * Keep this file dependency-free so it can be imported from anywhere.
 */

export type TrackSource = 'file' | 'url'

export interface Track {
  /** Stable identifier. For files this is the absolute path; for URLs the URL. */
  id: string
  source: TrackSource
  /** Absolute filesystem path or remote URL. */
  locator: string
  title: string
  artist: string
  album: string
  albumArtist: string
  trackNo?: number
  discNo?: number
  year?: number
  genre: string[]
  /** Duration in seconds, when known. */
  duration?: number
  codec?: string
  bitrate?: number
  sampleRate?: number
  channels?: number
  lossless?: boolean
  /** True when embedded artwork was found and cached. */
  hasArtwork: boolean
  /** Cached artwork file name (relative to the artwork cache dir). */
  artworkFile?: string
  artworkMime?: string
  /** Effective per-track lyrics offset in ms (from a user override), if any. */
  lyricsOffset?: number
  /** Library folder that produced this track (empty for URL tracks). */
  folder: string
  addedAt: number
}

export interface LibraryFolder {
  id: string
  path: string
  addedAt: number
}

export type RepeatMode = 'off' | 'all' | 'one'

/** Visual themes. `dark` is the default charcoal, `black` is near-AMOLED. */
export type ThemeMode = 'dark' | 'light' | 'grey' | 'black'

export type AccentMode = 'artwork' | 'fixed'

export type Density = 'comfortable' | 'compact'

export type AlbumSort = 'artist' | 'name' | 'year' | 'added' | 'tracks'

/** An item pinned to the sidebar for quick access. */
export interface PinnedItem {
  id: string
  kind: 'track' | 'album' | 'artist'
  /** trackId for tracks, album key for albums, artist name for artists. */
  ref: string
  label: string
  subtitle?: string
}

/**
 * User edits applied on top of the scanned tags. Stored in the app, never
 * written back to the user's files.
 */
export interface TrackOverride {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  year?: number
  trackNo?: number
  genre?: string[]
  coverFile?: string
  coverMime?: string
  /** Where the cover came from - manual picks are never auto-overwritten. */
  coverSource?: 'user' | 'online'
  /** Per-track lyrics timing offset in ms, overriding the global setting. */
  lyricsOffset?: number
}

export interface MetadataPatch {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  year?: number | null
  trackNo?: number | null
  genre?: string[]
}

export interface AppSettings {
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  visualizer: boolean
  showSidebar: boolean
  showQueue: boolean
  showLyrics: boolean
  /** Visual theme. */
  theme: ThemeMode
  /** Derive the accent from artwork, or use a fixed colour. */
  accentMode: AccentMode
  /** Accent used when accentMode is 'fixed'. */
  accentColor: string
  /** Corner radius in px (0 keeps everything sharp). */
  radius: number
  density: Density
  /** Master switch for UI transitions/animations. */
  animations: boolean
  /** Crossfade between tracks, in seconds (0 disables). */
  crossfade: number
  /** Rotating 8D spatial audio effect. */
  eightD: boolean
  /** Look up lyrics online (enhanced LRC, falling back to plain). */
  autoLyrics: boolean
  /** Global lyrics timing offset in ms. Positive delays lyrics. */
  lyricsOffset: number
  /** Left sidebar width in px (user-resizable). */
  sidebarWidth: number
  /** Look up missing album art online (opt-in network feature). */
  fetchArtworkOnline: boolean
  /** Album grid sort field. */
  albumSort: AlbumSort
  /** Album grid sort direction (true = descending). */
  albumSortDesc: boolean
  /** Persisted renderer zoom level (Electron zoom level, 0 = 100%). */
  zoom: number
}

export interface QueueState {
  /** Track ids in play order. */
  order: string[]
  /** Index into `order` of the current track, or -1 when idle. */
  index: number
}

export interface PersistedState {
  folders: LibraryFolder[]
  settings: AppSettings
  tracks: Track[]
  queue: QueueState
  /** Track ids removed from the library (kept out of view, files untouched). */
  hidden: string[]
  /** Items pinned to the sidebar. */
  pinned: PinnedItem[]
  /** User-written artist bios, keyed by artist name. */
  artistBio: Record<string, string>
}

export interface ScanError {
  path: string
  message: string
}

export interface ScanProgress {
  scanning: boolean
  scanned: number
  /** Total files discovered so far (grows as directories are walked). */
  total: number
  current?: string
  folderId?: string
}

export interface UnsupportedFile {
  path: string
  extension: string
}

export interface LyricWord {
  /** Milliseconds from start. */
  time: number
  text: string
}

export interface LyricsLine {
  /** Milliseconds from start, or null for unsynchronized lyrics. */
  time: number | null
  text: string
  /** Word-level timings from Enhanced LRC (`<mm:ss.xx>` tags), when present. */
  words?: LyricWord[]
}

export interface Lyrics {
  /** True only when every line carries a timestamp. */
  synced: boolean
  source: 'lrc-file' | 'embedded' | 'online' | 'none'
  /** True when the lyrics came from a user-imported .lrc. */
  imported?: boolean
  /** True when word-level (Enhanced LRC) timings are available. */
  enhanced?: boolean
  lines: LyricsLine[]
  /** Plain text used when no timestamps are available. */
  plain?: string
}

export interface AddUrlResult {
  ok: boolean
  track?: Track
  error?: string
}

export interface LibraryState {
  folders: LibraryFolder[]
  tracks: Track[]
  scanning: boolean
}

/** Events pushed from main -> renderer. */
export interface LibraryEvents {
  'library:progress': ScanProgress
  'library:batch': { tracks: Track[]; unsupported: UnsupportedFile[] }
  'library:done': { total: number; unsupported: UnsupportedFile[]; errors: ScanError[] }
}

export interface AppStateSnapshot {
  folders: LibraryFolder[]
  tracks: Track[]
  settings: AppSettings
  queue: QueueState
}

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'none'
  | 'error'

export interface UpdateStatus {
  phase: UpdatePhase
  version?: string
  percent?: number
  error?: string
}
