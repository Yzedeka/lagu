import { useEffect, useState } from 'react'
import type { Lyrics } from '@shared/types'
import { CloseIcon, LyricsIcon, LyricsImportIcon, LyricsRemoveIcon } from '@renderer/icons'

const api = window.lagu
const MAX_SECONDS = 600

interface LyricsDialogProps {
  trackId: string
  /** Per-track offset in ms, or null when using the default. */
  trackOffset: number | null
  /** Global default offset in ms. */
  defaultOffset: number
  onImport: () => void
  onClear: () => void
  onSetOffset: (ms: number | null) => void
  onClose: () => void
}

/** Import / remove a .lrc and nudge the timing for a single track. */
export function LyricsDialog({
  trackId,
  trackOffset,
  defaultOffset,
  onImport,
  onClear,
  onSetOffset,
  onClose
}: LyricsDialogProps) {
  const [lyrics, setLyrics] = useState<Lyrics | null>(null)
  const [text, setText] = useState(((trackOffset ?? defaultOffset) / 1000).toString())

  const reload = (): void => {
    void api.track.lyrics(trackId).then(setLyrics)
  }

  useEffect(reload, [trackId])

  useEffect(() => {
    setText(((trackOffset ?? defaultOffset) / 1000).toString())
  }, [trackOffset, defaultOffset])

  const parsed = Number(text.replace(',', '.'))
  const valid = text.trim() !== '' && Number.isFinite(parsed)
  const toMs = (seconds: number): number =>
    Math.round(Math.max(-MAX_SECONDS, Math.min(MAX_SECONDS, seconds)) * 1000)

  const status = !lyrics || (lyrics.lines.length === 0 && !lyrics.plain)
    ? 'No lyrics for this track.'
    : lyrics.synced
      ? 'Synchronized lyrics.'
      : 'Lyrics found, but not synchronized.'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--narrow" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <span className="modal__title">
            <LyricsIcon size={15} /> Lyrics
          </span>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>

        <div className="modal__body">
          <p className="lyrics-dialog__status">{status}</p>

          {lyrics?.synced && (
            <label className="field">
              <span>Timing offset for this track (seconds)</span>
              <input
                type="number"
                className="text-input"
                step="0.1"
                min={-MAX_SECONDS}
                max={MAX_SECONDS}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
          )}

          <p className="modal__hint">
            Import a .lrc file to add lyrics. They are stored in the app - your music files are
            never changed.
          </p>
        </div>

        <footer className="modal__footer">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              onImport()
              setTimeout(reload, 300)
            }}
          >
            <LyricsImportIcon size={14} /> Import .lrc
          </button>
          {lyrics?.imported && (
            <button
              type="button"
              className="ghost-btn icon-btn--danger"
              onClick={() => {
                onClear()
                setTimeout(reload, 300)
              }}
            >
              <LyricsRemoveIcon size={14} /> Remove
            </button>
          )}
          <div className="modal__spacer" />
          {lyrics?.synced && (
            <>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  onSetOffset(null)
                  onClose()
                }}
              >
                Use default
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={!valid}
                onClick={() => {
                  onSetOffset(toMs(parsed))
                  onClose()
                }}
              >
                Save
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
