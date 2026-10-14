import { promises as fs, watch, type FSWatcher } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { shell } from 'electron'
import type {
  LibraryBatch,
  LibraryDone
} from '@shared/ipc'
import type { LibraryFolder, AppSettings, PinnedItem, Playlist, ScanProgress, Track, TrackOverride, UnsupportedFile, MetadataPatch } from '@shared/types'
import { compareTracks } from '@shared/sort'
import type { Store } from './store'
import { extensionOf, readTrack, SUPPORTED_EXTENSIONS, KNOWN_UNSUPPORTED_EXTENSIONS, trackFromUrl, clearMetadataCaches } from './metadata'
import { fetchOnlineLyrics, getLyrics } from './lyrics'
import { mapPool, walkFiles } from './scanner'
import { mediaUrlFor } from '@shared/media'
import { downloadCover, searchArtistImage, searchCover } from './coverart'

export interface LibraryListeners {
  progress: (p: ScanProgress) => void
  batch: (b: LibraryBatch) => void
  done: (d: LibraryDone) => void
  /** Ask the renderer to re-read the full library state. */
  refresh: () => void
  /** Progress for online artwork lookups. */
  artworkProgress: (p: { done: number; total: number }) => void
}

const SCAN_CONCURRENCY = 8
const BATCH_SIZE = 25

export class LibraryService {
  /** Raw scanned tracks (file tags + derived assets). */
  private readonly baseTracks = new Map<string, Track>()
  /** Effective tracks = base + user metadata overrides. */
  private tracks = new Map<string, Track>()
  private folders: LibraryFolder[] = []
  private scanning = false
  private listeners: LibraryListeners | null = null
  private readonly watchers = new Map<string, FSWatcher>()
  private readonly changeTimers = new Map<string, NodeJS.Timeout>()
  private refreshTimer: NodeJS.Timeout | null = null
  private readonly artQueue: Track[] = []
  private readonly artAttempted = new Set<string>()
  private artRunning = false
  private artTotal = 0
  private artDone = 0
  private catalogTimer: NodeJS.Timeout | null = null

  constructor(private readonly store: Store) {
    this.folders = store.folders
    for (const track of store.tracks) this.registerTrack(track)
    this.scheduleCatalog()
  }

  /** Merge a user override onto a scanned track. */
  private applyOverride(track: Track): Track {
    const override = this.store.getOverride(track.id)
    if (!override) return track
    const merged: Track = { ...track }
    if (override.title !== undefined) merged.title = override.title
    if (override.artist !== undefined) merged.artist = override.artist
    if (override.album !== undefined) merged.album = override.album
    if (override.albumArtist !== undefined) merged.albumArtist = override.albumArtist
    if (override.year !== undefined) merged.year = override.year
    if (override.trackNo !== undefined) merged.trackNo = override.trackNo
    if (override.genre !== undefined) merged.genre = override.genre
    if (override.coverFile) {
      merged.artworkFile = override.coverFile
      merged.artworkMime = override.coverMime
      merged.hasArtwork = true
    }
    if (override.lyricsOffset !== undefined) merged.lyricsOffset = override.lyricsOffset
    return merged
  }

  private registerTrack(track: Track): void {
    if (this.store.isHidden(track.id)) return
    this.baseTracks.set(track.id, track)
    this.tracks.set(track.id, this.applyOverride(track))
  }

  setListeners(listeners: LibraryListeners): void {
    this.listeners = listeners
  }

  /** Start filesystem watchers for every known folder. */
  watchAll(): void {
    for (const folder of this.folders) this.startWatching(folder)
  }

  stopWatchingAll(): void {
    for (const watcher of this.watchers.values()) watcher.close()
    this.watchers.clear()
    for (const timer of this.changeTimers.values()) clearTimeout(timer)
    this.changeTimers.clear()
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    this.refreshTimer = null
  }

  private startWatching(folder: LibraryFolder): void {
    if (this.watchers.has(folder.id)) return
    try {
      const watcher = watch(folder.path, { recursive: true }, (_event, filename) => {
        if (this.scanning || !filename) return
        this.schedulePath(folder, path.join(folder.path, filename.toString()))
      })
      watcher.on('error', (err) => console.error('[lagu] watcher error', err))
      this.watchers.set(folder.id, watcher)
    } catch (err) {
      console.error('[lagu] could not watch folder', folder.path, err)
    }
  }

  private stopWatching(folderId: string): void {
    this.watchers.get(folderId)?.close()
    this.watchers.delete(folderId)
  }

  private schedulePath(folder: LibraryFolder, fullPath: string): void {
    const existing = this.changeTimers.get(fullPath)
    if (existing) clearTimeout(existing)
    this.changeTimers.set(
      fullPath,
      setTimeout(() => {
        this.changeTimers.delete(fullPath)
        void this.processChange(folder, fullPath)
      }, 300)
    )
  }

  /** Add, update or drop a single file in response to a watcher event. */
  private async processChange(folder: LibraryFolder, fullPath: string): Promise<void> {
    if (this.scanning) return
    const ext = extensionOf(fullPath)
    if (!SUPPORTED_EXTENSIONS.has(ext) && !KNOWN_UNSUPPORTED_EXTENSIONS.has(ext)) return

    let exists = false
    try {
      exists = (await fs.stat(fullPath)).isFile()
    } catch {
      exists = false
    }

    const known = this.tracks.get(fullPath)
    if (exists && SUPPORTED_EXTENSIONS.has(ext)) {
      try {
        const track = await readTrack(fullPath, folder.path, this.store)
        this.registerTrack(track)
        if (this.store.settings.fetchArtworkOnline && !track.hasArtwork) {
          this.enqueueArtwork(this.tracks.get(track.id) ?? track)
        }
      } catch (err) {
        console.error('[lagu] failed to index new file', fullPath, err)
        return
      }
    } else if (known) {
      this.baseTracks.delete(fullPath)
      this.tracks.delete(fullPath)
    } else {
      return
    }

    this.persist()
    this.scheduleRefresh()
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null
      this.listeners?.refresh()
    }, 200)
  }

  // --- online artwork lookup ------------------------------------------------
  private enqueueArtwork(track: Track): void {
    if (track.hasArtwork || this.artAttempted.has(track.id)) return
    this.artAttempted.add(track.id)
    this.artQueue.push(track)
    this.artTotal += 1
    void this.pumpArtwork()
  }

  private async lookupArtwork(track: Track): Promise<boolean> {
    const result = await searchCover({
      artist: track.artist,
      album: track.album,
      title: track.title
    })
    if (!result) return false
    const data = await downloadCover(result.url)
    if (!data) return false

    const fileName = `${this.store.hashPath(`online:${result.provider}:${result.id}`)}.${result.ext}`
    const dest = path.join(this.store.artworkDir, fileName)
    try {
      await fs.access(dest)
    } catch {
      await fs.writeFile(dest, data)
    }
    const updated: Track = {
      ...track,
      hasArtwork: true,
      artworkFile: fileName,
      artworkMime:
        result.ext === 'png' ? 'image/png' : result.ext === 'webp' ? 'image/webp' : 'image/jpeg'
    }
    this.baseTracks.set(updated.id, updated)
    this.tracks.set(updated.id, this.applyOverride(updated))
    return true
  }

  private async pumpArtwork(): Promise<void> {
    if (this.artRunning) return
    this.artRunning = true
    try {
      while (this.artQueue.length > 0) {
        const track = this.artQueue.shift() as Track
        try {
          await this.lookupArtwork(track)
        } catch (err) {
          console.error('[lagu] artwork lookup failed', track.locator, err)
        }
        this.artDone += 1
        this.listeners?.artworkProgress({ done: this.artDone, total: this.artTotal })
        this.persist()
        this.scheduleRefresh()
        // Be gentle with the public APIs.
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
    } finally {
      this.artRunning = false
      this.artTotal = 0
      this.artDone = 0
    }
  }

  /** Look up artwork for a single track on demand. */
  async fetchArtwork(trackId: string): Promise<Track | null> {
    const track = this.tracks.get(trackId)
    if (!track || track.hasArtwork) return track ?? null
    try {
      await this.lookupArtwork(track)
    } catch (err) {
      console.error('[lagu] artwork lookup failed', track.locator, err)
    }
    this.persist()
    this.listeners?.refresh()
    return this.tracks.get(trackId) ?? null
  }

  /** Queue an online lookup for every track that is missing artwork. */
  fetchMissingArtwork(): number {
    const missing = this.getAllTracks().filter((t) => !t.hasArtwork)
    for (const track of missing) {
      this.artAttempted.delete(track.id)
      this.enqueueArtwork(track)
    }
    return missing.length
  }

  // --- user metadata edits (stored as overrides, files untouched) ----------
  private effective(trackIds: string[]): Track[] {
    return trackIds
      .map((id) => this.tracks.get(id))
      .filter((track): track is Track => Boolean(track))
  }

  updateMetadata(trackIds: string[], patch: MetadataPatch): Track[] {
    for (const id of trackIds) {
      const base = this.baseTracks.get(id)
      if (!base) continue
      const current: TrackOverride = { ...(this.store.getOverride(id) ?? {}) }

      const setText = (
        key: 'title' | 'artist' | 'album' | 'albumArtist',
        value: string | undefined
      ): void => {
        if (value === undefined) return
        const trimmed = value.trim()
        if (trimmed === '') delete current[key]
        else current[key] = trimmed
      }
      setText('title', patch.title)
      setText('artist', patch.artist)
      setText('album', patch.album)
      setText('albumArtist', patch.albumArtist)

      // Renaming the artist should also move the track in the Artists/Albums
      // views, which group by album artist. Sync it when they matched before.
      if (patch.artist !== undefined && patch.albumArtist === undefined) {
        const prev = this.store.getOverride(id)
        const prevArtist = prev?.artist ?? base.artist
        const prevAlbumArtist = prev?.albumArtist ?? base.albumArtist ?? base.artist
        if (!prevAlbumArtist || prevAlbumArtist === prevArtist) {
          const trimmed = patch.artist.trim()
          if (trimmed === '') delete current.albumArtist
          else current.albumArtist = trimmed
        }
      }

      if (patch.year !== undefined) {
        if (patch.year === null) delete current.year
        else current.year = patch.year
      }
      if (patch.trackNo !== undefined) {
        if (patch.trackNo === null) delete current.trackNo
        else current.trackNo = patch.trackNo
      }
      if (patch.genre !== undefined) {
        if (patch.genre.length === 0) delete current.genre
        else current.genre = patch.genre
      }

      if (Object.keys(current).length === 0) this.store.clearOverride(id)
      else this.store.replaceOverride(id, current)

      this.tracks.set(id, this.applyOverride(base))
    }
    this.persist()
    this.listeners?.refresh()

    return this.effective(trackIds)
  }

  /** Apply a chosen image file as the cover for one or more tracks. */
  async setCover(trackIds: string[], sourcePath: string): Promise<Track[]> {
    const data = await fs.readFile(sourcePath)
    const ext = extensionOf(sourcePath) || 'jpg'
    const fileName = `${this.store.hashPath(`user-cover:${sourcePath}`)}.${ext}`
    await fs.writeFile(path.join(this.store.artworkDir, fileName), data)
    const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`

    for (const id of trackIds) {
      const base = this.baseTracks.get(id)
      if (!base) continue
      this.store.setOverride(id, { coverFile: fileName, coverMime: mime, coverSource: 'user' })
      this.tracks.set(id, this.applyOverride(base))
    }
    this.persist()
    this.listeners?.refresh()
    return this.effective(trackIds)
  }

  /** Remove all user edits for the given tracks. */
  clearMetadata(trackIds: string[]): Track[] {    for (const id of trackIds) {
      const base = this.baseTracks.get(id)
      if (!base) continue
      this.store.clearOverride(id)
      this.tracks.set(id, this.applyOverride(base))
    }
    this.persist()
    this.listeners?.refresh()
    return this.effective(trackIds)
  }

  /**
   * Set (or clear) a per-track lyrics offset. `null` reverts to the global
   * setting. Values are milliseconds.
   */
  setLyricsOffset(trackIds: string[], ms: number | null): Track[] {
    for (const id of trackIds) {
      const base = this.baseTracks.get(id)
      if (!base) continue
      const current: TrackOverride = { ...(this.store.getOverride(id) ?? {}) }
      if (ms === null) delete current.lyricsOffset
      else current.lyricsOffset = ms
      if (Object.keys(current).length === 0) this.store.clearOverride(id)
      else this.store.replaceOverride(id, current)
      this.tracks.set(id, this.applyOverride(base))
    }
    this.persist()
    this.listeners?.refresh()
    return this.effective(trackIds)
  }

  /**
   * Look up a cover online once (using the first track's metadata) and apply it
   * to every supplied track as an override - the right shape for albums.
   */
  async fetchCoverFor(trackIds: string[]): Promise<{ ok: boolean; tracks: Track[] }> {
    const first = trackIds.map((id) => this.tracks.get(id)).find(Boolean)
    if (!first) return { ok: false, tracks: [] }

    const result = await searchCover({
      artist: first.artist,
      album: first.album,
      title: first.title
    })
    if (!result) {
      this.clearOnlineCover(trackIds)
      return { ok: false, tracks: this.effective(trackIds) }
    }

    const data = await downloadCover(result.url)
    if (!data) {
      this.clearOnlineCover(trackIds)
      return { ok: false, tracks: this.effective(trackIds) }
    }

    const fileName = `${this.store.hashPath(`online:${result.provider}:${result.id}`)}.${result.ext}`
    const dest = path.join(this.store.artworkDir, fileName)
    try {
      await fs.access(dest)
    } catch {
      await fs.writeFile(dest, data)
    }
    const mime =
      result.ext === 'png' ? 'image/png' : result.ext === 'webp' ? 'image/webp' : 'image/jpeg'

    for (const id of trackIds) {
      const base = this.baseTracks.get(id)
      if (!base) continue
      this.store.setOverride(id, { coverFile: fileName, coverMime: mime, coverSource: 'online' })
      this.tracks.set(id, this.applyOverride(base))
    }
    this.persist()
    this.listeners?.refresh()
    return { ok: true, tracks: this.effective(trackIds) }
  }

  /** Drop an auto-fetched cover (never a user-chosen one) so stale art disappears. */
  private clearOnlineCover(trackIds: string[]): void {
    let changed = false
    for (const id of trackIds) {
      const override = this.store.getOverride(id)
      if (override?.coverSource !== 'online') continue
      const rest: TrackOverride = { ...override }
      delete rest.coverFile
      delete rest.coverMime
      delete rest.coverSource
      if (Object.keys(rest).length === 0) this.store.clearOverride(id)
      else this.store.replaceOverride(id, rest)
      const base = this.baseTracks.get(id)
      if (base) this.tracks.set(id, this.applyOverride(base))
      changed = true
    }
    if (changed) {
      this.persist()
      this.listeners?.refresh()
    }
  }

  // --- removal --------------------------------------------------------------
  get hiddenCount(): number {
    return this.store.hidden.length
  }

  /** Remove tracks from the library view without touching the files. */
  removeTracks(trackIds: string[]): void {
    for (const id of trackIds) {
      this.baseTracks.delete(id)
      this.tracks.delete(id)
      this.artAttempted.delete(id)
    }
    this.store.hideTracks(trackIds)
    this.persist()
    this.listeners?.refresh()
  }

  /** Move the given tracks' files to the OS trash, then drop them from the library. */
  async trashTracks(trackIds: string[]): Promise<number> {
    let moved = 0
    for (const id of trackIds) {
      const track = this.baseTracks.get(id) ?? this.tracks.get(id)
      if (!track || track.source !== 'file') continue
      try {
        await shell.trashItem(track.locator)
        moved += 1
      } catch (err) {
        console.error('[lagu] could not trash file', track.locator, err)
      }
    }
    this.removeTracks(trackIds)
    return moved
  }

  /** Bring every hidden track back by clearing the hidden list and rescanning. */
  restoreHidden(): void {
    this.store.clearHidden()
    void this.scan()
  }

  /** Cached (or freshly fetched) artist profile image URL, or null. */
  async artistImageUrl(name: string): Promise<string | null> {
    const key = name.trim().toLowerCase()
    if (!key) return null
    const base = this.store.hashPath(`artist:${key}`)
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const candidate = path.join(this.store.artworkDir, `${base}.${ext}`)
      try {
        await fs.access(candidate)
        return mediaUrlFor(candidate)
      } catch {
        /* try next */
      }
    }
    if (!this.store.settings.fetchArtworkOnline) return null
    const result = await searchArtistImage(name)
    if (!result) return null
    const data = await downloadCover(result.url)
    if (!data) return null
    const dest = path.join(this.store.artworkDir, `${base}.${result.ext}`)
    try {
      await fs.writeFile(dest, data)
    } catch {
      return null
    }
    return mediaUrlFor(dest)
  }

  getArtistBio(name: string): string {
    return this.store.getArtistBio(name)
  }

  resetSettings(): AppSettings {
    return this.store.resetSettings()
  }

  private async clearDir(dir: string): Promise<number> {
    let removed = 0
    try {
      const entries = await fs.readdir(dir)
      for (const entry of entries) {
        try {
          await fs.rm(path.join(dir, entry), { recursive: true, force: true })
          removed += 1
        } catch {
          /* skip locked files */
        }
      }
    } catch {
      /* directory missing */
    }
    return removed
  }

  clearArtworkCache(): Promise<number> {
    clearMetadataCaches()
    return this.clearDir(this.store.artworkDir)
  }

  clearLyricsCache(): Promise<number> {
    return this.clearDir(this.store.lyricsDir)
  }

  getAllArtistBios(): Record<string, string> {
    return this.store.getAllArtistBios()
  }

  setArtistBio(name: string, text: string): string {
    return this.store.setArtistBio(name, text)
  }

  getPinned(): PinnedItem[] {
    return this.store.pinned
  }

  getPlaylists(): Playlist[] {
    return this.store.playlists
  }

  /** Register and return one or more loose files (e.g. opened via the OS). */
  async openFile(filePaths: string[]): Promise<Track[]> {
    const ids: string[] = []
    for (const filePath of Array.isArray(filePaths) ? filePaths : []) {
      if (typeof filePath !== 'string') continue
      if (!SUPPORTED_EXTENSIONS.has(extensionOf(filePath))) continue
      try {
        const track = await readTrack(filePath, path.dirname(filePath), this.store)
        this.registerTrack(track)
        ids.push(track.id)
      } catch {
        /* unreadable file - skip */
      }
    }
    if (ids.length > 0) {
      this.persist()
      this.listeners?.refresh()
    }
    return this.effective(ids)
  }

  setPlaylists(playlists: Playlist[]): Playlist[] {
    this.store.setPlaylists(Array.isArray(playlists) ? playlists : [])
    return this.store.playlists
  }

  /** Copy a chosen image into the artwork cache and return its file name. */
  async setPlaylistCover(id: string, sourcePath: string): Promise<string> {
    const data = await fs.readFile(sourcePath)
    const ext = extensionOf(sourcePath) || 'jpg'
    const fileName = `playlist-${this.store.hashPath(`playlist:${id}`)}.${ext}`
    await fs.writeFile(path.join(this.store.artworkDir, fileName), data)
    return fileName
  }

  /** Renderer-safe URL for a stored playlist cover file. */
  playlistCoverUrl(file: string): string {
    return mediaUrlFor(path.join(this.store.artworkDir, file))
  }

  setPinned(pinned: PinnedItem[]): PinnedItem[] {
    this.store.setPinned(pinned)
    return this.store.pinned
  }

  get isScanning(): boolean {
    return this.scanning
  }

  getFolders(): LibraryFolder[] {
    return this.folders
  }

  getAllTracks(): Track[] {
    return [...this.tracks.values()]
  }

  getTrack(id: string): Track | undefined {
    return this.tracks.get(id)
  }

  async addUrl(rawUrl: string): Promise<{ ok: boolean; track?: Track; error?: string }> {
    const { track, error } = trackFromUrl(rawUrl)
    if (!track) return { ok: false, error }
    this.registerTrack(track)
    this.persist()
    return { ok: true, track: { ...this.tracks.get(track.id)! } }
  }

  async artworkUrl(trackId: string): Promise<string | null> {
    const track = this.tracks.get(trackId)
    if (!track || !track.artworkFile) return null
    const abs = path.join(this.store.artworkDir, track.artworkFile)
    try {
      await fs.access(abs)
      return mediaUrlFor(abs)
    } catch {
      return null
    }
  }

  getLyrics(trackId: string) {
    const track = this.tracks.get(trackId)
    if (!track) return Promise.resolve({ synced: false, source: 'none' as const, lines: [] })
    return getLyrics(track, this.store)
  }

  /**
   * Fetch lyrics online for a track that has none locally (opt-in). Prefers
   * timestamped / Enhanced LRC, falling back to plain lyrics. Cached to disk.
   */
  async autoFetchLyrics(trackId: string): Promise<void> {
    if (!this.store.settings.autoLyrics) return
    const track = this.tracks.get(trackId)
    if (!track) return
    const existing = await getLyrics(track, this.store)
    if (existing.source !== 'none') return
    const content = await fetchOnlineLyrics({
      artist: track.artist,
      title: track.title,
      album: track.album,
      duration: track.duration
    })
    if (!content) return
    await this.store.writeOnlineLyrics(trackId, content)
    this.listeners?.refresh()
  }

  /** Store a user-provided .lrc for a track (in the app cache, never the library). */
  async importLyrics(trackId: string, sourcePath: string) {
    const track = this.tracks.get(trackId)
    if (!track) return null
    try {
      const content = await fs.readFile(sourcePath, 'utf8')
      await this.store.writeImportedLyrics(trackId, content)
    } catch {
      return null
    }
    return getLyrics(track, this.store)
  }

  async clearLyrics(trackId: string) {
    await this.store.removeImportedLyrics(trackId)
    return this.getLyrics(trackId)
  }

  async addFolder(rawPath: string): Promise<LibraryFolder | null> {
    const resolved = path.resolve(rawPath)
    let stat
    try {
      stat = await fs.stat(resolved)
    } catch {
      return null
    }
    if (!stat.isDirectory()) return null

    const existing = this.folders.find((f) => f.path === resolved)
    if (existing) return existing

    const folder: LibraryFolder = { id: randomUUID(), path: resolved, addedAt: Date.now() }
    this.folders = [...this.folders, folder]
    this.store.setFolders(this.folders)
    this.startWatching(folder)
    await this.scan(folder.id)
    return folder
  }

  async removeFolder(id: string): Promise<LibraryFolder[]> {
    const folder = this.folders.find((f) => f.id === id)
    if (!folder) return this.folders
    this.stopWatching(id)
    this.folders = this.folders.filter((f) => f.id !== id)
    this.store.setFolders(this.folders)
    for (const [trackId, track] of this.tracks) {
      if (track.folder === folder.path) {
        this.tracks.delete(trackId)
        this.baseTracks.delete(trackId)
      }
    }
    this.persist()
    return this.folders
  }

  async scan(folderId?: string): Promise<void> {
    if (this.scanning) return
    const targets = folderId ? this.folders.filter((f) => f.id === folderId) : this.folders
    if (targets.length === 0) return

    this.scanning = true
    clearMetadataCaches()
    const unsupported: UnsupportedFile[] = []
    const errors: LibraryDone['errors'] = []
    let scanned = 0
    let discovered = 0
    let buffer: Track[] = []
    let lastEmit = 0

    const flush = (): void => {
      if (buffer.length === 0) return
      this.listeners?.batch({ tracks: buffer, unsupported: [] })
      buffer = []
    }

    const emitProgress = (current: string, force = false): void => {
      const now = Date.now()
      if (force || now - lastEmit > 120) {
        lastEmit = now
        this.listeners?.progress({
          scanning: true,
          scanned,
          total: discovered,
          current,
          folderId
        })
      }
    }

    try {
      for (const folder of targets) {
        // Fresh scan for this folder: drop its previous tracks first.
        for (const [trackId, track] of this.tracks) {
          if (track.folder === folder.path) {
        this.tracks.delete(trackId)
        this.baseTracks.delete(trackId)
      }
        }

        const files: string[] = []
        for await (const entry of walkFiles(folder.path, (count) => {
          discovered = count
          emitProgress(folder.path)
        })) {
          const ext = extensionOf(entry.path)
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            files.push(entry.path)
          } else if (KNOWN_UNSUPPORTED_EXTENSIONS.has(ext)) {
            unsupported.push({ path: entry.path, extension: ext })
          }
          emitProgress(entry.path)
        }

        await mapPool(files, SCAN_CONCURRENCY, async (filePath) => {
          try {
            const track = await readTrack(filePath, folder.path, this.store)
            this.registerTrack(track)
            buffer.push(track)
            if (buffer.length >= BATCH_SIZE) flush()
            if (this.store.settings.fetchArtworkOnline && !track.hasArtwork) {
              this.enqueueArtwork(track)
            }
          } catch (err) {
            errors.push({ path: filePath, message: err instanceof Error ? err.message : String(err) })
          }
          scanned += 1
          emitProgress(filePath)
        })
      }
    } finally {
      flush()
      this.persist()
      this.scanning = false
      this.listeners?.progress({ scanning: false, scanned, total: discovered })
      this.listeners?.done({ total: this.tracks.size, unsupported, errors })
    }
  }

  private persist(): void {
    const sorted = [...this.baseTracks.values()].sort(compareTracks)
    this.store.setTracks(sorted)
    this.scheduleCatalog()
  }

  /** Regenerate the human-readable album/artist catalog (debounced). */
  private scheduleCatalog(): void {
    if (this.catalogTimer) clearTimeout(this.catalogTimer)
    this.catalogTimer = setTimeout(() => {
      this.catalogTimer = null
      void this.writeCatalogNow()
    }, 600)
  }

  private async writeCatalogNow(): Promise<void> {
    interface AlbumEntry {
      artist: string
      album: string
      year?: number
      trackCount: number
      duration: number
      tracks: { title: string; artist: string; trackNo?: number; duration?: number; file: string }[]
    }
    interface ArtistEntry {
      name: string
      trackCount: number
      albums: string[]
    }
    const albums = new Map<string, AlbumEntry>()
    const artists = new Map<string, ArtistEntry>()

    for (const t of [...this.tracks.values()].sort(compareTracks)) {
      const artist = t.albumArtist || t.artist
      const key = `${artist}\u0000${t.album}`
      let album = albums.get(key)
      if (!album) {
        album = { artist, album: t.album, year: t.year, trackCount: 0, duration: 0, tracks: [] }
        albums.set(key, album)
      }
      album.trackCount += 1
      album.duration += t.duration ?? 0
      if (!album.year && t.year) album.year = t.year
      album.tracks.push({
        title: t.title,
        artist: t.artist,
        trackNo: t.trackNo,
        duration: t.duration,
        file: t.locator
      })

      let group = artists.get(artist)
      if (!group) {
        group = { name: artist, trackCount: 0, albums: [] }
        artists.set(artist, group)
      }
      group.trackCount += 1
      if (!group.albums.includes(t.album)) group.albums.push(t.album)
    }

    await this.store.writeCatalog([...albums.values()], [...artists.values()])
  }
}
