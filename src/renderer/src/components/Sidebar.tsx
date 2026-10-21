import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { LibraryFolder, PinnedItem, Playlist, Track } from '@shared/types'
import {
  AlbumIcon,
  ArtistIcon,
  ChevronDownIcon,
  CloseIcon,
  CloudDownloadIcon,
  CreateFolderIcon,
  DiscIcon,
  FolderIcon,
  GraphicEqIcon,
  LibraryIcon,
  LinkIcon,
  PlaylistIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  TrashIcon
} from '@renderer/icons'
import { AlbumArt } from './AlbumArt'
import { ContextMenu } from './ContextMenu'
import { NavList, type NavEntry } from './NavList'
import { buildAlbums, buildArtists, findAlbum, type Album } from '@renderer/lib/album'
import appIconUrl from '@renderer/icons/app_icon.png'
import { folderName } from '@renderer/lib/format'
import { useArtistImage } from '@renderer/state/useArtistImage'

export type BrowseSection = 'library' | 'albums' | 'artists' | 'playlists' | 'folders'
export type SidebarSelection = 'now' | BrowseSection | 'search' | 'settings'

/** A clickable result from the global search. */
export interface SearchTarget {
  kind: 'track' | 'album' | 'artist' | 'playlist'
  ref: string
}

interface SidebarProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  width: number
  onResize: (width: number) => void
  onResizeEnd: (width: number) => void
  folders: LibraryFolder[]
  scanning: boolean
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onSearchSelect: (target: SearchTarget) => void
  pinned: PinnedItem[]
  tracks: Track[]
  playlists: Playlist[]
  onActivatePin: (pin: PinnedItem) => void
  onUnpin: (id: string) => void
  onAddFolder: () => void
  onRescan: () => void
  onRemoveFolder: (id: string) => void
  onAddUrl: () => void
  onDownloadMusic: () => void
  onSearchYouTube: (query: string) => void
}

const NAV: NavEntry<BrowseSection>[] = [
  { id: 'library', label: 'Library', icon: LibraryIcon },
  { id: 'albums', label: 'Albums', icon: AlbumIcon },
  { id: 'artists', label: 'Artists', icon: ArtistIcon },
  { id: 'playlists', label: 'Playlists', icon: PlaylistIcon }
]

export function Sidebar({
  selection,
  onSelect,
  width,
  onResize,
  onResizeEnd,
  folders,
  scanning,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSearchSelect,
  pinned,
  tracks,
  playlists,
  onActivatePin,
  onUnpin,
  onAddFolder,
  onRescan,
  onRemoveFolder,
  onAddUrl,
  onDownloadMusic,
  onSearchYouTube
}: SidebarProps) {
  const startX = useRef(0)
  const startWidth = useRef(width)
  const [foldersOpen, setFoldersOpen] = useState(true)
  const [folderMenu, setFolderMenu] = useState<{ x: number; y: number } | null>(null)
  const albums = useMemo(
    () => (pinned.some((p) => p.kind === 'album') ? buildAlbums(tracks) : []),
    [pinned, tracks]
  )

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
    <aside className={`sidebar ${width < 180 ? 'sidebar--slim' : ''}`} style={{ width }}>
      <div
        className="sidebar__resizer"
        title="Drag to resize"
        onPointerDown={beginResize}
        role="separator"
        aria-orientation="vertical"
      />

      <div className="sidebar__brand">
        <img className="sidebar__brand-icon" src={appIconUrl} alt="Lagu" draggable={false} />
        <button
          type="button"
          className={`brand-now ${selection === 'now' ? 'brand-now--active' : ''}`}
          onClick={() => onSelect('now')}
        >
          <GraphicEqIcon size={16} />
          <span className="brand-now__label">Now Playing</span>
        </button>
      </div>

      {pinned.length > 0 && (
        <>
          <div className="sidebar__label">Pinned</div>
          <div className="sidebar__pins">
            {pinned.map((pin) => (
              <PinRow
                key={pin.id}
                pin={pin}
                tracks={tracks}
                albums={albums}
                playlists={playlists}
                onActivate={onActivatePin}
                onUnpin={onUnpin}
              />
            ))}
          </div>
        </>
      )}

      <div className="sidebar__label">Library</div>
      <NavList
        className="sidebar__nav"
        items={NAV}
        active={NAV.some((n) => n.id === selection) ? (selection as BrowseSection) : null}
        onSelect={onSelect}
      />

      <div className="sidebar__label sidebar__label--row">
        <button
          type="button"
          className="sidebar__section-toggle"
          onClick={() => setFoldersOpen((v) => !v)}
          aria-expanded={foldersOpen}
        >
          <ChevronDownIcon
            size={14}
            className={`sidebar__caret ${foldersOpen ? '' : 'sidebar__caret--closed'}`}
          />
          <span className="sidebar__section-toggle-label">Folders</span>
        </button>
      </div>

      {foldersOpen && (
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
      )}

      <div className="sidebar__footer">
        <SidebarSearch
          value={searchValue}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          tracks={tracks}
          playlists={playlists}
          onSelect={onSearchSelect}
          onSearchYouTube={onSearchYouTube}
        />
        <div className="footer-tools">
          <button
            type="button"
            className={`icon-btn ${selection === 'settings' ? 'icon-btn--active' : ''}`}
            title="Settings"
            onClick={() => onSelect('settings')}
          >
            <SettingsIcon size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${selection === 'folders' ? 'icon-btn--active' : ''}`}
            title="Folders"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setFolderMenu({ x: rect.left, y: rect.bottom + 4 })
            }}
          >
            <FolderIcon size={16} />
          </button>
          <button type="button" className="icon-btn" title="Add stream URL" onClick={onAddUrl}>
            <LinkIcon size={16} />
          </button>
          <button type="button" className="icon-btn" title="Download music" onClick={onDownloadMusic}>
            <CloudDownloadIcon size={16} />
          </button>
        </div>
      </div>

      {folderMenu && (
        <ContextMenu
          x={folderMenu.x}
          y={folderMenu.y}
          onClose={() => setFolderMenu(null)}
          items={[
            {
              label: 'Go to Folders',
              icon: <FolderIcon size={15} />,
              onClick: () => onSelect('folders')
            },
            {
              label: 'Add folder…',
              icon: <CreateFolderIcon size={15} />,
              onClick: onAddFolder
            },
            {
              label: 'Rescan library',
              icon: <RefreshIcon size={15} />,
              disabled: scanning || folders.length === 0,
              onClick: onRescan
            }
          ]}
        />
      )}
    </aside>
  )
}

function ArtistThumb({ name, artTrackId }: { name: string; artTrackId: string | null }) {
  const image = useArtistImage(name)
  if (image) {
    return (
      <img
        className="searchdrop__thumb searchdrop__thumb--round art"
        src={image}
        alt=""
        draggable={false}
      />
    )
  }
  if (artTrackId) {
    return (
      <AlbumArt
        trackId={artTrackId}
        className="searchdrop__thumb searchdrop__thumb--round"
        iconSize={14}
      />
    )
  }
  return (
    <div className="searchdrop__thumb searchdrop__thumb--round art--fallback">
      <ArtistIcon size={14} />
    </div>
  )
}

function SidebarSearch({
  value,
  onChange,
  onSubmit,
  tracks,
  playlists,
  onSelect,
  onSearchYouTube
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  tracks: Track[]
  playlists: Playlist[]
  onSelect: (target: SearchTarget) => void
  onSearchYouTube: (query: string) => void
}) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const needle = value.trim().toLowerCase()
  const albums = useMemo(() => buildAlbums(tracks), [tracks])
  const artists = useMemo(() => buildArtists(tracks), [tracks])

  const foundArtists = useMemo(
    () => (needle ? artists.filter((a) => a.name.toLowerCase().includes(needle)).slice(0, 4) : []),
    [artists, needle]
  )
  const foundAlbums = useMemo(
    () =>
      needle
        ? albums
            .filter(
              (a) => a.name.toLowerCase().includes(needle) || a.artist.toLowerCase().includes(needle)
            )
            .slice(0, 4)
        : [],
    [albums, needle]
  )
  const foundTracks = useMemo(
    () =>
      needle
        ? tracks
            .filter(
              (t) =>
                t.title.toLowerCase().includes(needle) ||
                t.artist.toLowerCase().includes(needle) ||
                t.album.toLowerCase().includes(needle)
            )
            .slice(0, 6)
        : [],
    [tracks, needle]
  )
  const foundPlaylists = useMemo(
    () => (needle ? playlists.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 4) : []),
    [playlists, needle]
  )
  const total = foundArtists.length + foundAlbums.length + foundTracks.length + foundPlaylists.length

  const pick = (target: SearchTarget): void => {
    onSelect(target)
    onChange('')
    setOpen(false)
  }

  const artTrackOf = (name: string): string | null =>
    tracks.find((t) => (t.albumArtist || t.artist) === name && t.hasArtwork)?.id ??
    tracks.find((t) => (t.albumArtist || t.artist) === name)?.id ??
    null

  const close = (): void => {
    setOpen(false)
    if (value) {
      onChange('')
      onSubmit()
    }
  }

  const toggle = (): void => {
    if (open) {
      inputRef.current?.focus()
      return
    }
    setOpen(true)
  }

  return (
    <>
      <div className={`searchbox ${open ? 'searchbox--open' : ''}`}>
        <button
          type="button"
          className="searchbox__btn"
          title="Search"
          aria-label="Search"
          onClick={toggle}
        >
          <SearchIcon size={16} />
        </button>
        <input
          ref={inputRef}
          className="searchbox__input"
          type="text"
          value={value}
          placeholder="Search songs, albums, artists…"
          spellCheck={false}
          tabIndex={open ? 0 : -1}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (!value) setOpen(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
            if (e.key === 'Escape') close()
          }}
        />
        {value && (
          <button
            type="button"
            className="searchbox__clear"
            title="Clear"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
          >
            <CloseIcon size={13} />
          </button>
        )}
      </div>

      {open && needle && (
        <div className="searchdrop" role="listbox" aria-label="Search results">
          {total === 0 && <div className="searchdrop__empty">No matches for “{value.trim()}”.</div>}

          {foundPlaylists.length > 0 && <div className="searchdrop__label">Playlists</div>}
          {foundPlaylists.map((p) => (
            <button
              key={`p-${p.id}`}
              type="button"
              className="searchdrop__row"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick({ kind: 'playlist', ref: p.id })}
            >
              <span className="searchdrop__thumb art--fallback">
                <PlaylistIcon size={14} />
              </span>
              <span className="searchdrop__main">
                <span className="searchdrop__title">{p.name}</span>
                <span className="searchdrop__sub">
                  Playlist · {p.trackIds.length} track{p.trackIds.length === 1 ? '' : 's'}
                </span>
              </span>
            </button>
          ))}

          {foundArtists.length > 0 && <div className="searchdrop__label">Artists</div>}
          {foundArtists.map((a) => (
            <button
              key={`a-${a.name}`}
              type="button"
              className="searchdrop__row"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick({ kind: 'artist', ref: a.name })}
            >
              <ArtistThumb name={a.name} artTrackId={artTrackOf(a.name)} />
              <span className="searchdrop__main">
                <span className="searchdrop__title">{a.name}</span>
                <span className="searchdrop__sub">
                  Artist · {a.trackCount} track{a.trackCount === 1 ? '' : 's'}
                </span>
              </span>
            </button>
          ))}

          {foundAlbums.length > 0 && <div className="searchdrop__label">Albums</div>}
          {foundAlbums.map((al) => (
            <button
              key={`al-${al.key}`}
              type="button"
              className="searchdrop__row"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick({ kind: 'album', ref: al.key })}
            >
              <AlbumArt
                trackId={(al.tracks.find((t) => t.hasArtwork) ?? al.tracks[0])?.id}
                className="searchdrop__thumb"
                iconSize={14}
              />
              <span className="searchdrop__main">
                <span className="searchdrop__title">{al.name}</span>
                <span className="searchdrop__sub">{al.artist}</span>
              </span>
            </button>
          ))}

          {foundTracks.length > 0 && <div className="searchdrop__label">Songs</div>}
          {foundTracks.map((t) => (
            <button
              key={`t-${t.id}`}
              type="button"
              className="searchdrop__row"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick({ kind: 'track', ref: t.id })}
            >
              <AlbumArt trackId={t.id} className="searchdrop__thumb" iconSize={14} />
              <span className="searchdrop__main">
                <span className="searchdrop__title">{t.title}</span>
                <span className="searchdrop__sub">{t.artist}</span>
              </span>
            </button>
          ))}

          <div className="searchdrop__label">YouTube</div>
          <button
            type="button"
            className="searchdrop__row"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onSearchYouTube(value.trim())
              onChange('')
              setOpen(false)
            }}
          >
            <span className="searchdrop__thumb art--fallback">
              <CloudDownloadIcon size={14} />
            </span>
            <span className="searchdrop__main">
              <span className="searchdrop__title">Search YouTube for “{value.trim()}”</span>
              <span className="searchdrop__sub">Find it and download it to your library</span>
            </span>
          </button>
        </div>
      )}
    </>
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
  const round = kind === 'artist' ? ' pin-thumb--round' : ''
  if (kind === 'artist' && artistImage) {
    return <img className={`pin-thumb art${round}`} src={artistImage} alt="" draggable={false} />
  }
  if (artTrackId) return <AlbumArt trackId={artTrackId} className={`pin-thumb${round}`} iconSize={14} />
  return (
    <div className={`pin-thumb art--fallback${round}`}>
      {kind === 'artist' ? <ArtistIcon size={14} /> : <DiscIcon size={14} />}
    </div>
  )
}

function PinRow({
  pin,
  tracks,
  albums,
  playlists,
  onActivate,
  onUnpin
}: {
  pin: PinnedItem
  tracks: Track[]
  albums: Album[]
  playlists: Playlist[]
  onActivate: (pin: PinnedItem) => void
  onUnpin: (id: string) => void
}) {
  let artTrackId: string | null = null
  let artistName: string | null = null

  if (pin.kind === 'track') {
    artTrackId = tracks.find((t) => t.id === pin.ref)?.id ?? null
  } else if (pin.kind === 'album') {
    const list = findAlbum(albums, pin.ref)?.tracks ?? []
    artTrackId = (list.find((t) => t.hasArtwork) ?? list[0])?.id ?? null
  } else if (pin.kind === 'playlist') {
    const playlist = playlists.find((p) => p.id === pin.ref)
    const list = playlist ? tracks.filter((t) => playlist.trackIds.includes(t.id)) : []
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
