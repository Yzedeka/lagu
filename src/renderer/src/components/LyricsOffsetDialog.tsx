import { useEffect, useState } from 'react'
import { CloseIcon, LyricsIcon } from '@renderer/icons'

interface LyricsOffsetDialogProps {
  /** Current per-track offset in ms, or null when using the default. */
  trackOffset: number | null
  /** Global default offset in ms (shown as the fallback). */
  defaultOffset: number
  onSave: (ms: number) => void
  onUseDefault: () => void
  onClose: () => void
}

const MAX_SECONDS = 600

export function LyricsOffsetDialog({
  trackOffset,
  defaultOffset,
  onSave,
  onUseDefault,
  onClose
}: LyricsOffsetDialogProps) {
  const [text, setText] = useState(((trackOffset ?? defaultOffset) / 1000).toString())

  useEffect(() => {
    setText(((trackOffset ?? defaultOffset) / 1000).toString())
  }, [trackOffset, defaultOffset])

  // Accept both "." and "," as the decimal separator.
  const parsed = Number(text.replace(',', '.'))
  const valid = text.trim() !== '' && Number.isFinite(parsed)

  const toMs = (seconds: number): number =>
    Math.round(Math.max(-MAX_SECONDS, Math.min(MAX_SECONDS, seconds)) * 1000)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--narrow" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <span className="modal__title">
            <LyricsIcon size={15} /> Edit .lrc timing
          </span>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>

        <div className="modal__body">
          <label className="field">
            <span>Offset for this track (seconds)</span>
            <input
              type="number"
              className="text-input"
              step="0.1"
              min={-MAX_SECONDS}
              max={MAX_SECONDS}
              value={text}
              autoFocus
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && valid) {
                  onSave(toMs(parsed))
                  onClose()
                }
              }}
            />
          </label>
          <p className="modal__hint">
            Positive delays the lyrics, negative makes them earlier. Overrides the global offset
            ({(defaultOffset / 1000).toFixed(1)}s) for this track only.
          </p>
          {!valid && <p className="modal__error">Enter a number of seconds.</p>}
        </div>

        <footer className="modal__footer">
          <button type="button" className="ghost-btn" onClick={() => { onUseDefault(); onClose() }}>
            Use default
          </button>
          <div className="modal__spacer" />
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            disabled={!valid}
            onClick={() => {
              onSave(toMs(parsed))
              onClose()
            }}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}
