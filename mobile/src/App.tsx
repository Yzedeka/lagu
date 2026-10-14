import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from 'react'
import appIcon from '@/assets/app_icon.png'
import {
  ChevronLeftIcon,
  CheckIcon,
  CloseIcon,
  DiscIcon,
  EditIcon,
  ImageIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PlaylistIcon,
  PlusIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  RepeatOneIcon,
  SearchIcon,
  SettingsIcon,
  ShuffleIcon,
  TrashIcon
} from '@/icons'
import { formatTime, trackFromFile, type MobileTrack } from '@/lib/tracks'
import {
  artworkTrack,
  buildAlbums,
  buildArtists,
  formatTotalDuration,
  type MobileAlbum,
  type MobileArtist
} from '@/lib/library'
import { getArtistBios, setArtistBio } from '@/lib/bios'
import {
  getPlaylists,
  getSettings,
  newPlaylistId,
  savePlaylists,
  saveSettings,
  type MobilePlaylist,
  type MobileSettings
} from '@/lib/playlists'

type View = 'songs' | 'albums' | 'artists' | 'playlists'
type Repeat = 'off' | 'all' | 'one'

const TABS: { id: View; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'playlists', label: 'Playlists' }
]

interface MenuItem {
  label: string
  icon?: ReactNode
  danger?: boolean
  onClick: () => void
}

interface MenuState {
  title: string
  items: MenuItem[]
}

/* --- Player --------------------------------------------------------------- */

function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [queue, setQueue] = useState<MobileTrack[]>([])
  const [index, setIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<Repeat>('off')

  const current = index >= 0 ? queue[index] ?? null : null

  const next = useCallback(() => {
    setIndex((i) => {
      if (queue.length === 0) return i
      if (shuffle) return Math.floor(Math.random() * queue.length)
      if (i + 1 < queue.length) return i + 1
      if (repeat === 'all') return 0
      return i
    })
  }, [queue.length, shuffle, repeat])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    setIndex((i) => (i - 1 >= 0 ? i - 1 : repeat === 'all' ? queue.length - 1 : i))
  }, [repeat, queue.length])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [current])

  const playContext = useCallback((list: MobileTrack[], startIndex: number) => {
    if (list.length === 0) return
    setQueue(list)
    setIndex(startIndex)
  }, [])

  const playNext = useCallback(
    (track: MobileTrack) => {
      setQueue((q) => {
        if (q.length === 0) {
          setIndex(0)
          return [track]
        }
        const at = index + 1
        return [...q.slice(0, at), track, ...q.slice(at)]
      })
    },
    [index]
  )

  const addToQueue = useCallback((track: MobileTrack) => {
    setQueue((q) => {
      if (q.length === 0) setIndex(0)
      return [...q, track]
    })
  }, [])

  const removeFromQueue = useCallback((at: number) => {
    setQueue((q) => q.filter((_, i) => i !== at))
    setIndex((i) => (at < i ? i - 1 : i))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
    setIndex(-1)
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = seconds
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (audio.src !== current.url) {
      audio.src = current.url
      audio.load()
    }
    void audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    )
    setCurrentTime(0)
    setDuration(current.duration ?? 0)
  }, [current])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.album,
        artwork: current.artwork ? [{ src: current.artwork }] : []
      })
      navigator.mediaSession.setActionHandler('play', () => void audioRef.current?.play())
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause())
      navigator.mediaSession.setActionHandler('nexttrack', () => next())
      navigator.mediaSession.setActionHandler('previoustrack', () => prev())
    } catch {
      /* media session unsupported */
    }
  })

  const onEnded = useCallback(() => {
    if (repeat === 'one') {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        void audio.play()
      }
      return
    }
    next()
  }, [repeat, next])

  return {
    audioRef,
    queue,
    index,
    current,
    playing,
    currentTime,
    duration,
    shuffle,
    repeat,
    setPlaying,
    setCurrentTime,
    setDuration,
    setShuffle,
    setRepeat,
    toggle,
    next,
    prev,
    onEnded,
    playContext,
    playNext,
    addToQueue,
    removeFromQueue,
    clearQueue,
    seek
  }
}

type Player = ReturnType<typeof useAudioPlayer>

/* --- App ------------------------------------------------------------------ */

export function App() {
  const player = useAudioPlayer()
  const { audioRef, current } = player

  const [tracks, setTracks] = useState<MobileTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>('songs')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openAlbum, setOpenAlbum] = useState<string | null>(null)
  const [openArtist, setOpenArtist] = useState<string | null>(null)
  const [openPlaylist, setOpenPlaylist] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [edit, setEdit] = useState<{ scope: 'track' | 'album' | 'artist'; ids: string[] } | null>(null)
  const [addToPl, setAddToPl] = useState<{ trackIds: string[] } | null>(null)
  const [playlists, setPlaylists] = useState<MobilePlaylist[]>(() => getPlaylists())
  const [bios, setBios] = useState<Record<string, string>>(() => getArtistBios())
  const [settings, setSettings] = useState<MobileSettings>(() => getSettings())

  const persistPlaylists = useCallback((next: MobilePlaylist[]) => {
    setPlaylists(next)
    savePlaylists(next)
  }, [])

  const updateSettings = useCallback((patch: Partial<MobileSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const albums = useMemo(() => buildAlbums(tracks), [tracks])
  const artists = useMemo(() => buildArtists(tracks), [tracks])

  const needle = query.trim().toLowerCase()
  const songResults = useMemo(() => {
    if (!needle) return tracks
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.artist.toLowerCase().includes(needle) ||
        t.album.toLowerCase().includes(needle)
    )
  }, [tracks, needle])
  const albumResults = useMemo(() => {
    if (!needle) return albums
    return albums.filter(
      (a) => a.name.toLowerCase().includes(needle) || a.artist.toLowerCase().includes(needle)
    )
  }, [albums, needle])
  const artistResults = useMemo(() => {
    if (!needle) return artists
    return artists.filter((a) => a.name.toLowerCase().includes(needle))
  }, [artists, needle])
  const playlistResults = useMemo(() => {
    if (!needle) return playlists
    return playlists.filter((p) => p.name.toLowerCase().includes(needle))
  }, [playlists, needle])

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setLoading(true)
    const parsed = await Promise.all(Array.from(files).map(trackFromFile))
    setTracks((prev) => [...prev, ...parsed])
    setLoading(false)
  }, [])

  const openTab = (next: View): void => {
    setView(next)
    setOpenAlbum(null)
    setOpenArtist(null)
    setOpenPlaylist(null)
    setQuery('')
  }

  const applyEdit = (
    scope: 'track' | 'album' | 'artist',
    ids: string[],
    patch: Partial<MobileTrack>
  ): void => {
    const set = new Set(ids)
    setTracks((prev) => prev.map((t) => (set.has(t.id) ? { ...t, ...patch } : t)))
    if (scope === 'artist' && patch.artist) {
      const next = { ...bios }
      delete next[Object.keys(bios).find((k) => k === patch.artist) ?? '']
      setBios(next)
    }
  }

  const renameArtist = (from: string, to: string): void => {
    if (!to.trim() || to === from) return
    setTracks((prev) =>
      prev.map((t) =>
        (t.albumArtist || t.artist) === from
          ? {
              ...t,
              artist: t.artist === from ? to : t.artist,
              albumArtist: t.albumArtist === from ? to : t.albumArtist
            }
          : t
      )
    )
    if (bios[from]) {
      const next = { ...bios, [to]: bios[from] }
      delete next[from]
      setBios(next)
      setArtistBio(to, bios[from])
      setArtistBio(from, '')
    }
  }

  const setCover = (ids: string[], file: File): void => {
    const url = URL.createObjectURL(file)
    const set = new Set(ids)
    setTracks((prev) => prev.map((t) => (set.has(t.id) ? { ...t, artwork: url } : t)))
  }

  const pickCover = (ids: string[]): void => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) setCover(ids, file)
    }
    input.click()
  }

  const removeTracks = (ids: string[]): void => {
    const set = new Set(ids)
    setTracks((prev) => prev.filter((t) => !set.has(t.id)))
  }

  const songMenu = (track: MobileTrack, context?: MobileTrack[]): void => {
    const list = context ?? tracks
    const at = list.findIndex((t) => t.id === track.id)
    setMenu({
      title: track.title,
      items: [
        { label: 'Play', icon: <PlayIcon size={18} />, onClick: () => player.playContext(list, at) },
        { label: 'Play next', icon: <NextIcon size={18} />, onClick: () => player.playNext(track) },
        { label: 'Add to queue', icon: <QueueIcon size={18} />, onClick: () => player.addToQueue(track) },
        {
          label: 'Add to playlist',
          icon: <PlaylistIcon size={18} />,
          onClick: () => setAddToPl({ trackIds: [track.id] })
        },
        { label: 'Edit info', icon: <EditIcon size={18} />, onClick: () => setEdit({ scope: 'track', ids: [track.id] }) },
        { label: 'Set cover', icon: <ImageIcon size={18} />, onClick: () => pickCover([track.id]) },
        {
          label: 'Remove from library',
          icon: <TrashIcon size={18} />,
          danger: true,
          onClick: () => removeTracks([track.id])
        }
      ]
    })
  }

  const albumMenu = (album: MobileAlbum): void => {
    const ids = album.tracks.map((t) => t.id)
    setMenu({
      title: album.name,
      items: [
        { label: 'Play album', icon: <PlayIcon size={18} />, onClick: () => player.playContext(album.tracks, 0) },
        {
          label: 'Add to playlist',
          icon: <PlaylistIcon size={18} />,
          onClick: () => setAddToPl({ trackIds: ids })
        },
        { label: 'Edit album', icon: <EditIcon size={18} />, onClick: () => setEdit({ scope: 'album', ids }) },
        { label: 'Set cover', icon: <ImageIcon size={18} />, onClick: () => pickCover(ids) }
      ]
    })
  }

  const playlistMenu = (playlist: MobilePlaylist): void => {
    setMenu({
      title: playlist.name,
      items: [
        { label: 'Open', icon: <PlaylistIcon size={18} />, onClick: () => setOpenPlaylist(playlist.id) },
        {
          label: 'Set cover',
          icon: <ImageIcon size={18} />,
          onClick: () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = () => {
              const file = input.files?.[0]
              if (!file) return
              const url = URL.createObjectURL(file)
              persistPlaylists(playlists.map((p) => (p.id === playlist.id ? { ...p, cover: url } : p)))
            }
            input.click()
          }
        },
        {
          label: 'Delete',
          icon: <TrashIcon size={18} />,
          danger: true,
          onClick: () => persistPlaylists(playlists.filter((p) => p.id !== playlist.id))
        }
      ]
    })
  }

  const createPlaylist = (name: string, trackIds: string[] = []): MobilePlaylist => {
    const playlist: MobilePlaylist = { id: newPlaylistId(), name: name.trim() || 'New Playlist', trackIds }
    persistPlaylists([...playlists, playlist])
    return playlist
  }

  const addToPlaylist = (playlistId: string, trackIds: string[]): void => {
    persistPlaylists(
      playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: [...p.trackIds, ...trackIds.filter((t) => !p.trackIds.includes(t))] }
          : p
      )
    )
  }

  const album = openAlbum ? albums.find((a) => a.key === openAlbum) ?? null : null
  const artist = openArtist ? artists.find((a) => a.name === openArtist) ?? null : null
  const playlist = openPlaylist ? playlists.find((p) => p.id === openPlaylist) ?? null : null
  const playlistTracks = playlist
    ? playlist.trackIds.map((id) => tracks.find((t) => t.id === id)).filter((t): t is MobileTrack => Boolean(t))
    : []
  const editingAlbum = openAlbum ? new Map(tracks.map((t) => [t.id, t])) : new Map<string, MobileTrack>()

  return (
    <div className={`app ${settings.covers3d ? 'app--3d' : ''}`}>
      <audio
        ref={audioRef}
        onPlay={() => player.setPlaying(true)}
        onPause={() => player.setPlaying(false)}
        onTimeUpdate={(e) => player.setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => player.setDuration(e.currentTarget.duration)}
        onEnded={player.onEnded}
      />

      <header className="topbar">
        <img className="topbar__icon" src={appIcon} alt="Lagu" />
        <nav className="tabs">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={view === id && !openAlbum && !openArtist && !openPlaylist ? 'tab tab--active' : 'tab'}
              onClick={() => openTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className={`icobtn ${searchOpen ? 'icobtn--active' : ''}`}
          title="Search"
          onClick={() => {
            setSearchOpen((v) => !v)
            setQuery('')
          }}
        >
          <SearchIcon size={19} />
        </button>
        <label className="icobtn" title="Add music">
          <PlusIcon size={19} />
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => {
              void addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
        <button type="button" className="icobtn" title="Settings" onClick={() => setSettingsOpen(true)}>
          <SettingsIcon size={19} />
        </button>
      </header>

      {searchOpen && (
        <div className="searchrow">
          <SearchIcon size={16} />
          <input
            className="searchrow__input"
            type="text"
            value={query}
            placeholder="Search songs, albums, artists, playlists…"
            spellCheck={false}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="searchrow__clear" onClick={() => setQuery('')}>
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      )}

      <main className="content">
        {playlist ? (
          <PlaylistDetail
            playlist={playlist}
            tracks={playlistTracks}
            player={player}
            onBack={() => setOpenPlaylist(null)}
            onRename={(name) => persistPlaylists(playlists.map((p) => (p.id === playlist.id ? { ...p, name } : p)))}
            onDelete={() => {
              persistPlaylists(playlists.filter((p) => p.id !== playlist.id))
              setOpenPlaylist(null)
            }}
            onTrackMenu={(t) =>
              setMenu({
                title: t.title,
                items: [
                  {
                    label: 'Play',
                    icon: <PlayIcon size={18} />,
                    onClick: () => player.playContext(playlistTracks, playlistTracks.findIndex((x) => x.id === t.id))
                  },
                  { label: 'Play next', icon: <NextIcon size={18} />, onClick: () => player.playNext(t) },
                  { label: 'Add to queue', icon: <QueueIcon size={18} />, onClick: () => player.addToQueue(t) },
                  {
                    label: 'Remove from playlist',
                    icon: <TrashIcon size={18} />,
                    danger: true,
                    onClick: () =>
                      persistPlaylists(
                        playlists.map((p) =>
                          p.id === playlist.id ? { ...p, trackIds: p.trackIds.filter((x) => x !== t.id) } : p
                        )
                      )
                  }
                ]
              })
            }
          />
        ) : album ? (
          <AlbumDetail
            album={album}
            player={player}
            onBack={() => setOpenAlbum(null)}
            onOpenArtist={(name) => {
              setOpenAlbum(null)
              setOpenArtist(name)
            }}
            onEdit={() => setEdit({ scope: 'album', ids: album.tracks.map((t) => t.id) })}
            onMenu={(t) => songMenu(t, album.tracks)}
          />
        ) : artist ? (
          <ArtistDetail
            artist={artist}
            player={player}
            bio={bios[artist.name] ?? ''}
            onBack={() => setOpenArtist(null)}
            onSaveBio={(text) => {
              const value = setArtistBio(artist.name, text)
              setBios((prev) => ({ ...prev, [artist.name]: value }))
            }}
            onRename={(name) => renameArtist(artist.name, name)}
            onOpenAlbum={(key) => {
              setOpenArtist(null)
              setOpenAlbum(key)
            }}
            onMenu={(t) => songMenu(t, artist.albums.flatMap((a) => a.tracks))}
            covers3d={settings.covers3d}
          />
        ) : view === 'songs' ? (
          <SongsView
            tracks={songResults}
            player={player}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onMenu={songMenu}
            emptyMessage={needle ? 'No matching songs.' : 'Your library is empty. Tap + to add music.'}
          />
        ) : view === 'albums' ? (
          <AlbumsGrid
            albums={albumResults}
            onOpen={(key) => setOpenAlbum(key)}
            onMenu={albumMenu}
            covers3d={settings.covers3d}
            emptyMessage={needle ? 'No matching albums.' : 'No albums yet.'}
          />
        ) : view === 'artists' ? (
          <ArtistsGrid
            artists={artistResults}
            bios={bios}
            onOpen={(name) => setOpenArtist(name)}
            emptyMessage={needle ? 'No matching artists.' : 'No artists yet.'}
          />
        ) : (
          <PlaylistsGrid
            playlists={playlistResults}
            tracks={tracks}
            onOpen={(id) => setOpenPlaylist(id)}
            onCreate={() => createPlaylist(`Playlist ${playlists.length + 1}`)}
            onMenu={playlistMenu}
            emptyMessage={needle ? 'No matching playlists.' : 'No playlists yet.'}
          />
        )}

        {loading && <div className="loading">Reading files…</div>}
        {tracks.length === 0 && !loading && (
          <div className="empty">
            <img className="empty__icon" src={appIcon} alt="" />
            <div className="empty__title">No music yet</div>
            <div className="empty__text">Tap + and pick some audio files from your phone.</div>
          </div>
        )}
      </main>

      {current && !expanded && <MiniPlayer player={player} onExpand={() => setExpanded(true)} />}

      {current && expanded && (
        <NowPlaying
          player={player}
          discMode={settings.discMode}
          onClose={() => setExpanded(false)}
          onOpenQueue={() => setQueueOpen(true)}
          onOpenArtist={(name) => {
            setExpanded(false)
            setView('artists')
            setOpenArtist(name)
          }}
        />
      )}

      {queueOpen && <QueueSheet player={player} onClose={() => setQueueOpen(false)} onJump={() => setExpanded(true)} />}

      {menu && <ActionSheet menu={menu} onClose={() => setMenu(null)} />}

      {addToPl && (
        <AddToPlaylistSheet
          playlists={playlists}
          onAdd={(id) => {
            addToPlaylist(id, addToPl.trackIds)
            setAddToPl(null)
          }}
          onCreate={(name) => {
            createPlaylist(name, addToPl.trackIds)
            setAddToPl(null)
          }}
          onClose={() => setAddToPl(null)}
        />
      )}

      {edit && (
        <EditDialog
          scope={edit.scope}
          ids={edit.ids}
          byId={edit.scope === 'album' ? editingAlbum : new Map(tracks.map((t) => [t.id, t]))}
          onSave={(patch) => {
            applyEdit(edit.scope, edit.ids, patch)
            setEdit(null)
          }}
          onClose={() => setEdit(null)}
        />
      )}

      {settingsOpen && (
        <SettingsSheet
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

/* --- Shared --------------------------------------------------------------- */

function Cover({
  track,
  className,
  iconSize
}: {
  track?: MobileTrack
  className: string
  iconSize: number
}) {
  if (track?.artwork) return <img className={className} src={track.artwork} alt="" />
  return (
    <div className={`${className} cover--fallback`}>
      <DiscIcon size={iconSize} />
    </div>
  )
}

function AlbumCover3d({ track, className, iconSize }: { track?: MobileTrack; className: string; iconSize: number }) {
  return (
    <div className={`cover3d ${className}`}>
      <div className="cover3d__disc">
        <Cover track={track} className="cover3d__label" iconSize={iconSize} />
      </div>
      <Cover track={track} className="cover3d__sleeve" iconSize={iconSize} />
    </div>
  )
}

function longPressProps(onLongPress: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const start = (): void => {
    timer = setTimeout(onLongPress, 450)
  }
  const cancel = (): void => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: ReactMouseEvent) => {
      e.preventDefault()
      onLongPress()
    }
  }
}

/* --- Songs ---------------------------------------------------------------- */

function SongsView({
  tracks,
  player,
  viewMode,
  setViewMode,
  onMenu,
  emptyMessage
}: {
  tracks: MobileTrack[]
  player: Player
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  onMenu: (t: MobileTrack, context: MobileTrack[]) => void
  emptyMessage: string
}) {
  if (tracks.length === 0) return <div className="empty-state">{emptyMessage}</div>
  return (
    <div className="songs">
      <div className="subbar">
        <span className="subbar__count">
          {tracks.length} song{tracks.length === 1 ? '' : 's'}
        </span>
        <div className="segmented">
          <button type="button" className={viewMode === 'grid' ? 'button--active' : ''} onClick={() => setViewMode('grid')}>
            Grid
          </button>
          <button type="button" className={viewMode === 'list' ? 'button--active' : ''} onClick={() => setViewMode('list')}>
            List
          </button>
        </div>
      </div>
      {viewMode === 'grid' ? (
        <div className="song-grid">
          {tracks.map((track, i) => (
            <button
              key={`${track.id}:${i}`}
              type="button"
              className={`song-tile ${track.id === player.current?.id ? 'song-tile--playing' : ''}`}
              onClick={() => player.playContext(tracks, i)}
              {...longPressProps(() => onMenu(track, tracks))}
            >
              <Cover track={track} className="song-tile__art" iconSize={26} />
              <span className="song-tile__title">{track.title}</span>
              <span className="song-tile__sub">{track.artist}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rows">
          {tracks.map((track, i) => (
            <TrackRow
              key={`${track.id}:${i}`}
              track={track}
              active={track.id === player.current?.id}
              onClick={() => player.playContext(tracks, i)}
              onMenu={() => onMenu(track, tracks)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TrackRow({
  track,
  active,
  onClick,
  onMenu
}: {
  track: MobileTrack
  active: boolean
  onClick: () => void
  onMenu: () => void
}) {
  return (
    <div className={`row ${active ? 'row--active' : ''}`} role="button" tabIndex={0} onClick={onClick} {...longPressProps(onMenu)}>
      <span className="row__art">
        <Cover track={track} className="row__artimg" iconSize={16} />
      </span>
      <span className="row__text">
        <span className="row__title">{track.title}</span>
        <span className="row__sub">{track.artist}</span>
      </span>
      <span className="row__dur">{formatTime(track.duration)}</span>
      <button
        type="button"
        className="row__more"
        title="More"
        onClick={(e) => {
          e.stopPropagation()
          onMenu()
        }}
      >
        ⋯
      </button>
    </div>
  )
}

/* --- Albums --------------------------------------------------------------- */

function AlbumsGrid({
  albums,
  onOpen,
  onMenu,
  covers3d,
  emptyMessage
}: {
  albums: MobileAlbum[]
  onOpen: (key: string) => void
  onMenu: (album: MobileAlbum) => void
  covers3d: boolean
  emptyMessage: string
}) {
  if (albums.length === 0) return <div className="empty-state">{emptyMessage}</div>
  return (
    <div className="album-grid">
      {albums.map((album) => (
        <button
          key={album.key}
          type="button"
          className="album-tile"
          onClick={() => onOpen(album.key)}
          {...longPressProps(() => onMenu(album))}
        >
          {covers3d ? (
            <AlbumCover3d track={artworkTrack(album.tracks)} className="album-tile__art3d" iconSize={30} />
          ) : (
            <Cover track={artworkTrack(album.tracks)} className="album-tile__art" iconSize={30} />
          )}
          <span className="album-tile__name">{album.name}</span>
          <span className="album-tile__sub">{album.artist}</span>
        </button>
      ))}
    </div>
  )
}

function AlbumDetail({
  album,
  player,
  onBack,
  onOpenArtist,
  onEdit,
  onMenu
}: {
  album: MobileAlbum
  player: Player
  onBack: () => void
  onOpenArtist: (name: string) => void
  onEdit: () => void
  onMenu: (t: MobileTrack) => void
}) {
  return (
    <div className="detail">
      <div className="detail__bar">
        <button type="button" className="icobtn" title="Back" onClick={onBack}>
          <ChevronLeftIcon size={20} />
        </button>
        <button type="button" className="icobtn" title="Edit album" onClick={onEdit}>
          <EditIcon size={18} />
        </button>
      </div>
      <div className="detail__hero">
        <Cover track={artworkTrack(album.tracks)} className="detail__art" iconSize={64} />
        <div className="detail__kind">Album</div>
        <div className="detail__title">{album.name}</div>
        <button type="button" className="detail__sub detail__artist" onClick={() => onOpenArtist(album.artist)}>
          {album.artist}
        </button>
        <div className="detail__meta">
          {album.year ? `${album.year} · ` : ''}
          {album.tracks.length} track{album.tracks.length === 1 ? '' : 's'} · {formatTotalDuration(album.duration)}
        </div>
        <button type="button" className="play-btn" onClick={() => player.playContext(album.tracks, 0)} title="Play album">
          <PlayIcon size={22} />
        </button>
      </div>
      <div className="rows">
        {album.tracks.map((track, i) => (
          <TrackRow
            key={`${track.id}:${i}`}
            track={track}
            active={track.id === player.current?.id}
            onClick={() => player.playContext(album.tracks, i)}
            onMenu={() => onMenu(track)}
          />
        ))}
      </div>
    </div>
  )
}

/* --- Artists -------------------------------------------------------------- */

function ArtistsGrid({
  artists,
  bios,
  onOpen,
  emptyMessage
}: {
  artists: MobileArtist[]
  bios: Record<string, string>
  onOpen: (name: string) => void
  emptyMessage: string
}) {
  if (artists.length === 0) return <div className="empty-state">{emptyMessage}</div>
  return (
    <div className="artist-grid">
      {artists.map((artist) => {
        const tracks = artist.albums.flatMap((a) => a.tracks)
        const bio = bios[artist.name]
        return (
          <button key={artist.name} type="button" className="artist-card" onClick={() => onOpen(artist.name)}>
            <span className="artist-card__art">
              <Cover track={artworkTrack(tracks)} className="artist-card__img" iconSize={34} />
            </span>
            <span className="artist-card__name">{artist.name}</span>
            <span className="artist-card__bio">
              {bio || <span className="artist-card__bio--empty">No bio yet</span>}
            </span>
            <span className="artist-card__meta">
              {artist.albums.length} album{artist.albums.length === 1 ? '' : 's'} · {artist.trackCount} track
              {artist.trackCount === 1 ? '' : 's'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ArtistDetail({
  artist,
  player,
  bio,
  onBack,
  onSaveBio,
  onRename,
  onOpenAlbum,
  onMenu,
  covers3d
}: {
  artist: MobileArtist
  player: Player
  bio: string
  onBack: () => void
  onSaveBio: (text: string) => void
  onRename: (name: string) => void
  onOpenAlbum: (key: string) => void
  onMenu: (t: MobileTrack) => void
  covers3d: boolean
}) {
  const tracks = useMemo(() => artist.albums.flatMap((a) => a.tracks), [artist])
  const total = tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0)
  const [draft, setDraft] = useState(bio)
  const [editing, setEditing] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(artist.name)

  useEffect(() => {
    setDraft(bio)
    setNameDraft(artist.name)
  }, [artist.name, bio])

  return (
    <div className="detail">
      <div className="detail__bar">
        <button type="button" className="icobtn" title="Back" onClick={onBack}>
          <ChevronLeftIcon size={20} />
        </button>
        <button type="button" className="icobtn" title="Rename artist" onClick={() => setRenaming((v) => !v)}>
          <EditIcon size={18} />
        </button>
      </div>
      <div className="detail__hero">
        <Cover track={artworkTrack(tracks)} className="detail__art detail__art--round" iconSize={64} />
        <div className="detail__kind">Artist</div>
        {renaming ? (
          <input
            className="textinput detail__name-input"
            value={nameDraft}
            autoFocus
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              onRename(nameDraft)
              setRenaming(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRename(nameDraft)
                setRenaming(false)
              }
            }}
          />
        ) : (
          <div className="detail__title">{artist.name}</div>
        )}
        <div className="detail__meta">
          {artist.albums.length} album{artist.albums.length === 1 ? '' : 's'} · {artist.trackCount} track
          {artist.trackCount === 1 ? '' : 's'} · {formatTotalDuration(total)}
        </div>

        {editing ? (
          <div className="bio-edit">
            <textarea
              className="textinput bio-edit__input"
              rows={3}
              value={draft}
              placeholder="Write a short bio for this artist…"
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="bio-edit__actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setDraft(bio)
                  setEditing(false)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  onSaveBio(draft)
                  setEditing(false)
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="bio">
            <span className="bio__text">{bio || <span className="bio__empty">No bio yet</span>}</span>
            <button type="button" className="icobtn icobtn--small" title="Edit bio" onClick={() => setEditing(true)}>
              <EditIcon size={15} />
            </button>
          </div>
        )}

        <button type="button" className="play-btn" onClick={() => player.playContext(tracks, 0)} title="Play artist">
          <PlayIcon size={22} />
        </button>
      </div>

      <div className="section-label">Albums</div>
      <div className="album-grid">
        {artist.albums.map((album) => (
          <button key={album.key} type="button" className="album-tile" onClick={() => onOpenAlbum(album.key)}>
            {covers3d ? (
              <AlbumCover3d track={artworkTrack(album.tracks)} className="album-tile__art3d" iconSize={30} />
            ) : (
              <Cover track={artworkTrack(album.tracks)} className="album-tile__art" iconSize={30} />
            )}
            <span className="album-tile__name">{album.name}</span>
          </button>
        ))}
      </div>

      <div className="section-label">All songs</div>
      <div className="rows">
        {tracks.map((track, i) => (
          <TrackRow
            key={`${track.id}:${i}`}
            track={track}
            active={track.id === player.current?.id}
            onClick={() => player.playContext(tracks, i)}
            onMenu={() => onMenu(track)}
          />
        ))}
      </div>
    </div>
  )
}

/* --- Playlists ------------------------------------------------------------ */

function PlaylistsGrid({
  playlists,
  tracks,
  onOpen,
  onCreate,
  onMenu,
  emptyMessage
}: {
  playlists: MobilePlaylist[]
  tracks: MobileTrack[]
  onOpen: (id: string) => void
  onCreate: () => void
  onMenu: (playlist: MobilePlaylist) => void
  emptyMessage: string
}) {
  return (
    <div>
      <div className="album-grid">
        <button type="button" className="album-tile playlist-new" onClick={onCreate}>
          <span className="playlist-new__icon">
            <PlusIcon size={26} />
          </span>
          <span className="album-tile__name">New playlist</span>
          <span className="album-tile__sub">Create a playlist</span>
        </button>
        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            type="button"
            className="album-tile"
            onClick={() => onOpen(playlist.id)}
            {...longPressProps(() => onMenu(playlist))}
          >
            <span className="album-tile__art">
              {playlist.cover ? (
                <img className="album-tile__artimg" src={playlist.cover} alt="" />
              ) : (
                <Cover track={playlist.trackIds.length ? tracks.find((t) => t.id === playlist.trackIds[0]) : undefined} className="album-tile__artimg" iconSize={30} />
              )}
            </span>
            <span className="album-tile__name">{playlist.name}</span>
            <span className="album-tile__sub">
              {playlist.trackIds.length} track{playlist.trackIds.length === 1 ? '' : 's'}
            </span>
          </button>
        ))}
      </div>
      {playlists.length === 0 && <div className="empty-state">{emptyMessage}</div>}
    </div>
  )
}

function PlaylistDetail({
  playlist,
  tracks,
  player,
  onBack,
  onRename,
  onDelete,
  onTrackMenu
}: {
  playlist: MobilePlaylist
  tracks: MobileTrack[]
  player: Player
  onBack: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onTrackMenu: (t: MobileTrack) => void
}) {
  const [draft, setDraft] = useState(playlist.name)
  useEffect(() => setDraft(playlist.name), [playlist.name])
  const total = tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0)

  return (
    <div className="detail">
      <div className="detail__bar">
        <button type="button" className="icobtn" title="Back" onClick={onBack}>
          <ChevronLeftIcon size={20} />
        </button>
        <button type="button" className="icobtn icobtn--danger" title="Delete playlist" onClick={onDelete}>
          <TrashIcon size={18} />
        </button>
      </div>
      <div className="detail__hero">
        {playlist.cover ? (
          <img className="detail__art" src={playlist.cover} alt="" />
        ) : (
          <Cover track={tracks[0]} className="detail__art" iconSize={64} />
        )}
        <div className="detail__kind">Playlist</div>
        <input
          className="textinput detail__name-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onRename(draft)}
        />
        <div className="detail__meta">
          {tracks.length} track{tracks.length === 1 ? '' : 's'}
          {tracks.length > 0 ? ` · ${formatTotalDuration(total)}` : ''}
        </div>
        <button type="button" className="play-btn" onClick={() => player.playContext(tracks, 0)} title="Play playlist">
          <PlayIcon size={22} />
        </button>
      </div>
      <div className="rows">
        {tracks.map((track, i) => (
          <TrackRow
            key={`${track.id}:${i}`}
            track={track}
            active={track.id === player.current?.id}
            onClick={() => player.playContext(tracks, i)}
            onMenu={() => onTrackMenu(track)}
          />
        ))}
      </div>
      {tracks.length === 0 && (
        <div className="empty-state">Empty. Long-press a song and choose “Add to playlist”.</div>
      )}
    </div>
  )
}

/* --- Player surfaces ------------------------------------------------------ */

function MiniPlayer({ player, onExpand }: { player: Player; onExpand: () => void }) {
  const track = player.current
  if (!track) return null
  const progress = player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0
  return (
    <div className="mini" role="button" tabIndex={0} onClick={onExpand}>
      <span className="mini__art">
        <Cover track={track} className="mini__artimg" iconSize={18} />
      </span>
      <span className="mini__text">
        <span className="mini__title">{track.title}</span>
        <span className="mini__sub">{track.artist}</span>
      </span>
      <button
        type="button"
        className="mini__btn"
        onClick={(e) => {
          e.stopPropagation()
          player.toggle()
        }}
      >
        {player.playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
      </button>
      <span className="mini__progress">
        <span style={{ width: `${progress}%` }} />
      </span>
    </div>
  )
}

function NowPlaying({
  player,
  discMode,
  onClose,
  onOpenQueue,
  onOpenArtist
}: {
  player: Player
  discMode: boolean
  onClose: () => void
  onOpenQueue: () => void
  onOpenArtist: (name: string) => void
}) {
  const track = player.current
  if (!track) return null
  return (
    <section className="np">
      <header className="np__head">
        <button type="button" className="icobtn" title="Close" onClick={onClose}>
          <CloseIcon size={22} />
        </button>
        <span className="np__kind">Now Playing</span>
        <button type="button" className="icobtn" title="Queue" onClick={onOpenQueue}>
          <QueueIcon size={20} />
        </button>
      </header>

      <div className="np__art">
        {discMode ? (
          <div className="np-disc">
            <Cover track={track} className="np-disc__label" iconSize={72} />
          </div>
        ) : (
          <Cover track={track} className="np__artimg" iconSize={96} />
        )}
      </div>

      <div className="np__meta">
        <div className="np__title">{track.title}</div>
        <button type="button" className="np__artist" onClick={() => onOpenArtist(track.albumArtist || track.artist)}>
          {track.artist}
        </button>
      </div>

      <div className="np__seek">
        <input
          type="range"
          min={0}
          max={player.duration || 0}
          value={player.currentTime}
          onChange={(e) => player.seek(Number(e.target.value))}
        />
        <div className="np__times">
          <span>{formatTime(player.currentTime)}</span>
          <span>{formatTime(player.duration)}</span>
        </div>
      </div>

      <div className="np__controls">
        <button
          type="button"
          className={`iconbtn ${player.shuffle ? 'iconbtn--active' : ''}`}
          title="Shuffle"
          onClick={() => player.setShuffle((v) => !v)}
        >
          <ShuffleIcon size={20} />
        </button>
        <button type="button" className="iconbtn" title="Previous" onClick={player.prev}>
          <PrevIcon size={30} />
        </button>
        <button type="button" className="np__play" onClick={player.toggle}>
          {player.playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
        </button>
        <button type="button" className="iconbtn" title="Next" onClick={() => player.next()}>
          <NextIcon size={30} />
        </button>
        <button
          type="button"
          className={`iconbtn ${player.repeat !== 'off' ? 'iconbtn--active' : ''}`}
          title="Repeat"
          onClick={() => player.setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))}
        >
          {player.repeat === 'one' ? <RepeatOneIcon size={20} /> : <RepeatIcon size={20} />}
        </button>
      </div>
    </section>
  )
}

function QueueSheet({
  player,
  onClose,
  onJump
}: {
  player: Player
  onClose: () => void
  onJump: () => void
}) {
  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <span className="sheet__title">Queue</span>
          <span className="sheet__meta">{formatTotalDuration(player.queue.reduce((s, t) => s + (t.duration ?? 0), 0))}</span>
          <button type="button" className="ghost-btn" onClick={player.clearQueue}>
            Clear
          </button>
          <button type="button" className="icobtn" title="Close" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="sheet__body">
          {player.queue.length === 0 && <div className="empty-state">Queue is empty.</div>}
          {player.queue.map((track, i) => (
            <div
              key={`${track.id}:${i}`}
              className={`row ${i === player.index ? 'row--active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                player.playContext(player.queue, i)
                onJump()
                onClose()
              }}
            >
              <span className="row__num">{i + 1}</span>
              <span className="row__text">
                <span className="row__title">{track.title}</span>
                <span className="row__sub">{track.artist}</span>
              </span>
              <button
                type="button"
                className="row__more"
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation()
                  player.removeFromQueue(i)
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* --- Sheets / dialogs ----------------------------------------------------- */

function ActionSheet({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <span className="sheet__title">{menu.title}</span>
          <button type="button" className="icobtn" title="Close" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="sheet__body">
          {menu.items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`sheet__action ${item.danger ? 'sheet__action--danger' : ''}`}
              onClick={() => {
                onClose()
                item.onClick()
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function AddToPlaylistSheet({
  playlists,
  onAdd,
  onCreate,
  onClose
}: {
  playlists: MobilePlaylist[]
  onAdd: (id: string) => void
  onCreate: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <span className="sheet__title">Add to playlist</span>
          <button type="button" className="icobtn" title="Close" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="sheet__body">
          {playlists.map((p) => (
            <button key={p.id} type="button" className="sheet__action" onClick={() => onAdd(p.id)}>
              <PlaylistIcon size={18} />
              <span>{p.name}</span>
              <span className="sheet__action-count">{p.trackIds.length}</span>
            </button>
          ))}
          <div className="sheet__new">
            <input
              className="textinput"
              value={name}
              placeholder="New playlist name"
              onChange={(e) => setName(e.target.value)}
            />
            <button type="button" className="primary-btn" disabled={!name.trim()} onClick={() => onCreate(name)}>
              <PlusIcon size={16} /> Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditDialog({
  scope,
  ids,
  byId,
  onSave,
  onClose
}: {
  scope: 'track' | 'album' | 'artist'
  ids: string[]
  byId: Map<string, MobileTrack>
  onSave: (patch: Partial<MobileTrack>) => void
  onClose: () => void
}) {
  const first = ids.length > 0 ? byId.get(ids[0]) : undefined
  const [title, setTitle] = useState(first?.title ?? '')
  const [artist, setArtist] = useState(first?.artist ?? '')
  const [album, setAlbum] = useState(first?.album ?? '')
  const [albumArtist, setAlbumArtist] = useState(first?.albumArtist ?? '')
  const [year, setYear] = useState(first?.year ? String(first.year) : '')

  const save = (): void => {
    const patch: Partial<MobileTrack> = {}
    if (scope === 'track') {
      if (title.trim()) patch.title = title.trim()
      if (artist.trim()) patch.artist = artist.trim()
    }
    if (scope !== 'artist') {
      if (album.trim()) patch.album = album.trim()
      if (albumArtist.trim()) patch.albumArtist = albumArtist.trim()
      const y = Number(year)
      if (year.trim() && Number.isFinite(y)) patch.year = y
    }
    if (scope === 'artist' && artist.trim()) patch.artist = artist.trim()
    onSave(patch)
  }

  const label = scope === 'track' ? 'Edit track' : scope === 'album' ? 'Edit album' : 'Rename artist'

  return (
    <div className="sheet sheet--center" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <span className="sheet__title">{label}</span>
          <button type="button" className="icobtn" title="Close" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="dialog__body">
          {scope === 'track' && (
            <label className="field">
              <span>Title</span>
              <input className="textinput" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
          )}
          <label className="field">
            <span>{scope === 'artist' ? 'Artist' : 'Artist'}</span>
            <input className="textinput" value={artist} onChange={(e) => setArtist(e.target.value)} />
          </label>
          {scope !== 'artist' && (
            <>
              <label className="field">
                <span>Album</span>
                <input className="textinput" value={album} onChange={(e) => setAlbum(e.target.value)} />
              </label>
              <label className="field">
                <span>Album artist</span>
                <input className="textinput" value={albumArtist} onChange={(e) => setAlbumArtist(e.target.value)} />
              </label>
              <label className="field">
                <span>Year</span>
                <input
                  className="textinput"
                  inputMode="numeric"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        <div className="dialog__actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={save}>
            <CheckIcon size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingsSheet({
  settings,
  onChange,
  onClose
}: {
  settings: MobileSettings
  onChange: (patch: Partial<MobileSettings>) => void
  onClose: () => void
}) {
  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <span className="sheet__title">Settings</span>
          <button type="button" className="icobtn" title="Close" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="sheet__body">
          <div className="setting-row">
            <span>Now Playing disc mode</span>
            <button
              type="button"
              className={`switchpad ${settings.discMode ? 'switchpad--on' : ''}`}
              onClick={() => onChange({ discMode: !settings.discMode })}
            />
          </div>
          <div className="setting-row">
            <span>3D album covers</span>
            <button
              type="button"
              className={`switchpad ${settings.covers3d ? 'switchpad--on' : ''}`}
              onClick={() => onChange({ covers3d: !settings.covers3d })}
            />
          </div>
          <p className="settings__about">
            Lagu — a minimalist local music player. Plays your files offline; your music never leaves
            your device.
          </p>
        </div>
      </div>
    </div>
  )
}
