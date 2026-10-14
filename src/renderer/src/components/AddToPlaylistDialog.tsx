import { useState } from 'react'
import type { Playlist } from '@shared/types'
import { CloseIcon, PlaylistIcon, PlusIcon } from '@renderer/icons'

interface AddToPlaylistDialogProps {
  playlists: Playlist[]
  trackCount: number
  createOnly?: boolean
  onAdd: (playlistId: string) => void
  onCreate: (name: string) => void
  onClose: () => void
}

export function AddToPlaylistDialog({
  playlists,
  trackCount,
  createOnly = false,
  onAdd,
  onCreate,
  onClose
}: AddToPlaylistDialogProps) {
  const [name, setName] = useState('')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--narrow" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <span className="modal__title">
            <PlaylistIcon size={15} /> {createOnly ? 'New playlist' : 'Add to playlist'}
          </span>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>
        <div className="modal__body">
          {!createOnly && (
            <>
              <p className="modal__hint">
                {trackCount} track{trackCount === 1 ? '' : 's'} selected
              </p>

              <div className="addpl__list">
                {playlists.length === 0 && (
                  <div className="addpl__empty">No playlists yet — create one below.</div>
                )}
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    className="addpl__row"
                    onClick={() => onAdd(playlist.id)}
                  >
                    <PlaylistIcon size={14} />
                    <span className="addpl__name">{playlist.name}</span>
                    <span className="addpl__count">{playlist.trackIds.length}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="addpl__new">
            <input
              className="text-input"
              type="text"
              value={name}
              placeholder="Playlist name"
              spellCheck={false}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onCreate(name)
              }}
            />
            <button
              type="button"
              className="primary-btn"
              disabled={!name.trim()}
              onClick={() => onCreate(name)}
            >
              <PlusIcon size={14} /> Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
