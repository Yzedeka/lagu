import { BrowserWindow, dialog, ipcMain, shell, type OpenDialogOptions } from 'electron'
import { IPC } from '@shared/ipc'
import type { DiscordPresence } from '@shared/ipc'
import type {
  AppSettings,
  DownloadRequest,
  MetadataPatch,
  QueueState
} from '@shared/types'
import type { LibraryService } from './library'
import type { Store } from './store'
import { getUpdateStatus, installUpdate } from './updater'
import { configureDiscord, setNowPlaying } from './discord'
import { DownloadService } from './downloads'

const MIN_ZOOM = -3
const MAX_ZOOM = 3

function clampZoom(level: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level))
}

export function registerIpc(
  getWindow: () => BrowserWindow | null,
  store: Store,
  library: LibraryService
): void {
  const downloads = new DownloadService(library, store, (status) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send(IPC.evtDownloadProgress, status)
  })

  ipcMain.handle(IPC.downloadsSearch, (_e, query: unknown) =>
    downloads.search(typeof query === 'string' ? query : '')
  )

  ipcMain.handle(IPC.downloadsStart, (_e, request: DownloadRequest) => {
    if (!request || typeof request.url !== 'string') {
      return { ok: false, error: 'No track was selected.' }
    }
    return downloads.start(request)
  })

  ipcMain.handle(IPC.downloadsCancel, () => downloads.cancel())

  ipcMain.handle(IPC.downloadsDefaultFolder, () => downloads.defaultFolder())

  ipcMain.handle(IPC.downloadsToolStatus, () => downloads.toolStatus())

  ipcMain.handle(IPC.downloadsPickFolder, async () => {
    const win = getWindow()
    const defaultPath = await downloads.defaultFolder().catch(() => undefined)
    const options: OpenDialogOptions = {
      title: 'Choose a download folder',
      defaultPath,
      properties: ['openDirectory', 'createDirectory']
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.libraryState, () => ({
    folders: library.getFolders(),
    tracks: library.getAllTracks(),
    scanning: library.isScanning,
    hiddenCount: library.hiddenCount,
    pinned: library.getPinned()
  }))

  ipcMain.handle(IPC.libraryPickFolder, async () => {
    const win = getWindow()
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: 'Add music folder',
          properties: ['openDirectory', 'multiSelections', 'createDirectory']
        })
      : await dialog.showOpenDialog({
          title: 'Add music folder',
          properties: ['openDirectory', 'multiSelections', 'createDirectory']
        })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.libraryAddFolder, async (_e, folderPath: string) => {
    if (typeof folderPath !== 'string' || folderPath.length === 0) return null
    return library.addFolder(folderPath)
  })

  ipcMain.handle(IPC.libraryRemoveFolder, async (_e, id: string) => {
    return library.removeFolder(id)
  })

  ipcMain.handle(IPC.libraryRescan, async (_e, folderId?: string) => {
    await library.scan(typeof folderId === 'string' ? folderId : undefined)
    return true
  })

  ipcMain.handle(IPC.libraryAddUrl, async (_e, url: string) => {
    if (typeof url !== 'string') return { ok: false, error: 'Invalid URL.' }
    return library.addUrl(url)
  })

  ipcMain.handle(IPC.trackArtwork, async (_e, trackId: string) => {
    return library.artworkUrl(trackId)
  })

  ipcMain.handle(IPC.trackLyrics, async (_e, trackId: string) => {
    return library.getLyrics(trackId)
  })

  ipcMain.handle(IPC.lyricsImport, async (_e, trackId: string) => {
    const win = getWindow()
    const options: OpenDialogOptions = {
      title: 'Choose a .lrc file',
      properties: ['openFile'],
      filters: [
        { name: 'Lyrics', extensions: ['lrc', 'txt'] },
        { name: 'All files', extensions: ['*'] }
      ]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return library.importLyrics(trackId, result.filePaths[0])
  })

  ipcMain.handle(IPC.lyricsClear, async (_e, trackId: string) => {
    return library.clearLyrics(trackId)
  })

  ipcMain.handle(IPC.lyricsAutoFetch, async (_e, trackId: string) => {
    await library.autoFetchLyrics(trackId)
    return true
  })

  ipcMain.handle(IPC.artworkFetch, async (_e, trackId: string) => {
    return library.fetchArtwork(trackId)
  })

  ipcMain.handle(IPC.artworkFetchMissing, async () => {
    return library.fetchMissingArtwork()
  })

  ipcMain.handle(IPC.metadataUpdate, async (_e, trackIds: string[], patch: MetadataPatch) => {
    return library.updateMetadata(Array.isArray(trackIds) ? trackIds : [], patch ?? {})
  })

  ipcMain.handle(IPC.metadataSetCover, async (_e, trackIds: string[]) => {
    const win = getWindow()
    const options: OpenDialogOptions = {
      title: 'Choose a cover image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return library.setCover(Array.isArray(trackIds) ? trackIds : [], result.filePaths[0])
  })

  ipcMain.handle(IPC.metadataClear, async (_e, trackIds: string[]) => {
    return library.clearMetadata(Array.isArray(trackIds) ? trackIds : [])
  })

  ipcMain.handle(IPC.metadataFetchCover, async (_e, trackIds: string[]) => {
    return library.fetchCoverFor(Array.isArray(trackIds) ? trackIds : [])
  })

  ipcMain.handle(IPC.artworkArtistImage, async (_e, name: string) => {
    return library.artistImageUrl(typeof name === 'string' ? name : '')
  })

  ipcMain.handle(IPC.pinsGet, () => library.getPinned())

  ipcMain.handle(IPC.updateStatus, () => getUpdateStatus())

  ipcMain.handle(IPC.updateInstall, () => {
    installUpdate()
    return true
  })

  ipcMain.handle(IPC.appDataFolder, () => store.dir)

  ipcMain.handle(IPC.appOpenDataFolder, async () => {
    await shell.openPath(store.dir)
    return store.dir
  })

  ipcMain.handle(IPC.artistBioGet, (_e, name: string) => library.getArtistBio(name))

  ipcMain.handle(IPC.artistBioAll, () => library.getAllArtistBios())

  ipcMain.handle(IPC.artistBioSet, (_e, name: string, text: string) =>
    library.setArtistBio(name, typeof text === 'string' ? text : '')
  )

  ipcMain.handle(IPC.pinsSet, (_e, pinned: unknown) => {
    return library.setPinned(Array.isArray(pinned) ? (pinned as never[]) : [])
  })

  ipcMain.handle(IPC.playlistsGet, () => library.getPlaylists())

  ipcMain.handle(IPC.playlistsSet, (_e, playlists: unknown) => {
    return library.setPlaylists(Array.isArray(playlists) ? (playlists as never[]) : [])
  })

  ipcMain.handle(IPC.playlistsSetCover, async (_e, id: string) => {
    if (typeof id !== 'string' || id.length === 0) return null
    const win = getWindow()
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: 'Choose a playlist cover',
          properties: ['openFile'],
          filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
        })
      : await dialog.showOpenDialog({
          title: 'Choose a playlist cover',
          properties: ['openFile'],
          filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
        })
    if (result.canceled || result.filePaths.length === 0) return null
    return library.setPlaylistCover(id, result.filePaths[0])
  })

  ipcMain.handle(IPC.playlistsCoverUrl, (_e, file: string) => {
    return typeof file === 'string' && file.length > 0 ? library.playlistCoverUrl(file) : ''
  })

  ipcMain.handle(IPC.metadataSetLyricsOffset, (_e, trackIds: string[], ms: number | null) => {
    return library.setLyricsOffset(Array.isArray(trackIds) ? trackIds : [], ms ?? null)
  })

  ipcMain.handle(IPC.libraryRemoveTracks, (_e, trackIds: string[]) => {
    library.removeTracks(Array.isArray(trackIds) ? trackIds : [])
    return true
  })

  ipcMain.handle(IPC.libraryTrash, async (_e, trackIds: string[]) => {
    return library.trashTracks(Array.isArray(trackIds) ? trackIds : [])
  })

  ipcMain.handle(IPC.libraryRestoreHidden, () => {
    library.restoreHidden()
    return true
  })

  ipcMain.handle(IPC.libraryOpenFile, (_e, paths: string[]) => {
    return library.openFile(Array.isArray(paths) ? paths : [])
  })

  ipcMain.handle(IPC.settingsGet, () => store.settings)

  ipcMain.handle(IPC.settingsSet, (_e, patch: Partial<AppSettings>) => {
    const settings = store.updateSettings(patch ?? {})
    if (patch && ('discordRpc' in patch || 'discordClientId' in patch)) {
      configureDiscord({ enabled: settings.discordRpc, clientId: settings.discordClientId })
    }
    return settings
  })

  ipcMain.on(IPC.discordUpdate, (_e, info: DiscordPresence | null) => {
    setNowPlaying(info)
  })

  ipcMain.handle(IPC.settingsReset, () => library.resetSettings())

  ipcMain.handle(IPC.cacheClearArtwork, () => library.clearArtworkCache())

  ipcMain.handle(IPC.cacheClearLyrics, () => library.clearLyricsCache())

  ipcMain.handle(IPC.queueGet, () => store.queue)

  ipcMain.handle(IPC.queueSave, (_e, queue: QueueState) => {
    store.setQueue(queue)
    return true
  })

  ipcMain.handle(IPC.windowZoom, (_e, delta: number) => {
    const win = getWindow()
    if (!win) return 0
    const next = clampZoom(win.webContents.getZoomLevel() + (Number(delta) || 0))
    win.webContents.setZoomLevel(next)
    store.updateSettings({ zoom: next })
    return next
  })

  ipcMain.handle(IPC.windowResetZoom, () => {
    const win = getWindow()
    win?.webContents.setZoomLevel(0)
    store.updateSettings({ zoom: 0 })
    return 0
  })

  ipcMain.handle(IPC.windowFullscreen, (_e, value: boolean) => {
    const win = getWindow()
    if (!win) return false
    const next = typeof value === 'boolean' ? value : !win.isFullScreen()
    win.setFullScreen(next)
    return next
  })
}

/** Push scan events to the renderer. */
export function wireLibraryEvents(
  getWindow: () => BrowserWindow | null,
  library: LibraryService
): void {
  const send = (channel: string, payload: unknown): void => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
  }
  library.setListeners({
    progress: (p) => send(IPC.evtProgress, p),
    batch: (b) => send(IPC.evtBatch, b),
    done: (d) => send(IPC.evtDone, d),
    refresh: () => send(IPC.evtRefresh, null),
    artworkProgress: (p) => send(IPC.evtArtworkProgress, p)
  })
}
