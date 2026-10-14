import { useEffect, useMemo, useState } from 'react'
import type {
  AlbumSort,
  PinnedItem,
  Playlist,
  LibraryFolder,
  MetadataPatch,
  ScanProgress,
  Track,
  UnsupportedFile
} from '@shared/types'
import { buildAlbums, buildArtists, buildFolders, sortAlbums, type Album } from '@renderer/lib/album'
import { AlbumGrid } from './AlbumGrid'
import {
  ChevronLeftIcon,
  CloudDownloadIcon,
  FolderIcon,
  ImageIcon,
  EditIcon,
  LyricsImportIcon,
  LyricsRemoveIcon,
  PlayIcon,
  PinIcon,
  PlaylistIcon,
  PlusIcon,
  QueueIcon,
  RefreshIcon,
  RemoveCircleIcon,
  SortIcon,
  TextFieldsIcon,
  TrashIcon
} from '@renderer/icons'
import { TrackList } from './TrackList'
import { ContextMenu, type MenuItem } from './ContextMenu'
import { MetadataDialog, type MetadataInitial } from './MetadataDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { ArtistView } from './ArtistView'
import { AlbumView } from './AlbumView'
import { LyricsDialog } from './LyricsDialog'
import { SongGrid } from './SongGrid'
import { ArtistGrid } from './ArtistGrid'
import { PlaylistGrid } from './PlaylistGrid'
import { PlaylistView } from './PlaylistView'
import { SearchBar } from './SearchBar'
import { GridIcon, ListIcon } from '@renderer/icons'
import { formatTotalDuration, folderName } from '@renderer/lib/format'
import type { BrowseSection } from './Sidebar'

const api = window.lagu

export interface MetadataActions {
  update: (trackIds: string[], patch: MetadataPatch) => void
  setCover: (trackIds: string[]) => void
  clear: (trackIds: string[]) => void
  fetchCover: (trackIds: string[]) => void
  remove: (trackIds: string[]) => void
  trash: (trackIds: string[]) => void
  importLyrics: (trackId: string) => void
  clearLyrics: (trackId: string) => void
  setLyricsOffset: (trackId: string, ms: number | null) => void
  pin: (item: Omit<PinnedItem, 'id'>) => void
  addToPlaylist: (trackIds: string[]) => void
  /** Global lyrics offset in ms, used as the default in the editor. */
  defaultLyricsOffset: number
  online: boolean
}

interface BrowseProps {
  section: BrowseSection
  tracks: Track[]
  byId: Map<string, Track>
  playlists: Playlist[]
  folders: LibraryFolder[]
  scanning: boolean
  progress: ScanProgress | null
  unsupported: UnsupportedFile[]
  currentTrackId: string | null
  playing: boolean
  onToggle: () => void
  onPlayContext: (tracks: Track[], index: number) => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  onFindCover?: (track: Track) => void
  onAddFolder: () => void
  onRescan: () => void
  onRemoveFolder: (id: string) => void
  onCreatePlaylist: () => void
  onRenamePlaylist: (id: string, name: string) => void
  onDeletePlaylist: (id: string) => void
  onRemoveFromPlaylist: (id: string, trackId: string) => void
  meta: MetadataActions
  albumSort: AlbumSort
  albumSortDesc: boolean
  onSortChange: (sort: AlbumSort, desc: boolean) => void
  /** External navigation request (e.g. from a sidebar pin). */
  focus?: { kind: 'album' | 'artist' | 'playlist'; ref: string; token: number } | null
}

interface EditState {
  scope: 'track' | 'album' | 'artist'
  ids: string[]
  initial: MetadataInitial
  count: number
}

export function Browse({
  section,
  tracks,
  byId,
  playlists,
  folders,
  scanning,
  progress,
  unsupported,
  currentTrackId,
  playing,
  onToggle,
  onPlayContext,
  onPlayNext,
  onAddToQueue,
  onFindCover,
  onAddFolder,
  onRescan,
  onRemoveFolder,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onRemoveFromPlaylist,
  meta,
  albumSort,
  albumSortDesc,
  onSortChange,
  focus
}: BrowseProps) {
  const [albumKey, setAlbumKey] = useState<string | null>(null)
  const [artist, setArtist] = useState<string | null>(null)
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null)
  const [lrcEdit, setLrcEdit] = useState<Track | null>(null)
  const [libQuery, setLibQuery] = useState('')
  const [libView, setLibView] = useState<'grid' | 'list'>('grid')
  const [bios, setBios] = useState<Record<string, string>>({})

  useEffect(() => {
    setAlbumKey(null)
    setArtist(null)
    setFolderPath(null)
    setPlaylistId(null)
    setLibQuery('')
  }, [section])

  // Load every artist bio so the Artists grid can show them under each name.
  useEffect(() => {
    if (section !== 'artists') return
    let cancelled = false
    void api.artists.getBios().then((value) => {
      if (!cancelled) setBios(value)
    })
    return () => {
      cancelled = true
    }
  }, [section])

  // Open an album/artist/playlist requested from outside (sidebar pin, etc.).
  useEffect(() => {
    if (!focus) return
    if (focus.kind === 'album') {
      setAlbumKey(focus.ref)
      setArtist(null)
      setFolderPath(null)
      setPlaylistId(null)
    } else if (focus.kind === 'playlist') {
      setPlaylistId(focus.ref)
      setAlbumKey(null)
      setArtist(null)
      setFolderPath(null)
    } else {
      setArtist(focus.ref)
      setAlbumKey(null)
      setFolderPath(null)
      setPlaylistId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.token])

  const albums = useMemo(() => buildAlbums(tracks), [tracks])
  const sortedAlbums = useMemo(
    () => sortAlbums(albums, albumSort, albumSortDesc),
    [albums, albumSort, albumSortDesc]
  )
  const artists = useMemo(() => buildArtists(tracks), [tracks])
  const folderGroups = useMemo(() => buildFolders(tracks), [tracks])

  const libNeedle = libQuery.trim().toLowerCase()
  const libraryTracks = useMemo(() => {
    if (!libNeedle) return tracks
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(libNeedle) ||
        t.artist.toLowerCase().includes(libNeedle) ||
        t.album.toLowerCase().includes(libNeedle)
    )
  }, [tracks, libNeedle])

  const artistTracksFor = (name: string): Track[] =>
    tracks.filter((t) => (t.albumArtist || t.artist) === name)

  const selectedAlbum = albumKey ? albums.find((a) => a.key === albumKey) ?? null : null
  const artistTracks = artist ? tracks.filter((t) => (t.albumArtist || t.artist) === artist) : []
  const folderTracks = folderPath ? tracks.filter((t) => (t.folder || '(streams)') === folderPath) : []
  const selectedPlaylist = playlistId ? playlists.find((p) => p.id === playlistId) ?? null : null
  const playlistTracks = selectedPlaylist
    ? selectedPlaylist.trackIds.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t))
    : []

  const showBack = Boolean(selectedAlbum || artist || folderPath || selectedPlaylist)
  const back = (): void => {
    setAlbumKey(null)
    setArtist(null)
    setFolderPath(null)
    setPlaylistId(null)
  }

  // --- context menus --------------------------------------------------------
  const removalItems = (ids: string[]): MenuItem[] => [
    {
      label: 'Remove from library',
      icon: <RemoveCircleIcon size={15} />,
      separatorBefore: true,
      onClick: () => meta.remove(ids)
    },
    {
      label: 'Delete files…',
      icon: <TrashIcon size={15} />,
      danger: true,
      onClick: () => setConfirm({ ids })
    }
  ]

  const openAlbumMenu = (album: Album, x: number, y: number): void => {
    const ids = album.tracks.map((t) => t.id)
    const items: MenuItem[] = [
      { label: 'Play album', icon: <PlayIcon size={15} />, onClick: () => onPlayContext(album.tracks, 0) },
      {
        label: 'Edit album…',
        icon: <TextFieldsIcon size={15} />,
        onClick: () =>
          setEdit({
            scope: 'album',
            ids,
            initial: { album: album.name, albumArtist: album.artist, year: album.year },
            count: album.tracks.length
          })
      },
      { label: 'Set cover…', icon: <ImageIcon size={15} />, onClick: () => meta.setCover(ids) }
    ]
    if (meta.online) {
      items.push({
        label: 'Find cover online',
        icon: <CloudDownloadIcon size={15} />,
        separatorBefore: true,
        onClick: () => meta.fetchCover(ids)
      })
    }
    items.push(
      {
        label: 'Pin to sidebar',
        icon: <PinIcon size={15} />,
        separatorBefore: true,
        onClick: () => meta.pin({ kind: 'album', ref: album.key, label: album.name, subtitle: album.artist })
      },
      {
        label: 'Add to playlist…',
        icon: <PlaylistIcon size={15} />,
        onClick: () => meta.addToPlaylist(ids)
      },
      ...removalItems(ids)
    )
    setMenu({ x, y, items })
  }

  const openTrackMenu = (track: Track, x: number, y: number): void => {
    const items: MenuItem[] = [
      { label: 'Play', icon: <PlayIcon size={15} />, onClick: () => onPlayContext([track], 0) },
      { label: 'Play next', icon: <PlusIcon size={15} />, onClick: () => onPlayNext(track) },
      { label: 'Add to queue', icon: <QueueIcon size={15} />, onClick: () => onAddToQueue(track) },
      {
        label: 'Edit track…',
        icon: <TextFieldsIcon size={15} />,
        separatorBefore: true,
        onClick: () =>
          setEdit({
            scope: 'track',
            ids: [track.id],
            initial: {
              title: track.title,
              artist: track.artist,
              album: track.album,
              albumArtist: track.albumArtist,
              year: track.year,
              trackNo: track.trackNo
            },
            count: 1
          })
      },
      { label: 'Set cover…', icon: <ImageIcon size={15} />, onClick: () => meta.setCover([track.id]) }
    ]
    if (meta.online) {
      items.push({
        label: 'Find cover online',
        icon: <CloudDownloadIcon size={15} />,
        onClick: () => meta.fetchCover([track.id])
      })
    }
    items.push(
      {
        label: 'Import .lrc',
        icon: <LyricsImportIcon size={15} />,
        separatorBefore: true,
        onClick: () => meta.importLyrics(track.id)
      },
      {
        label: 'Remove .lrc',
        icon: <LyricsRemoveIcon size={15} />,
        onClick: () => meta.clearLyrics(track.id)
      },
      {
        label: 'Edit .lrc',
        icon: <EditIcon size={15} />,
        onClick: () => setLrcEdit(track)
      },
      {
        label: 'Pin to sidebar',
        icon: <PinIcon size={15} />,
        onClick: () => meta.pin({ kind: 'track', ref: track.id, label: track.title, subtitle: track.artist })
      }
    )
    items.push({
      label: 'Add to playlist…',
      icon: <PlaylistIcon size={15} />,
      separatorBefore: true,
      onClick: () => meta.addToPlaylist([track.id])
    })
    items.push(...removalItems([track.id]))
    setMenu({ x, y, items })
  }

  const openArtistMenu = (name: string, ids: string[], x: number, y: number): void => {
    const items: MenuItem[] = [
      {
        label: 'Play artist',
        icon: <PlayIcon size={15} />,
        onClick: () => {
          const list = tracks.filter((t) => (t.albumArtist || t.artist) === name)
          if (list.length > 0) onPlayContext(list, 0)
        }
      },
      {
        label: 'Rename artist…',
        icon: <TextFieldsIcon size={15} />,
        onClick: () =>
          setEdit({ scope: 'artist', ids, initial: { artist: name }, count: ids.length })
      },
      {
        label: 'Pin to sidebar',
        icon: <PinIcon size={15} />,
        onClick: () =>
          meta.pin({
            kind: 'artist',
            ref: name,
            label: name,
            subtitle: `${ids.length} track${ids.length === 1 ? '' : 's'}`
          })
      }
    ]
    items.push({
      label: 'Add to playlist…',
      icon: <PlaylistIcon size={15} />,
      onClick: () => meta.addToPlaylist(ids)
    })
    items.push(...removalItems(ids))
    setMenu({ x, y, items })
  }

  const openPlaylistMenu = (playlist: Playlist, x: number, y: number): void => {
    const items: MenuItem[] = [
      { label: 'Open playlist', icon: <PlaylistIcon size={15} />, onClick: () => setPlaylistId(playlist.id) },
      {
        label: 'Pin to sidebar',
        icon: <PinIcon size={15} />,
        separatorBefore: true,
        onClick: () =>
          meta.pin({
            kind: 'playlist',
            ref: playlist.id,
            label: playlist.name,
            subtitle: `${playlist.trackIds.length} track${playlist.trackIds.length === 1 ? '' : 's'}`
          })
      },
      {
        label: 'Delete playlist',
        icon: <TrashIcon size={15} />,
        danger: true,
        separatorBefore: true,
        onClick: () => onDeletePlaylist(playlist.id)
      }
    ]
    setMenu({ x, y, items })
  }

  const openPlaylistTrackMenu = (track: Track, x: number, y: number): void => {
    if (!selectedPlaylist) return
    const pid = selectedPlaylist.id
    setMenu({
      x,
      y,
      items: [
        { label: 'Play', icon: <PlayIcon size={15} />, onClick: () => onPlayContext([track], 0) },
        { label: 'Play next', icon: <PlusIcon size={15} />, onClick: () => onPlayNext(track) },
        { label: 'Add to queue', icon: <QueueIcon size={15} />, onClick: () => onAddToQueue(track) },
        {
          label: 'Remove from playlist',
          icon: <RemoveCircleIcon size={15} />,
          separatorBefore: true,
          onClick: () => onRemoveFromPlaylist(pid, track.id)
        }
      ]
    })
  }

  const openSortMenu = (x: number, y: number): void => {
    const options: { id: AlbumSort; label: string }[] = [
      { id: 'artist', label: 'Artist' },
      { id: 'name', label: 'Album name' },
      { id: 'year', label: 'Year' },
      { id: 'added', label: 'Recently added' },
      { id: 'tracks', label: 'Track count' }
    ]
    const items: MenuItem[] = options.map((option) => ({
      label: `${option.id === albumSort ? '● ' : ''}${option.label}`,
      onClick: () => onSortChange(option.id, albumSortDesc)
    }))
    items.push({
      label: albumSortDesc ? '↓ Descending' : '↑ Ascending',
      separatorBefore: true,
      onClick: () => onSortChange(albumSort, !albumSortDesc)
    })
    setMenu({ x, y, items })
  }

  const title = selectedAlbum
    ? selectedAlbum.name
    : artist
      ? artist
      : selectedPlaylist
        ? selectedPlaylist.name
        : folderPath
          ? folderName(folderPath)
          : LABELS[section]

  let body
  if (selectedAlbum) {
    body = (
      <AlbumView
        album={selectedAlbum}
        playing={playing}
        currentTrackId={currentTrackId}
        onPlayContext={onPlayContext}
        onToggle={onToggle}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        onFindCover={onFindCover}
        onContextMenu={openTrackMenu}
        onOpenArtist={(name) => {
          setAlbumKey(null)
          setArtist(name)
        }}
      />
    )
  } else if (artist) {
    body = (
      <ArtistView
        name={artist}
        tracks={artistTracks}
        playing={playing}
        currentTrackId={currentTrackId}
        onPlayContext={onPlayContext}
        onToggle={onToggle}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        onFindCover={onFindCover}
        onContextMenu={openTrackMenu}
        onAlbumContextMenu={openAlbumMenu}
        onOpenAlbum={(album) => {
          setArtist(null)
          setAlbumKey(album.key)
        }}
      />
    )
  } else if (selectedPlaylist) {
    body = (
      <PlaylistView
        playlist={selectedPlaylist}
        tracks={playlistTracks}
        playing={playing}
        currentTrackId={currentTrackId}
        onPlayContext={onPlayContext}
        onToggle={onToggle}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        onFindCover={onFindCover}
        onTrackContextMenu={openPlaylistTrackMenu}
        onRename={(name) => onRenamePlaylist(selectedPlaylist.id, name)}
        onDelete={() => onDeletePlaylist(selectedPlaylist.id)}
      />
    )
  } else if (folderPath) {
    body = (
      <TrackList
        tracks={folderTracks}
        currentTrackId={currentTrackId}
        onPlay={(i) => onPlayContext(folderTracks, i)}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        onFindCover={onFindCover}
        onContextMenu={openTrackMenu}
      />
    )
  } else if (section === 'library') {
    body = (
      <div className="song-browser">
        <div className="song-browser__toolbar">
          <SearchBar
            value={libQuery}
            placeholder="Search songs, artists, albums…"
            compact
            onChange={setLibQuery}
            onSubmit={() => undefined}
            onClear={() => setLibQuery('')}
          />
          <div className="segmented segmented--icons">
            <button
              type="button"
              className={libView === 'grid' ? 'button--active' : ''}
              title="Grid view"
              onClick={() => setLibView('grid')}
            >
              <GridIcon size={15} />
            </button>
            <button
              type="button"
              className={libView === 'list' ? 'button--active' : ''}
              title="List view"
              onClick={() => setLibView('list')}
            >
              <ListIcon size={15} />
            </button>
          </div>
        </div>
        <div className="song-browser__body">
          {libView === 'grid' ? (
            <SongGrid
              tracks={libraryTracks}
              currentTrackId={currentTrackId}
              onPlay={(i) => onPlayContext(libraryTracks, i)}
              onPlayNext={onPlayNext}
              onAddToQueue={onAddToQueue}
              onContextMenu={openTrackMenu}
              emptyMessage={
                libNeedle
                  ? 'No matching songs.'
                  : 'Your library is empty. Add a folder to get started.'
              }
            />
          ) : (
            <TrackList
              tracks={libraryTracks}
              currentTrackId={currentTrackId}
              onPlay={(i) => onPlayContext(libraryTracks, i)}
              onPlayNext={onPlayNext}
              onAddToQueue={onAddToQueue}
              onFindCover={onFindCover}
              onContextMenu={openTrackMenu}
              emptyMessage={
                libNeedle
                  ? 'No matching songs.'
                  : 'Your library is empty. Add a folder to get started.'
              }
            />
          )}
        </div>
      </div>
    )
  } else if (section === 'albums') {
    body = (
      <AlbumGrid
        albums={sortedAlbums}
        onOpen={(a) => setAlbumKey(a.key)}
        onPlay={(a) => onPlayContext(a.tracks, 0)}
        onContextMenu={openAlbumMenu}
      />
    )
  } else if (section === 'artists') {
    body = (
      <ArtistGrid
        artists={artists}
        tracks={tracks}
        bios={bios}
        currentTrackId={currentTrackId}
        playing={playing}
        onOpen={(name) => setArtist(name)}
        onPlay={(name) => {
          const list = artistTracksFor(name)
          if (list.length > 0) onPlayContext(list, 0)
        }}
        onToggle={onToggle}
        onContextMenu={(name, x, y) =>
          openArtistMenu(
            name,
            artistTracksFor(name).map((t) => t.id),
            x,
            y
          )
        }
      />
    )
  } else if (section === 'playlists') {
    body = (
      <PlaylistGrid
        playlists={playlists}
        byId={byId}
        onOpen={(id) => setPlaylistId(id)}
        onCreate={onCreatePlaylist}
        onContextMenu={openPlaylistMenu}
      />
    )
  } else {
    body = (
      <div className="folder-list">
        {folders.length === 0 && (
          <div className="empty-state">
            No folders in your library.
            <button type="button" className="ghost-btn" onClick={onAddFolder}>
              <PlusIcon size={14} /> Add folder
            </button>
          </div>
        )}
        {folders.map((folder) => {
          const group = folderGroups.find((g) => g.path === folder.path)
          return (
            <div key={folder.id} className="folder-row">
              <button type="button" className="folder-row__main" onClick={() => setFolderPath(folder.path)}>
                <span className="folder-row__icon">
                  <FolderIcon size={16} />
                </span>
                <span className="folder-row__text">
                  <span className="folder-row__name">{folderName(folder.path)}</span>
                  <span className="folder-row__path">{folder.path}</span>
                </span>
              </button>
              <span className="folder-row__meta">
                {group?.trackCount ?? 0} tracks · {formatTotalDuration(group?.duration ?? 0)}
              </span>
              <div className="folder-row__actions">
                <button type="button" className="icon-btn" title="Rescan this folder" onClick={() => onRescan()}>
                  <RefreshIcon size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  title="Remove folder"
                  onClick={() => onRemoveFolder(folder.id)}
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            </div>
          )
        })}
        {folders.length > 0 && (
          <button type="button" className="ghost-btn folder-add" onClick={onAddFolder}>
            <PlusIcon size={14} /> Add folder
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="browse">
      <header className="browse__header">
        {showBack && (
          <button type="button" className="icon-btn" title="Back" onClick={back}>
            <ChevronLeftIcon size={16} />
          </button>
        )}
        <h2 className="browse__title">{title}</h2>
        <div className="browse__actions">
          {scanning && progress && (
            <span className="scan-pill">
              Scanning… {progress.scanned}/{progress.total}
            </span>
          )}
          {!scanning && tracks.length > 0 && (
            <span className="browse__count">{tracks.length} tracks</span>
          )}
          {unsupported.length > 0 && (
            <span className="notice-pill" title={unsupported.map((u) => u.path).join('\n')}>
              {unsupported.length} unsupported file{unsupported.length === 1 ? '' : 's'} skipped
            </span>
          )}
          {section === 'albums' && !selectedAlbum && (
            <button
              type="button"
              className="ghost-btn"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                openSortMenu(rect.left, rect.bottom + 4)
              }}
            >
              <SortIcon size={14} /> Sort
            </button>
          )}
        </div>
      </header>
      <div className="browse__body">{body}</div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}

      {edit && (
        <MetadataDialog
          scope={edit.scope}
          initial={edit.initial}
          trackCount={edit.count}
          onSave={(patch) => meta.update(edit.ids, patch)}
          onClear={() => meta.clear(edit.ids)}
          onSetCover={() => {
            meta.setCover(edit.ids)
            setEdit(null)
          }}
          onClose={() => setEdit(null)}
        />
      )}

      {lrcEdit && (
        <LyricsDialog
          trackId={lrcEdit.id}
          trackOffset={lrcEdit.lyricsOffset ?? null}
          defaultOffset={meta.defaultLyricsOffset}
          onImport={() => meta.importLyrics(lrcEdit.id)}
          onClear={() => meta.clearLyrics(lrcEdit.id)}
          onSetOffset={(ms) => meta.setLyricsOffset(lrcEdit.id, ms)}
          onClose={() => setLrcEdit(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete files?"
          confirmLabel="Move to trash"
          danger
          message={
            <>
              Move {confirm.ids.length} file{confirm.ids.length === 1 ? '' : 's'} to the system
              trash? They will be removed from your library, and the files can be restored from your
              trash.
            </>
          }
          onConfirm={() => meta.trash(confirm.ids)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

const LABELS: Record<BrowseSection, string> = {
  library: 'Library',
  albums: 'Albums',
  artists: 'Artists',
  playlists: 'Playlists',
  folders: 'Folders'
}
