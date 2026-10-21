import { app } from 'electron'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { constants as fsConstants, promises as fs } from 'node:fs'
import path from 'node:path'
import type {
  DownloadFormat,
  DownloadJobStatus,
  DownloadQuality,
  DownloadRequest,
  DownloadSearchResult,
  DownloadStartResult,
  DownloadToolStatus
} from '@shared/types'
import type { LibraryService } from './library'
import type { Store } from './store'

const EXE = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
const FFMPEG = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
const SEARCH_LIMIT = 12
const FORMATS = new Set<DownloadFormat>(['mp3', 'm4a', 'opus'])
const QUALITIES = new Set<DownloadQuality>(['best', '320', '192', '128'])

/** Run a command and resolve its stdout, or null on any failure. */
function tryExec(command: string, args: string[], timeout = 6_000): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => resolve(error ? null : stdout.trim())
    )
  })
}

function bundledCandidates(): string[] {
  const candidates: string[] = []
  const override = process.env['LAGU_YTDLP_PATH']
  if (override) candidates.push(override)

  const roots = [
    process.resourcesPath ? path.join(process.resourcesPath, 'bin') : '',
    path.join(app.getAppPath(), 'resources', 'bin')
  ].filter(Boolean)

  for (const root of roots) {
    candidates.push(path.join(root, process.platform, EXE))
    candidates.push(path.join(root, EXE))
  }
  return candidates
}

function ffmpegCandidates(): string[] {
  const candidates: string[] = []
  const override = process.env['LAGU_FFMPEG_PATH']
  if (override) {
    candidates.push(override)
    candidates.push(path.join(override, FFMPEG))
  }

  const roots = [
    process.resourcesPath ? path.join(process.resourcesPath, 'bin') : '',
    path.join(app.getAppPath(), 'resources', 'bin')
  ].filter(Boolean)

  for (const root of roots) {
    // macOS builds have one ffmpeg per architecture; Windows/Linux share one.
    candidates.push(path.join(root, 'darwin', process.arch, FFMPEG))
    candidates.push(path.join(root, process.platform, FFMPEG))
    candidates.push(path.join(root, FFMPEG))
  }
  candidates.push(FFMPEG)
  return candidates
}

function qualityArg(quality: DownloadQuality): string {
  return quality === 'best' ? '0' : `${quality}K`
}

/** YouTube playlists, albums (and YouTube Music albums) all carry a list id. */
function isPlaylistUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host)) return false
    return (
      url.searchParams.has('list') ||
      url.pathname.startsWith('/playlist') ||
      url.pathname.startsWith('/browse/') ||
      url.pathname.startsWith('/album/')
    )
  } catch {
    return false
  }
}

function friendlyError(message: string): string {
  const line = message
    .split(/\r?\n/)
    .reverse()
    .find((entry) => /error/i.test(entry))
  const detail = (line ?? message).replace(/^ERROR:\s*/i, '').trim()
  if (/ffmpeg/i.test(detail)) {
    return 'ffmpeg is required to convert downloads. Install ffmpeg and try again.'
  }
  if (/private video|video unavailable|not available/i.test(detail)) {
    return 'This track is not available for download.'
  }
  if (/confirm you.re not a bot|sign in|age/i.test(detail)) {
    return 'YouTube is asking for a sign-in check. Try again in a few minutes.'
  }
  return detail || 'The download failed.'
}

interface SearchEntry {
  id?: string
  title?: string
  url?: string
  webpage_url?: string
  duration?: number
  channel?: string
  uploader?: string
  thumbnail?: string
  thumbnails?: { url?: string; width?: number; height?: number }[]
}

/**
 * Search and download audio through yt-dlp.
 *
 * The binary is bundled under `resources/bin` at build time (see
 * `scripts/fetch-ytdlp.mjs`); a system `yt-dlp` is used as a fallback so the
 * feature also works when running from source.
 */
export class DownloadService {
  private tool: { status: DownloadToolStatus; at: number } | null = null
  private child: ChildProcess | null = null
  private cancelled = false
  private running = false

  constructor(
    private readonly library: LibraryService,
    private readonly store: Store,
    private readonly emit: (status: DownloadJobStatus) => void
  ) {}

  private async resolveTool(): Promise<DownloadToolStatus> {
    if (this.tool && Date.now() - this.tool.at < 10_000) return this.tool.status

    let status: DownloadToolStatus | null = null
    for (const candidate of bundledCandidates()) {
      try {
        await fs.access(candidate, fsConstants.X_OK)
      } catch {
        continue
      }
      const version = await tryExec(candidate, ['--version'])
      if (version) {
        const ffmpegPath = await this.resolveFfmpeg()
        status = {
          available: true,
          command: candidate,
          version: version.split(/\r?\n/)[0],
          bundled: true,
          ffmpeg: Boolean(ffmpegPath),
          ffmpegPath: ffmpegPath ?? undefined
        }
        break
      }
    }

    if (!status) {
      const version = await tryExec('yt-dlp', ['--version'])
      if (version) {
        const ffmpegPath = await this.resolveFfmpeg()
        status = {
          available: true,
          command: 'yt-dlp',
          version: version.split(/\r?\n/)[0],
          bundled: false,
          ffmpeg: Boolean(ffmpegPath),
          ffmpegPath: ffmpegPath ?? undefined
        }
      }
    }

    if (!status) {
      const ffmpegPath = await this.resolveFfmpeg()
      status = {
        available: false,
        bundled: false,
        ffmpeg: Boolean(ffmpegPath),
        ffmpegPath: ffmpegPath ?? undefined,
        error:
          'yt-dlp was not found. Run "npm run fetch:ytdlp" for a source build, or reinstall Lagu.'
      }
    }

    this.tool = { status, at: Date.now() }
    return status
  }

  private async resolveFfmpeg(): Promise<string | null> {
    for (const candidate of ffmpegCandidates()) {
      if (candidate !== FFMPEG) {
        try {
          await fs.access(candidate, fsConstants.X_OK)
        } catch {
          continue
        }
      }
      const version = await tryExec(candidate, ['-version'])
      if (version) return candidate
    }
    return null
  }

  async toolStatus(): Promise<DownloadToolStatus> {
    return this.resolveTool()
  }

  async search(query: string): Promise<{
    ok: boolean
    results?: DownloadSearchResult[]
    error?: string
  }> {
    const term = query.trim()
    if (!term) return { ok: false, error: 'Enter something to search for.' }

    const tool = await this.resolveTool()
    if (!tool.available || !tool.command) return { ok: false, error: tool.error }

    const target = `ytsearch${SEARCH_LIMIT}:${term}`
    const output = await tryExec(
      tool.command,
      [
        '--flat-playlist',
        '--dump-single-json',
        '--no-warnings',
        '--socket-timeout',
        '20',
        target
      ],
      45_000
    )

    if (!output) return { ok: false, error: 'The search failed or timed out.' }

    try {
      const parsed = JSON.parse(output) as { entries?: SearchEntry[] }
      const results: DownloadSearchResult[] = []
      for (const entry of parsed.entries ?? []) {
        const id = entry.id?.trim()
        if (!id || !entry.title) continue
        const thumbs = entry.thumbnails ?? []
        const bestThumb = [...thumbs].sort(
          (a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0)
        )[0]
        results.push({
          id,
          title: entry.title,
          uploader: entry.channel ?? entry.uploader ?? '',
          duration: Number.isFinite(entry.duration) ? entry.duration : undefined,
          thumbnail: bestThumb?.url ?? entry.thumbnail,
          url:
            entry.webpage_url ??
            entry.url ??
            `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
        })
      }
      return { ok: true, results }
    } catch {
      return { ok: false, error: 'Could not read the search results.' }
    }
  }

  /** Effective destination: explicit override, configured default, or library. */
  async defaultFolder(): Promise<string> {
    const configured = this.store.settings.downloadFolder.trim()
    if (configured) return configured
    const firstFolder = this.library.getFolders()[0]?.path
    if (firstFolder) return firstFolder
    return path.join(app.getPath('music'), 'Lagu')
  }

  private async resolveFolder(override?: string): Promise<string> {
    const chosen = override?.trim() || (await this.defaultFolder())
    const resolved = path.resolve(chosen)
    await fs.mkdir(resolved, { recursive: true })
    const stat = await fs.stat(resolved)
    if (!stat.isDirectory()) throw new Error('The download folder is not a directory.')
    await fs.access(resolved, fsConstants.W_OK)
    return resolved
  }

  /** Read a playlist/album title and entry count without downloading. */
  private async probePlaylist(
    command: string,
    url: string
  ): Promise<{ title: string; total: number } | null> {
    const output = await tryExec(
      command,
      [
        '--flat-playlist',
        '--dump-single-json',
        '--no-warnings',
        '--yes-playlist',
        '--socket-timeout',
        '20',
        '--',
        url
      ],
      45_000
    )
    if (!output) return null
    try {
      const parsed = JSON.parse(output) as {
        title?: string
        playlist_count?: number
        entries?: unknown[]
      }
      const total = Number(parsed.playlist_count ?? parsed.entries?.length ?? 0) || 0
      return { title: parsed.title?.trim() || 'Playlist', total }
    } catch {
      return null
    }
  }

  async start(request: DownloadRequest): Promise<DownloadStartResult> {
    if (this.running) return { ok: false, error: 'A download is already running.' }

    const url = request.url?.trim()
    if (!url) return { ok: false, error: 'No track was selected.' }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, error: 'Only http(s) links can be downloaded.' }
      }
    } catch {
      return { ok: false, error: 'That download link is not valid.' }
    }

    const tool = await this.resolveTool()
    if (!tool.available || !tool.command) return { ok: false, error: tool.error }
    if (!tool.ffmpeg) {
      return {
        ok: false,
        error:
          'ffmpeg was not found. Reinstall Lagu or set LAGU_FFMPEG_PATH to an ffmpeg binary.'
      }
    }

    let folder: string
    try {
      folder = await this.resolveFolder(request.folder)
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Could not use that download folder.'
      }
    }

    const format: DownloadFormat = FORMATS.has(request.format as DownloadFormat)
      ? (request.format as DownloadFormat)
      : this.store.settings.downloadFormat
    const quality: DownloadQuality = QUALITIES.has(request.quality as DownloadQuality)
      ? (request.quality as DownloadQuality)
      : this.store.settings.downloadQuality
    const playlist = request.playlist ?? isPlaylistUrl(url)
    const requestedTitle = request.title?.trim() || 'download'

    this.running = true
    this.cancelled = false
    this.emit({ phase: 'downloading', title: requestedTitle, percent: 0 })

    const info = playlist ? await this.probePlaylist(tool.command, url) : null
    if (this.cancelled) {
      this.running = false
      this.emit({ phase: 'cancelled', title: requestedTitle })
      return { ok: false, cancelled: true, error: 'Download cancelled.' }
    }

    const title = info?.title ?? requestedTitle
    const total = info?.total ?? 0

    const args = [
      playlist ? '--yes-playlist' : '--no-playlist',
      ...(playlist ? ['--ignore-errors'] : []),
      '--extract-audio',
      '--audio-format',
      format,
      '--audio-quality',
      qualityArg(quality),
      '--embed-metadata',
      '--no-mtime',
      '--no-warnings',
      '--newline',
      '--progress',
      '--progress-template',
      'download:LAGU_PROGRESS:%(progress._percent_str)s',
      '--print',
      'after_move:LAGU_FILE:%(filepath)s',
      ...(playlist
        ? ['--print', 'before_dl:LAGU_ITEM:%(playlist_index)s|%(n_entries)s|%(title)s']
        : []),
      ...(tool.ffmpegPath && path.isAbsolute(tool.ffmpegPath)
        ? ['--ffmpeg-location', path.dirname(tool.ffmpegPath)]
        : []),
      '--socket-timeout',
      '20',
      '-o',
      playlist
        ? '%(playlist_title|Playlist)s/%(title)s [%(id)s].%(ext)s'
        : '%(title)s [%(id)s].%(ext)s',
      '--',
      url
    ]

    // MP3 cover embedding is reliable through ffmpeg; other containers may
    // require extra tooling, so leave their tags (but not artwork) untouched.
    if (format === 'mp3') {
      args.splice(args.indexOf('--no-mtime'), 0, '--embed-thumbnail')
    }

    const startedAt = Date.now()
    this.emit({
      phase: 'downloading',
      title,
      percent: 0,
      completed: 0,
      total: total || undefined,
      message: playlist ? 'Reading playlist…' : undefined
    })

    return new Promise<DownloadStartResult>((resolve) => {
      let settled = false
      let finalFile: string | null = null
      let destination: string | null = null
      let lastPercent = -1
      let stderr = ''
      let stdout = ''
      let completed = 0
      let knownTotal = total
      let currentItem: string | undefined
      const files: string[] = []

      const finish = (result: DownloadStartResult): void => {
        if (settled) return
        settled = true
        this.running = false
        this.child = null
        resolve(result)
      }

      const overallPercent = (itemPercent: number): number => {
        if (!playlist || knownTotal <= 0) return itemPercent
        return Math.min(100, ((completed + itemPercent / 100) / knownTotal) * 100)
      }

      const child = spawn(tool.command as string, args, {
        cwd: folder,
        windowsHide: true
      })
      this.child = child

      const onLine = (raw: string): void => {
        const line = raw.trim()
        if (!line) return

        if (line.startsWith('LAGU_ITEM:')) {
          const [indexText, totalText, ...titleParts] = line
            .slice('LAGU_ITEM:'.length)
            .split('|')
          currentItem = titleParts.join('|').trim() || undefined
          const index = Number.parseInt(indexText, 10)
          const itemTotal = Number.parseInt(totalText, 10)
          if (Number.isFinite(itemTotal) && itemTotal > 0) knownTotal = itemTotal
          if (Number.isFinite(index) && index > 0) completed = Math.max(0, index - 1)
          this.emit({
            phase: 'downloading',
            title,
            percent: Math.round(overallPercent(0)),
            completed,
            total: knownTotal || undefined,
            message: currentItem
          })
          return
        }

        if (line.startsWith('LAGU_PROGRESS:')) {
          const percent = Number.parseFloat(line.slice('LAGU_PROGRESS:'.length))
          if (Number.isFinite(percent)) {
            const rounded = Math.max(0, Math.min(100, Math.round(overallPercent(percent))))
            if (rounded !== lastPercent) {
              lastPercent = rounded
              this.emit({
                phase: 'downloading',
                title,
                percent: rounded,
                completed,
                total: knownTotal || undefined,
                message: currentItem
              })
            }
          }
          return
        }

        if (line.startsWith('LAGU_FILE:')) {
          const rawFile = line.slice('LAGU_FILE:'.length).trim()
          if (!rawFile) return
          const file = path.isAbsolute(rawFile) ? rawFile : path.resolve(folder, rawFile)
          if (playlist) {
            files.push(file)
            completed += 1
            this.emit({
              phase: 'downloading',
              title,
              percent: Math.round(overallPercent(100)),
              completed,
              total: knownTotal || undefined,
              message: currentItem
            })
          } else {
            finalFile = file
          }
          return
        }

        if (line.startsWith('[download] Destination:')) {
          destination = line.slice('[download] Destination:'.length).trim()
          return
        }

        if (!playlist && /^\[(ExtractAudio|Metadata|EmbedThumbnail|ThumbnailsConvertor)\]/.test(line)) {
          this.emit({ phase: 'processing', title, percent: 100, message: line })
        }
      }

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stdout += text
        for (const line of text.split(/\r?\n/)) onLine(line)
      })
      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stderr += text
        for (const line of text.split(/\r?\n/)) onLine(line)
      })

      child.on('error', (err) => {
        this.running = false
        this.child = null
        this.emit({ phase: 'error', title, message: err.message })
        finish({ ok: false, error: err.message })
      })

      child.on('close', (code) => {
        void (async () => {
          if (settled) return

          if (this.cancelled) {
            await this.cleanupPartial(folder, destination)
            const tracks = files.length > 0 ? await this.library.openFile(files) : []
            this.emit({
              phase: 'cancelled',
              title,
              completed,
              total: knownTotal || undefined,
              track: tracks[0]
            })
            finish({
              ok: false,
              cancelled: true,
              error: 'Download cancelled.',
              tracks
            })
            return
          }

          const downloaded = playlist ? files : []
          if (!playlist) {
            let file = finalFile
            if (!file || !(await this.exists(file))) {
              file = await this.findDownloaded(folder, request, startedAt)
            }
            if (file) downloaded.push(file)
          }

          const existing: string[] = []
          for (const file of downloaded) {
            if (await this.exists(file)) existing.push(file)
          }

          if (existing.length === 0) {
            const message = friendlyError(
              stderr || stdout || `yt-dlp exited with code ${code ?? 'unknown'}.`
            )
            this.emit({ phase: 'error', title, message, completed, total: knownTotal || undefined })
            finish({ ok: false, error: message })
            return
          }

          try {
            const tracks = await this.library.openFile(existing)
            const track = tracks[0]
            this.emit({
              phase: 'done',
              title,
              percent: 100,
              completed: playlist ? existing.length : 1,
              total: knownTotal || existing.length,
              file: existing[0],
              track
            })
            finish({ ok: true, track, tracks })
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : 'Downloaded, but could not add it to the library.'
            this.emit({ phase: 'error', title, message, completed, total: knownTotal || undefined })
            finish({ ok: false, error: message })
          }
        })()
      })
    })
  }

  private async exists(file: string): Promise<boolean> {
    try {
      return (await fs.stat(file)).isFile()
    } catch {
      return false
    }
  }

  /** On cancellation, remove the partial download (yt-dlp uses `.part`). */
  private async cleanupPartial(folder: string, destination: string | null): Promise<void> {
    if (!destination) return
    const target = path.isAbsolute(destination) ? destination : path.resolve(folder, destination)
    for (const candidate of [target, `${target}.part`, `${target}.ytdl`]) {
      await fs.rm(candidate, { force: true }).catch(() => undefined)
    }
  }

  /** Fallback when yt-dlp exits oddly but the audio file already exists. */
  private async findDownloaded(
    folder: string,
    request: DownloadRequest,
    startedAt: number
  ): Promise<string | null> {
    let entries: string[]
    try {
      entries = await fs.readdir(folder)
    } catch {
      return null
    }
    const id = /[?&]v=([^&]+)/.exec(request.url)?.[1]
    const audioExtensions = new Set(['mp3', 'm4a', 'opus', 'ogg', 'webm', 'wav', 'flac', 'mp4', 'aac'])
    const candidates = entries
      .filter((name) => !name.endsWith('.part') && !name.endsWith('.ytdl'))
      .filter((name) => (id ? name.includes(`[${id}]`) : true))
      .filter((name) => audioExtensions.has(path.extname(name).slice(1).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
    for (const name of candidates) {
      const full = path.join(folder, name)
      const stat = await fs.stat(full).catch(() => null)
      if (stat?.isFile() && stat.size > 0 && stat.mtimeMs >= startedAt - 2_000) return full
    }
    return null
  }

  cancel(): boolean {
    if (!this.running) return false
    this.cancelled = true
    if (!this.child) return true
    try {
      this.child.kill(process.platform === 'win32' ? undefined : 'SIGINT')
    } catch {
      try {
        this.child.kill()
      } catch {
        /* already gone */
      }
    }
    return true
  }
}
