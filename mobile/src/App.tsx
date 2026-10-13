import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import appIcon from '@/assets/app_icon.png'
import {
  AlbumIcon,
  ArtistIcon,
  ChevronLeftIcon,
  CloseIcon,
  DiscIcon,
  EditIcon,
  LibraryMusicIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  RepeatOneIcon,
  SearchIcon,
  ShuffleIcon
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

type View = 'songs' | 'albums' | 'artists'
type Repeat = 'off' | 'all' | 'one'

const TABS: { id: View; label: string; icon: typeof AlbumIcon }[] = [
  { id: 'songs', label: 'Songs', icon: LibraryMusicIcon },
  { id: 'albums', label: 'Albums', icon: AlbumIcon },
  { id: 'artists', label: 'Artists', icon: ArtistIcon }
]

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
    setIndex((i) => {
      if (at < i) return i - 1
      if (at === i) return Math.min(i, at)
      return i
    })
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
    setIndex(-1)
  }, [])

  const jumpTo = useCallback((at: number) => setIndex(at), [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = seconds
  }, [])

  // Load the current track into the <audio> element.
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

  // Media session (lock screen / notification controls).
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return
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
    jumpTo,
    seek
  }
}

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
  const [openAlbum, setOpenAlbum] = useState<string | null>(null)
  const [openArtist, setOpenArtist] = useState<string | null>(null)

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
    setQuery('')
  }

  const album = openAlbum ? albums.find((a) => a.key === openAlbum) ?? null : null
  const artist = openArtist ? artists.find((a) => a.name === openArtist) ?? null : null

  return (
    <div className="app">
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
              className={view === id && !openAlbum && !openArtist ? 'tab tab--active' : 'tab'}
              onClick={() => openTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
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
      </header>

      {searchOpen && (
        <div className="searchrow">
          <SearchIcon size={16} />
          <input
            className="searchrow__input"
            type="text"
            value={query}
            placeholder={view === 'songs' ? 'Search songs…' : view === 'albums' ? 'Search albums…' : 'Search artists…'}
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
        {album ? (
          <AlbumDetail
            album={album}
            player={player}
            onBack={() => setOpenAlbum(null)}
            onOpenArtist={(name) => {
              setOpenAlbum(null)
              setOpenArtist(name)
            }}
          />
        ) : artist ? (
          <ArtistDetail
            artist={artist}
            player={player}
            onBack={() => setOpenArtist(null)}
            onOpenAlbum={(key) => {
              setOpenArtist(null)
              setOpenAlbum(key)
            }}
          />
        ) : view === 'songs' ? (
          <SongsView
            tracks={songResults}
            player={player}
            viewMode={viewMode}
            setViewMode={setViewMode}
            emptyMessage={
              needle ? 'No matching songs.' : 'Your library is empty. Add music to get started.'
            }
          />
        ) : view === 'albums' ? (
          <AlbumsGrid
            albums={albumResults}
            onOpen={(key) => setOpenAlbum(key)}
            emptyMessage={needle ? 'No matching albums.' : 'No albums yet.'}
          />
        ) : (
          <ArtistsGrid
            artists={artistResults}
            onOpen={(name) => setOpenArtist(name)}
            emptyMessage={needle ? 'No matching artists.' : 'No artists yet.'}
          />
        )}
        {loading && <div className="loading">Reading files…</div>}
        {tracks.length === 0 && !loading && !openAlbum && !openArtist && (
          <div className="empty">
            <img className="empty__icon" src={appIcon} alt="" />
            <div className="empty__title">No music yet</div>
            <div className="empty__text">Tap “Add music” and pick some audio files from your phone.</div>
          </div>
        )}
      </main>

      {current && !expanded && (
        <MiniPlayer player={player} onExpand={() => setExpanded(true)} />
      )}

      {current && expanded && (
        <NowPlaying
          player={player}
          onClose={() => setExpanded(false)}
          onOpenQueue={() => setQueueOpen(true)}
        />
      )}

      {queueOpen && (
        <QueueSheet
          player={player}
          onClose={() => setQueueOpen(false)}
          onJump={(i) => {
            player.jumpTo(i)
            setQueueOpen(false)
            setExpanded(true)
          }}
        />
      )}
    </div>
  )
}

type Player = ReturnType<typeof useAudioPlayer>

/* --- Shared bits ---------------------------------------------------------- */

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

/* --- Songs ---------------------------------------------------------------- */

function SongsView({
  tracks,
  player,
  viewMode,
  setViewMode,
  emptyMessage
}: {
  tracks: MobileTrack[]
  player: Player
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
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
          <button
            type="button"
            className={viewMode === 'grid' ? 'button--active' : ''}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'button--active' : ''}
            onClick={() => setViewMode('list')}
          >
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
              onAdd={() => player.addToQueue(track)}
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
  onAdd
}: {
  track: MobileTrack
  active: boolean
  onClick: () => void
  onAdd: () => void
}) {
  return (
    <div className={`row ${active ? 'row--active' : ''}`} role="button" tabIndex={0} onClick={onClick}>
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
        className="row__add"
        title="Add to queue"
        onClick={(e) => {
          e.stopPropagation()
          onAdd()
        }}
      >
        <PlusIcon size={17} />
      </button>
    </div>
  )
}

/* --- Albums --------------------------------------------------------------- */

function AlbumsGrid({
  albums,
  onOpen,
  emptyMessage
}: {
  albums: MobileAlbum[]
  onOpen: (key: string) => void
  emptyMessage: string
}) {
  if (albums.length === 0) return <div className="empty-state">{emptyMessage}</div>
  return (
    <div className="album-grid">
      {albums.map((album) => (
        <button key={album.key} type="button" className="album-tile" onClick={() => onOpen(album.key)}>
          <Cover track={artworkTrack(album.tracks)} className="album-tile__art" iconSize={30} />
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
  onOpenArtist
}: {
  album: MobileAlbum
  player: Player
  onBack: () => void
  onOpenArtist: (name: string) => void
}) {
  return (
    <div className="detail">
      <div className="detail__bar">
        <button type="button" className="icobtn" title="Back" onClick={onBack}>
          <ChevronLeftIcon size={20} />
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
          {album.tracks.length} track{album.tracks.length === 1 ? '' : 's'} ·{' '}
          {formatTotalDuration(album.duration)}
        </div>
        <button
          type="button"
          className="play-btn"
          onClick={() => player.playContext(album.tracks, 0)}
          title="Play album"
        >
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
            onAdd={() => player.addToQueue(track)}
          />
        ))}
      </div>
    </div>
  )
}

/* --- Artists -------------------------------------------------------------- */

function ArtistsGrid({
  artists,
  onOpen,
  emptyMessage
}: {
  artists: MobileArtist[]
  onOpen: (name: string) => void
  emptyMessage: string
}) {
  const [bios] = useState(() => getArtistBios())
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
              {artist.albums.length} album{artist.albums.length === 1 ? '' : 's'} · {artist.trackCount}{' '}
              track{artist.trackCount === 1 ? '' : 's'}
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
  onBack,
  onOpenAlbum
}: {
  artist: MobileArtist
  player: Player
  onBack: () => void
  onOpenAlbum: (key: string) => void
}) {
  const tracks = useMemo(() => artist.albums.flatMap((a) => a.tracks), [artist])
  const total = tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0)
  const [bio, setBio] = useState(() => getArtistBios()[artist.name] ?? '')
  const [draft, setDraft] = useState(bio)
  const [editing, setEditing] = useState(false)

  const save = (): void => {
    setBio(setArtistBio(artist.name, draft))
    setEditing(false)
  }

  return (
    <div className="detail">
      <div className="detail__bar">
        <button type="button" className="icobtn" title="Back" onClick={onBack}>
          <ChevronLeftIcon size={20} />
        </button>
      </div>
      <div className="detail__hero">
        <Cover track={artworkTrack(tracks)} className="detail__art detail__art--round" iconSize={64} />
        <div className="detail__kind">Artist</div>
        <div className="detail__title">{artist.name}</div>
        <div className="detail__meta">
          {artist.albums.length} album{artist.albums.length === 1 ? '' : 's'} · {artist.trackCount}{' '}
          track{artist.trackCount === 1 ? '' : 's'} · {formatTotalDuration(total)}
        </div>

        {editing ? (
          <div className="bio-edit">
            <textarea
              className="bio-edit__input"
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
              <button type="button" className="primary-btn" onClick={save}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="bio">
            <span className="bio__text">
              {bio || <span className="bio__empty">No bio yet</span>}
            </span>
            <button
              type="button"
              className="icobtn icobtn--small"
              title="Edit bio"
              onClick={() => {
                setDraft(bio)
                setEditing(true)
              }}
            >
              <EditIcon size={15} />
            </button>
          </div>
        )}

        <button
          type="button"
          className="play-btn"
          onClick={() => player.playContext(tracks, 0)}
          title="Play artist"
        >
          <PlayIcon size={22} />
        </button>
      </div>

      <div className="section-label">Albums</div>
      <AlbumGrid
        albums={artist.albums}
        player={player}
        onOpen={(key) => onOpenAlbum(key)}
      />

      <div className="section-label">All songs</div>
      <div className="rows">
        {tracks.map((track, i) => (
          <TrackRow
            key={`${track.id}:${i}`}
            track={track}
            active={track.id === player.current?.id}
            onClick={() => player.playContext(tracks, i)}
            onAdd={() => player.addToQueue(track)}
          />
        ))}
      </div>
    </div>
  )
}

function AlbumGrid({
  albums,
  player,
  onOpen
}: {
  albums: MobileAlbum[]
  player: Player
  onOpen: (key: string) => void
}) {
  return (
    <div className="album-grid">
      {albums.map((album) => (
        <button
          key={album.key}
          type="button"
          className="album-tile"
          onClick={() => {
            onOpen(album.key)
            player.playContext(album.tracks, 0)
          }}
        >
          <Cover track={artworkTrack(album.tracks)} className="album-tile__art" iconSize={30} />
          <span className="album-tile__name">{album.name}</span>
        </button>
      ))}
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
  onClose,
  onOpenQueue
}: {
  player: Player
  onClose: () => void
  onOpenQueue: () => void
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
        <Cover track={track} className="np__artimg" iconSize={96} />
      </div>

      <div className="np__meta">
        <div className="np__title">{track.title}</div>
        <div className="np__sub">{track.artist}</div>
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
          onClick={() =>
            player.setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
          }
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
  onJump: (index: number) => void
}) {
  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <span className="sheet__title">Queue</span>
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
              onClick={() => onJump(i)}
            >
              <span className="row__num">{i + 1}</span>
              <span className="row__text">
                <span className="row__title">{track.title}</span>
                <span className="row__sub">{track.artist}</span>
              </span>
              <button
                type="button"
                className="row__add"
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
