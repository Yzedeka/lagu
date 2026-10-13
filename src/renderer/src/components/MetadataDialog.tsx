import { useState } from 'react'
import type { MetadataPatch } from '@shared/types'
import { CloseIcon, ImageIcon, TextFieldsIcon, TrashIcon } from '@renderer/icons'

export interface MetadataInitial {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  year?: number
  trackNo?: number
}

interface MetadataDialogProps {
  scope: 'track' | 'album' | 'artist'
  initial: MetadataInitial
  trackCount: number
  onSave: (patch: MetadataPatch) => void
  onClear: () => void
  onSetCover: () => void
  onClose: () => void
}

export function MetadataDialog({
  scope,
  initial,
  trackCount,
  onSave,
  onClear,
  onSetCover,
  onClose
}: MetadataDialogProps) {
  const [title, setTitle] = useState(initial.title ?? '')
  const [artist, setArtist] = useState(initial.artist ?? '')
  const [album, setAlbum] = useState(initial.album ?? '')
  const [albumArtist, setAlbumArtist] = useState(initial.albumArtist ?? '')
  const [year, setYear] = useState(initial.year ? String(initial.year) : '')
  const [trackNo, setTrackNo] = useState(initial.trackNo ? String(initial.trackNo) : '')

  const isTrack = scope === 'track'
  const isArtist = scope === 'artist'

  const save = (): void => {
    const patch: MetadataPatch = {}
    if (isTrack) {
      patch.title = title
      patch.artist = artist
      patch.trackNo = trackNo.trim() === '' ? null : Number(trackNo) || null
    }
    if (isArtist) {
      patch.artist = artist
    }
    if (!isArtist) {
      patch.album = album
      patch.albumArtist = albumArtist
      patch.year = year.trim() === '' ? null : Number(year) || null
    }
    onSave(patch)
    onClose()
  }

  const heading = isTrack ? 'track' : isArtist ? 'artist' : 'album'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <span className="modal__title">
            <TextFieldsIcon size={15} /> Edit {heading}
          </span>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>

        <div className="modal__body">
          {!isTrack && (
            <p className="modal__hint" style={{ marginTop: 0, marginBottom: 12 }}>
              Applies to {trackCount} track{trackCount === 1 ? '' : 's'}.
            </p>
          )}

          <div className="field-grid">
            {isTrack && (
              <label className="field">
                <span>Title</span>
                <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              </label>
            )}
            <label className="field">
              <span>Artist</span>
              <input
                className="text-input"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                autoFocus={isArtist}
              />
            </label>
            {!isArtist && (
              <>
                <label className="field">
                  <span>Album</span>
                  <input className="text-input" value={album} onChange={(e) => setAlbum(e.target.value)} />
                </label>
                <label className="field">
                  <span>Album artist</span>
                  <input className="text-input" value={albumArtist} onChange={(e) => setAlbumArtist(e.target.value)} />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Year</span>
                    <input className="text-input" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
                  </label>
                  {isTrack && (
                    <label className="field">
                      <span>Track #</span>
                      <input
                        className="text-input"
                        value={trackNo}
                        onChange={(e) => setTrackNo(e.target.value)}
                        inputMode="numeric"
                      />
                    </label>
                  )}
                </div>
              </>
            )}
          </div>

          <p className="modal__hint">
            Edits are saved in Lagu and never written to your files. Clear your edits to fall back
            to the file's tags.
          </p>
        </div>

        <footer className="modal__footer">
          {!isArtist && (
            <button type="button" className="ghost-btn" onClick={onSetCover}>
              <ImageIcon size={14} /> Set cover…
            </button>
          )}
          <button type="button" className="ghost-btn icon-btn--danger" onClick={() => { onClear(); onClose() }}>
            <TrashIcon size={14} /> Reset
          </button>
          <div className="modal__spacer" />
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={save}>
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}
