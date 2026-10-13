import { app, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC } from '@shared/ipc'
import type { UpdateStatus } from '@shared/types'

let status: UpdateStatus = { phase: 'idle' }
let windowGetter: () => BrowserWindow | null = () => null

function set(next: UpdateStatus): void {
  status = next
  const win = windowGetter()
  if (win && !win.isDestroyed()) win.webContents.send(IPC.evtUpdate, next)
}

/**
 * Check for updates on launch using electron-updater's generic provider (the
 * URL baked into the packaged app). In development this is a no-op.
 */
export function initUpdater(getWindow: () => BrowserWindow | null): void {
  windowGetter = getWindow
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Allow overriding the feed at runtime (useful for testing).
  const override = process.env.LAGU_UPDATE_URL
  if (override) autoUpdater.setFeedURL({ provider: 'generic', url: override })

  autoUpdater.on('checking-for-update', () => set({ phase: 'checking' }))
  autoUpdater.on('update-available', (info) => set({ phase: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => set({ phase: 'none' }))
  autoUpdater.on('download-progress', (progress) =>
    set({ phase: 'downloading', percent: Math.round(progress.percent), version: status.version })
  )
  autoUpdater.on('update-downloaded', (info) => set({ phase: 'ready', version: info.version }))
  autoUpdater.on('error', (err) => set({ phase: 'error', error: err?.message ?? String(err) }))

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((err) => {
      set({ phase: 'error', error: err?.message ?? String(err) })
    })
  }, 3000)
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

export function installUpdate(): void {
  try {
    autoUpdater.quitAndInstall()
  } catch (err) {
    console.error('[lagu] install update failed', err)
  }
}
