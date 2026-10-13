import type {
  AppSettings,
  AddUrlResult,
  Lyrics,
  LibraryFolder,
  MetadataPatch,
  PinnedItem,
  QueueState,
  ScanError,
  ScanProgress,
  Track,
  UnsupportedFile,
  UpdateStatus
} from './types'

/** IPC channel names. Kept in one place so main and preload cannot drift. */
export const IPC = {
  libraryState: 'library:state',
  libraryPickFolder: 'library:pick-folder',
  libraryAddFolder: 'library:add-folder',
  libraryRemoveFolder: 'library:remove-folder',
  libraryRescan: 'library:rescan',
  libraryAddUrl: 'library:add-url',
  libraryRemoveTracks: 'library:remove-tracks',
  libraryTrash: 'library:trash',
  libraryRestoreHidden: 'library:restore-hidden',
  trackArtwork: 'track:artwork-url',
  trackLyrics: 'track:lyrics',
  lyricsImport: 'lyrics:import',
  lyricsClear: 'lyrics:clear',
  lyricsAutoFetch: 'lyrics:auto-fetch',
  artworkFetch: 'artwork:fetch',
  artworkFetchMissing: 'artwork:fetch-missing',
  artworkArtistImage: 'artwork:artist-image',
  pinsGet: 'pins:get',
  pinsSet: 'pins:set',
  artistBioGet: 'artists:bio-get',
  artistBioSet: 'artists:bio-set',
  appDataFolder: 'app:data-folder',
  appOpenDataFolder: 'app:open-data-folder',
  updateStatus: 'update:status',
  updateInstall: 'update:install',
  metadataUpdate: 'metadata:update',
  metadataSetCover: 'metadata:set-cover',
  metadataFetchCover: 'metadata:fetch-cover',
  metadataClear: 'metadata:clear',
  metadataSetLyricsOffset: 'metadata:set-lyrics-offset',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  queueGet: 'queue:get',
  queueSave: 'queue:save',
  windowZoom: 'window:zoom',
  windowResetZoom: 'window:reset-zoom',
  windowFullscreen: 'window:fullscreen',
  // main -> renderer events
  evtProgress: 'library:progress',
  evtBatch: 'library:batch',
  evtDone: 'library:done',
  evtRefresh: 'library:refresh',
  evtArtworkProgress: 'artwork:progress',
  evtFullscreen: 'window:fullscreen-changed',
  evtUpdate: 'update:changed'
} as const

export interface LibraryDone {
  total: number
  unsupported: UnsupportedFile[]
  errors: ScanError[]
}

export interface LibraryBatch {
  tracks: Track[]
  unsupported: UnsupportedFile[]
}

/** The typed surface exposed on `window.lagu` by the preload script. */
export interface LaguApi {
  library: {
    state(): Promise<{
      folders: LibraryFolder[]
      tracks: Track[]
      scanning: boolean
      hiddenCount: number
      pinned: PinnedItem[]
    }>
    pickFolder(): Promise<string | null>
    addFolder(path: string): Promise<LibraryFolder | null>
    removeFolder(id: string): Promise<LibraryFolder[]>
    rescan(folderId?: string): Promise<void>
    addUrl(url: string): Promise<AddUrlResult>
    /** Remove tracks from the library (files untouched). */
    remove(trackIds: string[]): Promise<void>
    /** Move the tracks' files to the OS trash and remove them. */
    trash(trackIds: string[]): Promise<number>
    /** Restore all hidden tracks and rescan. */
    restoreHidden(): Promise<void>
  }
  track: {
    artworkUrl(trackId: string): Promise<string | null>
    lyrics(trackId: string): Promise<Lyrics>
    /** Import a .lrc file for a track; returns the resulting lyrics. */
    importLyrics(trackId: string): Promise<Lyrics | null>
    /** Remove imported lyrics, falling back to sidecar/embedded. */
    clearLyrics(trackId: string): Promise<Lyrics>
    /** Fetch lyrics online if none exist locally (opt-in). */
    autoFetchLyrics(trackId: string): Promise<void>
  }
  settings: {
    get(): Promise<AppSettings>
    set(patch: Partial<AppSettings>): Promise<AppSettings>
  }
  queue: {
    load(): Promise<QueueState>
    save(state: QueueState): Promise<void>
  }
  artwork: {
    /** Look up artwork online for one track. */
    fetch(trackId: string): Promise<Track | null>
    /** Queue online lookups for every track missing artwork; returns the count. */
    fetchMissing(): Promise<number>
    /** Cached (or freshly fetched) artist profile image URL, or null. */
    artistImage(name: string): Promise<string | null>
  }
  pins: {
    get(): Promise<PinnedItem[]>
    set(pinned: PinnedItem[]): Promise<PinnedItem[]>
  }
  artists: {
    getBio(name: string): Promise<string>
    setBio(name: string, text: string): Promise<string>
  }
  app: {
    dataFolder(): Promise<string>
    openDataFolder(): Promise<string>
  }
  update: {
    get(): Promise<UpdateStatus>
    install(): Promise<void>
    onStatus(cb: (status: UpdateStatus) => void): () => void
  }
  metadata: {
    /** Apply metadata edits to one or more tracks. */
    update(trackIds: string[], patch: MetadataPatch): Promise<Track[]>
    /** Pick an image file and set it as the cover. Returns null if cancelled. */
    setCover(trackIds: string[]): Promise<Track[] | null>
    /** Remove all user edits for the given tracks. */
    clear(trackIds: string[]): Promise<Track[]>
    /** Online-lookup a cover once and apply it to all given tracks. */
    fetchCover(trackIds: string[]): Promise<{ ok: boolean; tracks: Track[] }>
    /** Set (or clear with null) a per-track lyrics offset in ms. */
    setLyricsOffset(trackIds: string[], ms: number | null): Promise<Track[]>
  }
  window: {
    zoom(delta: number): Promise<number>
    resetZoom(): Promise<number>
    toggleFullscreen(): Promise<boolean>
    setFullscreen(value: boolean): Promise<boolean>
    onFullscreenChange(cb: (value: boolean) => void): () => void
  }
  events: {
    onProgress(cb: (p: ScanProgress) => void): () => void
    onBatch(cb: (b: LibraryBatch) => void): () => void
    onDone(cb: (d: LibraryDone) => void): () => void
    /** Fired when the filesystem watcher detects library changes. */
    onRefresh(cb: () => void): () => void
    /** Progress for online artwork lookups. */
    onArtworkProgress(cb: (p: { done: number; total: number }) => void): () => void
  }
}
