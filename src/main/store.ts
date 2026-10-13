import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import type { AppSettings, PersistedState, PinnedItem, Track, TrackOverride } from '@shared/types'

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
  theme: 'dark',
  accentMode: 'artwork',
  accentColor: '#7d97b8',
  radius: 3,
  density: 'comfortable',
  animations: true,
  crossfade: 4,
  eightD: false,
  autoLyrics: false,
  lyricsOffset: 0,
  sidebarWidth: 212,
  queueWidth: 300,
  fetchArtworkOnline: false,
  albumSort: 'artist',
  albumSortDesc: false,
  zoom: 0,
  lyricsFontSize: 15,
  lyricsAlign: 'center',
  showTrackNumbers: true,
  scanOnStartup: true
}

function emptyState(): PersistedState {
  return {
    folders: [],
    settings: { ...defaultSettings },
    tracks: [],
    queue: { order: [], index: -1 },
    hidden: [],
    pinned: [],
    artistBio: {}
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
    try {
      const raw = await fs.readFile(this.statePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<PersistedState>
      this.state = {
        folders: parsed.folders ?? base.folders,
        settings: { ...base.settings, ...(parsed.settings ?? {}) },
        tracks: parsed.tracks ?? base.tracks,
        queue: parsed.queue ?? base.queue,
        hidden: parsed.hidden ?? base.hidden,
        pinned: parsed.pinned ?? base.pinned,
        artistBio: parsed.artistBio ?? base.artistBio
      }
    } catch {
      this.state = base
    }
    // The track index can be large; keep it separate from the small state file.
    try {
      const raw = await fs.readFile(this.indexPath, 'utf8')
      const parsed = JSON.parse(raw) as { tracks?: Track[] }
      if (Array.isArray(parsed.tracks) && parsed.tracks.length > 0) {
        this.state.tracks = parsed.tracks
      }
    } catch {
      /* no cached index yet */
    }
    // User metadata edits (kept out of the user's files).
    try {
      const raw = await fs.readFile(this.overridesPath, 'utf8')
      this.overrides = JSON.parse(raw) as Record<string, TrackOverride>
    } catch {
      this.overrides = {}
    }
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
      await fs.writeFile(this.overridesPath, JSON.stringify(this.overrides, null, 2), 'utf8')
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
    void this.writeIndex()
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
    await this.writeState()
    await this.writeIndex()
  }

  private async writeState(): Promise<void> {
    const rest = {
      folders: this.state.folders,
      settings: this.state.settings,
      queue: this.state.queue,
      hidden: this.state.hidden,
      pinned: this.state.pinned,
      artistBio: this.state.artistBio
    }
    try {
      await fs.writeFile(this.statePath, JSON.stringify(rest, null, 2), 'utf8')
    } catch (err) {
      console.error('[lagu] failed to persist state', err)
    }
  }

  private async writeIndex(): Promise<void> {
    try {
      await fs.writeFile(this.indexPath, JSON.stringify({ tracks: this.state.tracks }), 'utf8')
    } catch (err) {
      console.error('[lagu] failed to persist index', err)
    }
  }
}
