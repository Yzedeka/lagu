import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { LibraryFolder, PinnedItem, Track } from '@shared/types'
import {
  AlbumIcon,
  ArtistIcon,
  CreateFolderIcon,
  DiscIcon,
  FolderIcon,
  GraphicEqIcon,
  KeyboardIcon,
  LibraryIcon,
  LinkIcon,
  RefreshIcon,
  SettingsIcon,
  TrashIcon
} from '@renderer/icons'
import { AlbumArt } from './AlbumArt'
import { SearchBar } from './SearchBar'
import appIconUrl from '@renderer/icons/app_icon.png'
import wordmarkUrl from '@renderer/icons/lagu-wordmark.png'
import { folderName } from '@renderer/lib/format'
import { albumKeyOf } from '@renderer/lib/album'
import { useArtistImage } from '@renderer/state/useArtistImage'

export type BrowseSection = 'library' | 'albums' | 'artists' | 'folders'
export type SidebarSelection = 'now' | BrowseSection | 'search' | 'settings'

interface SidebarProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  width: number
  onResize: (width: number) => void
  onResizeEnd: (width: number) => void
  folders: LibraryFolder[]
  trackCount: number
  scanning: boolean
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  pinned: PinnedItem[]
  tracks: Track[]
  onActivatePin: (pin: PinnedItem) => void
  onUnpin: (id: string) => void
  onAddFolder: () => void
  onRescan: () => void
  onRemoveFolder: (id: string) => void
  onAddUrl: () => void
  onOpenShortcuts: () => void
}

const NAV: { id: BrowseSection; label: string; icon: typeof GraphicEqIcon }[] = [
  { id: 'library', label: 'Library', icon: LibraryIcon },
  { id: 'albums', label: 'Albums', icon: AlbumIcon },
  { id: 'artists', label: 'Artists', icon: ArtistIcon },
  { id: 'folders', label: 'Folders', icon: FolderIcon }
]

export function Sidebar({
  selection,
  onSelect,
  width,
  onResize,
  onResizeEnd,
  folders,
  trackCount,
  scanning,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  pinned,
  tracks,
  onActivatePin,
  onUnpin,
  onAddFolder,
  onRescan,
  onRemoveFolder,
  onAddUrl,
  onOpenShortcuts
}: SidebarProps) {
  const startX = useRef(0)
  const startWidth = useRef(width)

  const clamp = (value: number): number => Math.min(440, Math.max(150, value))

  const beginResize = (e: ReactPointerEvent): void => {
    e.preventDefault()
    startX.current = e.clientX
    startWidth.current = width
    const move = (ev: PointerEvent): void => {
      onResize(clamp(startWidth.current + (ev.clientX - startX.current)))
    }
    const up = (ev: PointerEvent): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onResizeEnd(clamp(startWidth.current + (ev.clientX - startX.current)))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <aside className="sidebar" style={{ width }}>
      <div
        className="sidebar__resizer"
        title="Drag to resize"
        onPointerDown={beginResize}
        role="separator"
        aria-orientation="vertical"
      />

      <div className="sidebar__brand">
        <img className="sidebar__brand-icon" src={appIconUrl} alt="" draggable={false} />
        <img className="sidebar__brand-wordmark" src={wordmarkUrl} alt="Lagu" draggable={false} />
      </div>

      <div className="sidebar__search">
        <SearchBar
          value={searchValue}
          placeholder="Search library…"
          compact
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          onClear={() => {
            onSearchChange('')
            onSearchSubmit()
          }}
        />
      </div>

      <nav className="sidebar__nav">
        <button
          type="button"
          className={`nav-item ${selection === 'now' ? 'nav-item--active' : ''}`}
          onClick={() => onSelect('now')}
        >
          <GraphicEqIcon size={16} />
          <span>Now Playing</span>
        </button>
      </nav>

      {pinned.length > 0 && (
        <>
          <div className="sidebar__label">Pinned</div>
          <div className="sidebar__pins">
            {pinned.map((pin) => (
              <PinRow
                key={pin.id}
                pin={pin}
                tracks={tracks}
                onActivate={onActivatePin}
                onUnpin={onUnpin}
              />
            ))}
          </div>
        </>
      )}

      <div className="sidebar__label">Library</div>
      <nav className="sidebar__nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${selection === id ? 'nav-item--active' : ''}`}
            onClick={() => onSelect(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__label">App</div>
      <nav className="sidebar__nav">
        <button
          type="button"
          className={`nav-item ${selection === 'settings' ? 'nav-item--active' : ''}`}
          onClick={() => onSelect('settings')}
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </button>
      </nav>

      <div className="sidebar__label sidebar__label--row">
        <span>Folders</span>
        <div className="sidebar__label-actions">
          <button type="button" className="icon-btn" title="Add folder" onClick={onAddFolder}>
            <CreateFolderIcon size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Rescan library"
            onClick={onRescan}
            disabled={scanning || folders.length === 0}
          >
            <RefreshIcon size={16} />
          </button>
          <button type="button" className="icon-btn" title="Add stream URL" onClick={onAddUrl}>
            <LinkIcon size={16} />
          </button>
        </div>
      </div>

      <div className="sidebar__folders">
        {folders.length === 0 && <div className="sidebar__hint">No folders added</div>}
        {folders.map((folder) => (
          <div key={folder.id} className="folder-item" title={folder.path}>
            <FolderIcon size={14} />
            <span className="folder-item__name">{folderName(folder.path)}</span>
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              title="Remove from library"
              onClick={() => onRemoveFolder(folder.id)}
            >
              <TrashIcon size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar__footer">
        <span className="sidebar__hint">
          {trackCount} track{trackCount === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          className="icon-btn"
          title="Keyboard shortcuts (?)"
          onClick={onOpenShortcuts}
        >
          <KeyboardIcon size={16} />
        </button>
      </div>
    </aside>
  )
}


function PinThumb({
  kind,
  artTrackId,
  artistName
}: {
  kind: PinnedItem['kind']
  artTrackId: string | null
  artistName: string | null
}) {
  const artistImage = useArtistImage(kind === 'artist' ? artistName : null)
  if (kind === 'artist' && artistImage) {
    return <img className="pin-thumb art" src={artistImage} alt="" draggable={false} />
  }
  if (artTrackId) return <AlbumArt trackId={artTrackId} className="pin-thumb" iconSize={14} />
  return (
    <div className="pin-thumb art--fallback">
      {kind === 'artist' ? <ArtistIcon size={14} /> : <DiscIcon size={14} />}
    </div>
  )
}

function PinRow({
  pin,
  tracks,
  onActivate,
  onUnpin
}: {
  pin: PinnedItem
  tracks: Track[]
  onActivate: (pin: PinnedItem) => void
  onUnpin: (id: string) => void
}) {
  let artTrackId: string | null = null
  let artistName: string | null = null

  if (pin.kind === 'track') {
    artTrackId = tracks.find((t) => t.id === pin.ref)?.id ?? null
  } else if (pin.kind === 'album') {
    const list = tracks.filter((t) => albumKeyOf(t) === pin.ref)
    artTrackId = (list.find((t) => t.hasArtwork) ?? list[0])?.id ?? null
  } else {
    const list = tracks.filter((t) => (t.albumArtist || t.artist) === pin.ref)
    artTrackId = (list.find((t) => t.hasArtwork) ?? list[0])?.id ?? null
    artistName = pin.ref
  }

  return (
    <button
      type="button"
      className="pin-row"
      title={`${pin.label}${pin.subtitle ? ` - ${pin.subtitle}` : ''}`}
      onClick={() => onActivate(pin)}
      onContextMenu={(e) => {
        e.preventDefault()
        onUnpin(pin.id)
      }}
    >
      <PinThumb kind={pin.kind} artTrackId={artTrackId} artistName={artistName} />
      <span className="pin-row__meta">
        <span className="pin-row__label">{pin.label}</span>
        {pin.subtitle && <span className="pin-row__sub">{pin.subtitle}</span>}
      </span>
      <span
        className="pin-row__unpin"
        role="button"
        title="Unpin"
        onClick={(e) => {
          e.stopPropagation()
          onUnpin(pin.id)
        }}
      >
        <TrashIcon size={13} />
      </span>
    </button>
  )
}
