import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import type { AppSettings, PersistedState, PinnedItem, Playlist, Track, TrackOverride } from '@shared/types'
import { DEFAULT_KEYBINDINGS } from '@shared/keybinds'

/** Legacy file names (pre user-visible folder) used for one-time migration. */
const LEGACY = {
  state: 'lagu-state.json',
  index: 'lagu-index.json',
  overrides: 'metadata-overrides.json',
  artwork: 'artwork-cache',
  lyrics: 'lyrics-cache'
}

export const defaultSettings: AppSettings = {
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',
  visualizer: true,
  showSidebar: true,
  showQueue: true,
  showLyrics: false,
  theme: 'black',
  accentMode: 'artwork',
  accentColor: '#7d97b8',
  radius: 5,
  fontFamily: '',
  density: 'comfortable',
  animations: true,
  crossfade: 4,
  eightD: false,
  autoLyrics: true,
  lyricsOffset: 0,
  sidebarWidth: 212,
  queueWidth: 300,
  fetchArtworkOnline: true,
  downloadFolder: '',
  downloadFormat: 'mp3',
  downloadQuality: 'best',
  albumSort: 'artist',
  albumSortDesc: false,
  zoom: 1,
  lyricsFontSize: 20,
  lyricsAlign: 'center',
  showTrackNumbers: true,
  scanOnStartup: true,
  keybindings: { ...DEFAULT_KEYBINDINGS },
  performanceMode: false,
  nowPlayingDisc: false,
  queueMode: 'normal',
  cover3d: false,
  discordRpc: false,
  discordClientId: ''
}

/**
 * Crash-safe JSON file writes: data goes to a temp file first and is renamed
 * over the target, and the previous good version is kept as `<file>.bak`.
 * Writes to the same file are serialised so they can never interleave.
 */
const writeChains = new Map<string, Promise<void>>()

function writeFileAtomic(file: string, data: string): Promise<void> {
  const previous = writeChains.get(file) ?? Promise.resolve()
  const next = previous.then(async () => {
    const tmp = `${file}.tmp`
    const handle = await fs.open(tmp, 'w')
    try {
      await handle.writeFile(data, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    try {
      await fs.rename(file, `${file}.bak`)
    } catch {
      /* first write - nothing to back up */
    }
    await fs.rename(tmp, file)
  })
  const settled = next.catch(() => undefined)
  writeChains.set(file, settled)
  void settled.then(() => {
    if (writeChains.get(file) === settled) writeChains.delete(file)
  })
  return next
}

/**
 * Read a JSON file written by `writeFileAtomic`, falling back to its `.bak`.
 * A file that exists but does not parse is moved aside (never overwritten)
 * so the user's data can still be recovered by hand.
 */
async function readJsonSafe<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      const aside = `${file}.corrupt-${Date.now()}`
      console.error(`[lagu] could not read ${file}; moved it to ${aside}`, err)
      await fs.rename(file, aside).catch(() => undefined)
    }
  }
  try {
    return JSON.parse(await fs.readFile(`${file}.bak`, 'utf8')) as T
  } catch {
    return null
  }
}

function emptyState(): PersistedState {
  return {
    folders: [],
    settings: { ...defaultSettings },
    tracks: [],
    queue: { order: [], index: -1 },
    hidden: [],
    pinned: [],
    artistBio: {},
    playlists: []
  }
}

/** Filesystem-backed persistence for library folders, settings and queue. */
export class Store {
  /** User-visible data folder (e.g. ~/Lagu). */
  readonly dir: string
  private readonly legacyDir: string
  private readonly statePath: string
  private readonly indexPath: string
  private readonly overridesPath: string
  readonly artworkDir: string
  readonly lyricsDir: string
  readonly catalogDir: string
  private state: PersistedState = emptyState()
  private overrides: Record<string, TrackOverride> = {}
  private saveTimer: NodeJS.Timeout | null = null
  private indexTimer: NodeJS.Timeout | null = null

  constructor() {
    this.legacyDir = app.getPath('userData')
    this.dir = path.join(app.getPath('home'), 'Lagu')
    this.statePath = path.join(this.dir, 'settings.json')
    this.indexPath = path.join(this.dir, 'library.json')
    this.overridesPath = path.join(this.dir, 'metadata.json')
    this.artworkDir = path.join(this.dir, 'artwork')
    this.lyricsDir = path.join(this.dir, 'lyrics')
    this.catalogDir = path.join(this.dir, 'catalog')
  }

  /** Human-readable album/artist catalog written alongside the config. */
  async writeCatalog(albums: unknown, artists: unknown): Promise<void> {
    try {
      await fs.writeFile(
        path.join(this.catalogDir, 'albums.json'),
        JSON.stringify(albums, null, 2),
        'utf8'
      )
      await fs.writeFile(
        path.join(this.catalogDir, 'artists.json'),
        JSON.stringify(artists, null, 2),
        'utf8'
      )
    } catch (err) {
      console.error('[lagu] failed to write catalog', err)
    }
  }

  private async migrateLegacy(): Promise<void> {
    const copies: [string, string][] = [
      [path.join(this.legacyDir, LEGACY.state), this.statePath],
      [path.join(this.legacyDir, LEGACY.index), this.indexPath],
      [path.join(this.legacyDir, LEGACY.overrides), this.overridesPath]
    ]
    for (const [from, to] of copies) {
      try {
        await fs.access(to)
        continue // already migrated / fresh
      } catch {
        /* target missing */
      }
      try {
        await fs.copyFile(from, to)
      } catch {
        /* no legacy file */
      }
    }
    await this.migrateDir(path.join(this.legacyDir, LEGACY.artwork), this.artworkDir)
    await this.migrateDir(path.join(this.legacyDir, LEGACY.lyrics), this.lyricsDir)
  }

  private async migrateDir(from: string, to: string): Promise<void> {
    try {
      const entries = await fs.readdir(from, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) continue
        const target = path.join(to, entry.name)
        try {
          await fs.access(target)
        } catch {
          await fs.copyFile(path.join(from, entry.name), target).catch(() => undefined)
        }
      }
    } catch {
      /* no legacy cache */
    }
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true })
    await fs.mkdir(this.artworkDir, { recursive: true })
    await fs.mkdir(this.lyricsDir, { recursive: true })
    await fs.mkdir(this.catalogDir, { recursive: true })
    await this.migrateLegacy()
    await this.load()
  }

  /** Absolute path of a user-imported .lrc for a track (kept outside the library). */
  importedLyricsPath(trackId: string): string {
    return path.join(this.lyricsDir, `${this.hashPath(trackId)}.lrc`)
  }

  async readImportedLyrics(trackId: string): Promise<string | null> {
    try {
      return await fs.readFile(this.importedLyricsPath(trackId), 'utf8')
    } catch {
      return null
    }
  }

  async writeImportedLyrics(trackId: string, content: string): Promise<void> {
    await fs.mkdir(this.lyricsDir, { recursive: true })
    await fs.writeFile(this.importedLyricsPath(trackId), content, 'utf8')
  }

  async removeImportedLyrics(trackId: string): Promise<void> {
    try {
      await fs.unlink(this.importedLyricsPath(trackId))
    } catch {
      /* already gone */
    }
  }

  /** Cache path for lyrics fetched online (kept separate from user imports). */
  onlineLyricsPath(trackId: string): string {
    return path.join(this.lyricsDir, `online-${this.hashPath(trackId)}.lrc`)
  }

  async readOnlineLyrics(trackId: string): Promise<string | null> {
    try {
      return await fs.readFile(this.onlineLyricsPath(trackId), 'utf8')
    } catch {
      return null
    }
  }

  async writeOnlineLyrics(trackId: string, content: string): Promise<void> {
    await fs.mkdir(this.lyricsDir, { recursive: true })
    await fs.writeFile(this.onlineLyricsPath(trackId), content, 'utf8')
  }

  private async load(): Promise<void> {
    const base = emptyState()
    const parsed = await readJsonSafe<Partial<PersistedState>>(this.statePath)
    this.state = parsed
      ? {
          folders: parsed.folders ?? base.folders,
          settings: { ...base.settings, ...(parsed.settings ?? {}) },
          tracks: parsed.tracks ?? base.tracks,
          queue: parsed.queue ?? base.queue,
          hidden: parsed.hidden ?? base.hidden,
          pinned: parsed.pinned ?? base.pinned,
          artistBio: parsed.artistBio ?? base.artistBio,
          playlists: parsed.playlists ?? base.playlists
        }
      : base
    // The track index can be large; keep it separate from the small state file.
    const index = await readJsonSafe<{ tracks?: Track[] }>(this.indexPath)
    if (index && Array.isArray(index.tracks) && index.tracks.length > 0) {
      this.state.tracks = index.tracks
    }
    // User metadata edits (kept out of the user's files).
    this.overrides = (await readJsonSafe<Record<string, TrackOverride>>(this.overridesPath)) ?? {}
  }

  /** Artwork-folder files that user edits point at (must survive cache clears). */
  referencedArtworkFiles(): Set<string> {
    const files = new Set<string>()
    for (const override of Object.values(this.overrides)) {
      if (override.coverFile) files.add(override.coverFile)
    }
    for (const playlist of this.state.playlists) {
      if (playlist.cover) files.add(playlist.cover)
    }
    return files
  }

  getOverride(trackId: string): TrackOverride | undefined {
    return this.overrides[trackId]
  }

  setOverride(trackId: string, patch: TrackOverride): void {
    this.overrides[trackId] = { ...this.overrides[trackId], ...patch }
    void this.writeOverrides()
  }

  replaceOverride(trackId: string, override: TrackOverride): void {
    this.overrides[trackId] = override
    void this.writeOverrides()
  }

  clearOverride(trackId: string): void {
    if (!this.overrides[trackId]) return
    delete this.overrides[trackId]
    void this.writeOverrides()
  }

  private async writeOverrides(): Promise<void> {
    try {
      await writeFileAtomic(this.overridesPath, JSON.stringify(this.overrides, null, 2))
    } catch (err) {
      console.error('[lagu] failed to persist metadata overrides', err)
    }
  }

  get snapshot(): PersistedState {
    return this.state
  }

  get folders() {
    return this.state.folders
  }

  get settings(): AppSettings {
    return this.state.settings
  }

  get tracks(): Track[] {
    return this.state.tracks
  }

  get hidden(): string[] {
    return this.state.hidden
  }

  isHidden(trackId: string): boolean {
    return this.state.hidden.includes(trackId)
  }

  hideTracks(trackIds: string[]): void {
    const set = new Set(this.state.hidden)
    for (const id of trackIds) set.add(id)
    this.state.hidden = [...set]
    this.scheduleSave()
  }

  clearHidden(): void {
    this.state.hidden = []
    this.scheduleSave()
  }

  get pinned(): PinnedItem[] {
    return this.state.pinned
  }

  setPinned(pinned: PinnedItem[]): void {
    this.state.pinned = pinned
    this.scheduleSave()
  }

  get playlists(): Playlist[] {
    return this.state.playlists
  }

  setPlaylists(playlists: Playlist[]): void {
    this.state.playlists = playlists
    this.scheduleSave()
  }

  getArtistBio(name: string): string {
    return this.state.artistBio[name] ?? ''
  }

  getAllArtistBios(): Record<string, string> {
    return { ...this.state.artistBio }
  }

  setArtistBio(name: string, text: string): string {
    const trimmed = text.trim()
    if (trimmed) this.state.artistBio[name] = trimmed
    else delete this.state.artistBio[name]
    this.scheduleSave()
    return this.state.artistBio[name] ?? ''
  }

  get queue() {
    return this.state.queue
  }

  setTracks(tracks: Track[]): void {
    this.state.tracks = tracks
    // The index is rewritten in full, so coalesce bursts (scans, artwork lookups).
    if (this.indexTimer) clearTimeout(this.indexTimer)
    this.indexTimer = setTimeout(() => {
      this.indexTimer = null
      void this.writeIndex()
    }, 1000)
  }

  updateSettings(patch: Partial<AppSettings>): AppSettings {
    this.state.settings = { ...this.state.settings, ...patch }
    this.scheduleSave()
    return this.state.settings
  }

  resetSettings(): AppSettings {
    this.state.settings = { ...defaultSettings }
    this.scheduleSave()
    return this.state.settings
  }

  setFolders(folders: PersistedState['folders']): void {
    this.state.folders = folders
    this.scheduleSave()
  }

  setQueue(queue: PersistedState['queue']): void {
    this.state.queue = queue
    this.scheduleSave()
  }

  /** Absolute path for a cached artwork file, keyed by a content hash. */
  artworkPath(hash: string): string {
    return path.join(this.artworkDir, `${hash}.bin`)
  }

  hashPath(locator: string): string {
    return createHash('sha1').update(locator).digest('hex')
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      void this.writeState()
    }, 300)
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (this.indexTimer) {
      clearTimeout(this.indexTimer)
      this.indexTimer = null
    }
    await this.writeState()
    await this.writeIndex()
    await this.writeOverrides()
  }

  private async writeState(): Promise<void> {
    const rest = {
      folders: this.state.folders,
      settings: this.state.settings,
      queue: this.state.queue,
      hidden: this.state.hidden,
      pinned: this.state.pinned,
      artistBio: this.state.artistBio,
      playlists: this.state.playlists
    }
    try {
      await writeFileAtomic(this.statePath, JSON.stringify(rest, null, 2))
    } catch (err) {
      console.error('[lagu] failed to persist state', err)
    }
  }

  private async writeIndex(): Promise<void> {
    try {
      await writeFileAtomic(this.indexPath, JSON.stringify({ tracks: this.state.tracks }))
    } catch (err) {
      console.error('[lagu] failed to persist index', err)
    }
  }
}
