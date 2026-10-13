import { useState } from 'react'
import type { AddUrlResult } from '@shared/types'
import { CloseIcon, LinkIcon } from '@renderer/icons'

interface AddUrlDialogProps {
  onSubmit: (url: string) => Promise<AddUrlResult>
  onClose: () => void
}

export function AddUrlDialog({ onSubmit, onClose }: AddUrlDialogProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (): Promise<void> => {
    if (!url.trim()) return
    setBusy(true)
    setError(null)
    const result = await onSubmit(url.trim())
    setBusy(false)
    if (result.ok) {
      onClose()
    } else {
      setError(result.error ?? 'Could not add that URL.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <span className="modal__title">
            <LinkIcon size={14} /> Add audio URL
          </span>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            <CloseIcon size={14} />
          </button>
        </header>
        <div className="modal__body">
          <input
            className="text-input"
            type="url"
            autoFocus
            placeholder="https://example.com/stream.mp3"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
              if (e.key === 'Escape') onClose()
            }}
          />
          <p className="modal__hint">
            Direct links to MP3, M4A, OGG, Opus, FLAC or WAV. Cross-origin streams may not
            drive the visualizer.
          </p>
          {error && <p className="modal__error">{error}</p>}
        </div>
        <footer className="modal__footer">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Adding…' : 'Add & queue'}
          </button>
        </footer>
      </div>
    </div>
  )
}
