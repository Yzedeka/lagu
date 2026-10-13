import { app, BrowserWindow, shell } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { IPC } from '@shared/ipc'
import { Store } from './store'
import { LibraryService } from './library'
import { registerIpc, wireLibraryEvents } from './ipc'
import { handleMediaProtocol, registerMediaScheme } from './protocol'
import { initUpdater } from './updater'

app.setName('Lagu Music Player')

// Pin the X11 WM_CLASS so a pinned taskbar/menu entry binds to the installed
// desktop file (StartupWMClass=lagu) rather than the AppImage's mount path.
app.commandLine.appendSwitch('class', 'lagu')

registerMediaScheme()

/** Resolve the app icon from the source tree (or a packaged resource). */
function appIconPath(): string | undefined {
  const candidates = [
    path.join(app.getAppPath(), 'src/renderer/src/icons/app_icon.png'),
    path.join(process.resourcesPath ?? '', 'app_icon.png')
  ]
  return candidates.find((candidate) => candidate && existsSync(candidate))
}

let mainWindow: BrowserWindow | null = null
let store: Store | null = null
let library: LibraryService | null = null

const getWindow = (): BrowserWindow | null => mainWindow

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 760,
    minHeight: 520,
    backgroundColor: '#121212',
    show: false,
    autoHideMenuBar: true,
    title: 'Lagu Music Player',
    icon: appIconPath(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Ensure the OS window/taskbar icon is applied on Linux and Windows.
  if (process.platform === 'linux' || process.platform === 'win32') {
    const icon = appIconPath()
    if (icon) {
      mainWindow.setIcon(icon)
    } else {
      console.warn('[lagu] app icon not found at src/renderer/src/icons/app_icon.png')
    }
  }

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.setZoomLevel(store?.settings.zoom ?? 0)
  })

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[lagu] renderer failed to load', code, desc, url)
  })

  mainWindow.on('enter-full-screen', () => mainWindow?.webContents.send(IPC.evtFullscreen, true))
  mainWindow.on('leave-full-screen', () => mainWindow?.webContents.send(IPC.evtFullscreen, false))
}

app.whenReady().then(async () => {
  handleMediaProtocol()

  store = new Store()
  await store.init()
  library = new LibraryService(store)

  registerIpc(getWindow, store, library)
  wireLibraryEvents(getWindow, library)
  library.watchAll()

  createWindow()
  initUpdater(getWindow)

  // Optionally rescan the library folders on launch.
  if (store.settings.scanOnStartup && store.folders.length > 0) {
    void library.scan()
  }


  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  library?.stopWatchingAll()
  void store?.flush()
})
