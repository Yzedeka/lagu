import { useEffect, type ReactNode } from 'react'
import { CloseIcon, WarningIcon } from '@renderer/icons'

interface ConfirmDialogProps {
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose
}: ConfirmDialogProps) {
  // Capture Escape before the app-wide shortcuts see it (e.g. leaving fullscreen).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--narrow" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <span className="modal__title">
            <WarningIcon size={15} /> {title}
          </span>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>
        <div className="modal__body">
          <p className="confirm__message">{message}</p>
        </div>
        <footer className="modal__footer">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? 'danger-btn' : 'primary-btn'}
            autoFocus
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
