import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '@shared/ipc'
import type { DiscordPresence, LibraryBatch, LibraryDone, LaguApi } from '@shared/ipc'
import type { AppSettings, MetadataPatch, PinnedItem, Playlist, QueueState, ScanProgress, UpdateStatus } from '@shared/types'

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: LaguApi = {
  library: {
    state: () => ipcRenderer.invoke(IPC.libraryState),
    pickFolder: () => ipcRenderer.invoke(IPC.libraryPickFolder),
    addFolder: (folderPath: string) => ipcRenderer.invoke(IPC.libraryAddFolder, folderPath),
    removeFolder: (id: string) => ipcRenderer.invoke(IPC.libraryRemoveFolder, id),
    rescan: (folderId?: string) => ipcRenderer.invoke(IPC.libraryRescan, folderId),
    addUrl: (url: string) => ipcRenderer.invoke(IPC.libraryAddUrl, url),
    remove: (trackIds: string[]) => ipcRenderer.invoke(IPC.libraryRemoveTracks, trackIds),
    trash: (trackIds: string[]) => ipcRenderer.invoke(IPC.libraryTrash, trackIds),
    restoreHidden: () => ipcRenderer.invoke(IPC.libraryRestoreHidden),
    clearLyricsCache: () => ipcRenderer.invoke(IPC.cacheClearLyrics)
  },
  track: {
    artworkUrl: (trackId: string) => ipcRenderer.invoke(IPC.trackArtwork, trackId),
    lyrics: (trackId: string) => ipcRenderer.invoke(IPC.trackLyrics, trackId),
    importLyrics: (trackId: string) => ipcRenderer.invoke(IPC.lyricsImport, trackId),
    clearLyrics: (trackId: string) => ipcRenderer.invoke(IPC.lyricsClear, trackId),
    autoFetchLyrics: (trackId: string) => ipcRenderer.invoke(IPC.lyricsAutoFetch, trackId)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    set: (patch: Partial<AppSettings>) => ipcRenderer.invoke(IPC.settingsSet, patch),
    reset: () => ipcRenderer.invoke(IPC.settingsReset)
  },
  queue: {
    load: () => ipcRenderer.invoke(IPC.queueGet),
    save: (state: QueueState) => ipcRenderer.invoke(IPC.queueSave, state)
  },
  artwork: {
    fetch: (trackId: string) => ipcRenderer.invoke(IPC.artworkFetch, trackId),
    fetchMissing: () => ipcRenderer.invoke(IPC.artworkFetchMissing),
    artistImage: (name: string) => ipcRenderer.invoke(IPC.artworkArtistImage, name),
    clearCache: () => ipcRenderer.invoke(IPC.cacheClearArtwork)
  },
  pins: {
    get: () => ipcRenderer.invoke(IPC.pinsGet),
    set: (pinned: PinnedItem[]) => ipcRenderer.invoke(IPC.pinsSet, pinned)
  },
  playlists: {
    get: () => ipcRenderer.invoke(IPC.playlistsGet),
    set: (playlists: Playlist[]) => ipcRenderer.invoke(IPC.playlistsSet, playlists)
  },
  artists: {
    getBio: (name: string) => ipcRenderer.invoke(IPC.artistBioGet, name),
    setBio: (name: string, text: string) => ipcRenderer.invoke(IPC.artistBioSet, name, text),
    getBios: () => ipcRenderer.invoke(IPC.artistBioAll)
  },
  app: {
    dataFolder: () => ipcRenderer.invoke(IPC.appDataFolder),
    openDataFolder: () => ipcRenderer.invoke(IPC.appOpenDataFolder)
  },
  discord: {
    update: (info: DiscordPresence | null) => ipcRenderer.send(IPC.discordUpdate, info)
  },
  update: {
    get: () => ipcRenderer.invoke(IPC.updateStatus),
    install: () => ipcRenderer.invoke(IPC.updateInstall),
    onStatus: (cb: (status: UpdateStatus) => void) => subscribe(IPC.evtUpdate, cb)
  },
  metadata: {
    update: (trackIds: string[], patch: MetadataPatch) =>
      ipcRenderer.invoke(IPC.metadataUpdate, trackIds, patch),
    setCover: (trackIds: string[]) => ipcRenderer.invoke(IPC.metadataSetCover, trackIds),
    clear: (trackIds: string[]) => ipcRenderer.invoke(IPC.metadataClear, trackIds),
    fetchCover: (trackIds: string[]) => ipcRenderer.invoke(IPC.metadataFetchCover, trackIds),
    setLyricsOffset: (trackIds: string[], ms: number | null) =>
      ipcRenderer.invoke(IPC.metadataSetLyricsOffset, trackIds, ms)
  },
  window: {
    zoom: (delta: number) => ipcRenderer.invoke(IPC.windowZoom, delta),
    resetZoom: () => ipcRenderer.invoke(IPC.windowResetZoom),
    toggleFullscreen: () => ipcRenderer.invoke(IPC.windowFullscreen, undefined),
    setFullscreen: (value: boolean) => ipcRenderer.invoke(IPC.windowFullscreen, value),
    onFullscreenChange: (cb: (value: boolean) => void) => subscribe(IPC.evtFullscreen, cb)
  },
  events: {
    onProgress: (cb: (p: ScanProgress) => void) => subscribe(IPC.evtProgress, cb),
    onBatch: (cb: (b: LibraryBatch) => void) => subscribe(IPC.evtBatch, cb),
    onDone: (cb: (d: LibraryDone) => void) => subscribe(IPC.evtDone, cb),
    onRefresh: (cb: () => void) => subscribe(IPC.evtRefresh, cb),
    onArtworkProgress: (cb: (p: { done: number; total: number }) => void) =>
      subscribe(IPC.evtArtworkProgress, cb)
  }
}

contextBridge.exposeInMainWorld('lagu', api)
