import { useEffect, useState } from 'react'
import type {
  DownloadFormat,
  DownloadJobStatus,
  DownloadQuality,
  DownloadSearchResult,
  DownloadToolStatus
} from '@shared/types'
import {
  CloseIcon,
  CloudDownloadIcon,
  FolderIcon,
  SearchIcon
} from '@renderer/icons'
import { formatTime } from '@renderer/lib/format'

const api = window.lagu

const FORMATS: { id: DownloadFormat; label: string }[] = [
  { id: 'mp3', label: 'MP3' },
  { id: 'm4a', label: 'M4A' },
  { id: 'opus', label: 'Opus' }
]

const QUALITIES: { id: DownloadQuality; label: string }[] = [
  { id: 'best', label: 'Best' },
  { id: '320', label: '320 kbps' },
  { id: '192', label: '192 kbps' },
  { id: '128', label: '128 kbps' }
]

interface DownloadDialogProps {
  /** Configured default folder ('' means the first library folder). */
  defaultFolder: string
  defaultFormat: DownloadFormat
  defaultQuality: DownloadQuality
  onClose: () => void
}

function isCollectionLink(value: string): boolean {
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

export function DownloadDialog({
  defaultFolder,
  defaultFormat,
  defaultQuality,
  onClose
}: DownloadDialogProps) {
  const [query, setQuery] = useState('')
  const [link, setLink] = useState('')
  const [results, setResults] = useState<DownloadSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [folder, setFolder] = useState(defaultFolder)
  const [effectiveFolder, setEffectiveFolder] = useState(defaultFolder)
  const [format, setFormat] = useState(defaultFormat)
  const [quality, setQuality] = useState(defaultQuality)
  const [job, setJob] = useState<DownloadJobStatus>({ phase: 'idle' })
  const [tool, setTool] = useState<DownloadToolStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const busy = job.phase === 'downloading' || job.phase === 'processing'

  useEffect(() => {
    let cancelled = false
    void api.downloads.defaultFolder().then((value) => {
      if (!cancelled) setEffectiveFolder(value)
    })
    void api.downloads.toolStatus().then((value) => {
      if (!cancelled) setTool(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => api.events.onDownloadProgress(setJob), [])

  const search = async (): Promise<void> => {
    const term = query.trim()
    if (!term || searching) return
    setSearching(true)
    setSearchError(null)
    const response = await api.downloads.search(term)
    setSearching(false)
    if (response.ok) {
      setResults(response.results ?? [])
      if ((response.results ?? []).length === 0) setSearchError('No results found.')
    } else {
      setSearchError(response.error ?? 'The search failed.')
    }
  }

  const chooseFolder = async (): Promise<void> => {
    const picked = await api.downloads.pickFolder()
    if (!picked) return
    setFolder(picked)
    setEffectiveFolder(picked)
  }

  const download = async (result: DownloadSearchResult): Promise<void> => {
    if (busy) return
    setError(null)
    setJob({ phase: 'downloading', title: result.title, percent: 0 })
    const response = await api.downloads.start({
      url: result.url,
      title: result.title,
      folder: folder.trim() || undefined,
      format,
      quality,
      playlist: false
    })
    if (!response.ok && !response.cancelled) {
      setError(response.error ?? 'The download failed.')
      setJob({ phase: 'error', title: result.title, message: response.error })
    }
  }

  const downloadLink = async (): Promise<void> => {
    const value = link.trim()
    if (!value || busy) return
    setError(null)
    setJob({ phase: 'downloading', title: 'YouTube link', percent: 0 })
    const response = await api.downloads.start({
      url: value,
      title: 'YouTube link',
      folder: folder.trim() || undefined,
      format,
      quality,
      playlist: isCollectionLink(value)
    })
    if (!response.ok && !response.cancelled) {
      setError(response.error ?? 'The download failed.')
      setJob({ phase: 'error', title: 'YouTube link', message: response.error })
    }
  }

  const cancel = (): void => {
    void api.downloads.cancel()
  }

  const toolUnavailable = tool !== null && !tool.available
  const ffmpegMissing = tool !== null && tool.available && !tool.ffmpeg
  const destination = folder.trim() || effectiveFolder

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <span className="modal__title">
            <CloudDownloadIcon size={15} /> Download music
          </span>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>

        <div className="modal__body download-dialog">
          {toolUnavailable && (
            <p className="modal__error">
              {tool?.error ?? 'yt-dlp is not available. Reinstall Lagu or add yt-dlp to your PATH.'}
            </p>
          )}
          {ffmpegMissing && (
            <p className="modal__hint download-dialog__warn">
              ffmpeg was not found. Install it so downloads can be converted to {format.toUpperCase()}.
            </p>
          )}

          <div className="download-dialog__search">
            <input
              className="text-input"
              type="search"
              autoFocus
              placeholder="Search YouTube for a song…"
              value={query}
              spellCheck={false}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void search()
                if (e.key === 'Escape') onClose()
              }}
            />
            <button
              type="button"
              className="primary-btn"
              disabled={!query.trim() || searching || toolUnavailable}
              onClick={() => void search()}
            >
              <SearchIcon size={14} /> {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          <div className="download-dialog__link">
            <input
              className="text-input"
              type="url"
              placeholder="Paste a YouTube playlist or album link…"
              value={link}
              spellCheck={false}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void downloadLink()
                if (e.key === 'Escape') onClose()
              }}
            />
            <button
              type="button"
              className="ghost-btn"
              disabled={!link.trim() || busy || toolUnavailable}
              onClick={() => void downloadLink()}
            >
              {isCollectionLink(link) ? 'Download all' : 'Download'}
            </button>
          </div>

          <div className="download-dialog__options">
            <div className="download-dialog__option download-dialog__option--folder">
              <span className="download-dialog__label">Save to</span>
              <span className="download-dialog__folder" title={destination}>
                <FolderIcon size={13} /> {destination || 'Choose a folder'}
              </span>
              <button type="button" className="ghost-btn" onClick={() => void chooseFolder()}>
                Change
              </button>
            </div>
            <div className="download-dialog__option">
              <span className="download-dialog__label">Format</span>
              <select
                className="select"
                value={format}
                aria-label="Download format"
                onChange={(e) => setFormat(e.target.value as DownloadFormat)}
              >
                {FORMATS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="download-dialog__option">
              <span className="download-dialog__label">Quality</span>
              <select
                className="select"
                value={quality}
                aria-label="Download quality"
                onChange={(e) => setQuality(e.target.value as DownloadQuality)}
              >
                {QUALITIES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {searchError && <p className="modal__error">{searchError}</p>}
          {error && <p className="modal__error">{error}</p>}

          {results.length > 0 && (
            <div className="download-results">
              {results.map((result) => (
                <div key={result.id} className="download-result">
                  {result.thumbnail ? (
                    <img
                      className="download-result__thumb"
                      src={result.thumbnail}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="download-result__thumb download-result__thumb--empty">
                      <CloudDownloadIcon size={18} />
                    </div>
                  )}
                  <div className="download-result__meta">
                    <span className="download-result__title" title={result.title}>
                      {result.title}
                    </span>
                    <span className="download-result__sub">
                      {result.uploader || 'Unknown uploader'}
                      {result.duration ? ` · ${formatTime(result.duration)}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    title={busy ? 'A download is already running' : 'Download'}
                    disabled={busy || toolUnavailable}
                    onClick={() => void download(result)}
                  >
                    <CloudDownloadIcon size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {job.phase !== 'idle' && (
            <div className={`download-job download-job--${job.phase}`}>
              <div className="download-job__row">
                <span className="download-job__title">
                  {job.phase === 'done'
                    ? 'Added to library'
                    : job.phase === 'error'
                      ? 'Download failed'
                      : job.phase === 'cancelled'
                        ? 'Download cancelled'
                        : `Downloading ${job.title ?? ''}`}
                </span>
                <span className="download-job__percent">
                  {job.phase === 'downloading'
                    ? job.total && job.total > 1
                      ? `${job.completed ?? 0}/${job.total} · ${job.percent ?? 0}%`
                      : `${job.percent ?? 0}%`
                    : job.phase === 'done' && job.completed && job.completed > 1
                      ? `${job.completed} tracks`
                      : ''}
                </span>
              </div>
              {(job.phase === 'downloading' || job.phase === 'processing') && (
                <div className="download-job__bar">
                  <span style={{ width: `${job.phase === 'processing' ? 100 : job.percent ?? 0}%` }} />
                </div>
              )}
              {job.message && <span className="download-job__message">{job.message}</span>}
              {job.phase === 'done' && (
                <span className="download-job__message">
                  {job.completed && job.completed > 1
                    ? `${job.completed} tracks added to your library`
                    : job.track?.title}
                </span>
              )}
              {busy && (
                <button type="button" className="ghost-btn download-job__cancel" onClick={cancel}>
                  Cancel
                </button>
              )}
            </div>
          )}

          <p className="modal__hint">
            Searches and downloads through yt-dlp. Downloading may be subject to the source
            site&apos;s terms.
          </p>
        </div>

        <footer className="modal__footer">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
