import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLibrary } from '@renderer/state/useLibrary'
import { useSettings } from '@renderer/state/useSettings'
import { usePlayer } from '@renderer/state/usePlayer'
import { useArtwork } from '@renderer/state/useArtwork'
import { usePlaylists } from '@renderer/state/usePlaylists'
import {
  applyTheme,
  extractPalette,
  isLightTheme,
  resolvePalette,
  type Palette
} from '@renderer/theme/palette'
import { Sidebar, type SidebarSelection, type SearchTarget } from '@renderer/components/Sidebar'
import type { PinnedItem } from '@shared/types'
import { KEYBIND_IDS, normalizeKey } from '@shared/keybinds'
import { albumKeyOf } from '@renderer/lib/album'
import { Browse } from '@renderer/components/Browse'
import type { MetadataActions } from '@renderer/components/Browse'
import { NowPlaying } from '@renderer/components/NowPlaying'
import { QueuePanel } from '@renderer/components/QueuePanel'
import { BottomBar } from '@renderer/components/BottomBar'
import { LyricsView } from '@renderer/components/LyricsView'
import { LyricsDialog } from '@renderer/components/LyricsDialog'
import { useLyricsAvailable } from '@renderer/state/useLyricsAvailable'
import { AddUrlDialog } from '@renderer/components/AddUrlDialog'
import { AddToPlaylistDialog } from '@renderer/components/AddToPlaylistDialog'
import { SettingsView } from '@renderer/components/SettingsView'
import { SearchView } from '@renderer/components/SearchView'
import { ShortcutsOverlay } from '@renderer/components/ShortcutsOverlay'
import { UpdateScreen } from '@renderer/components/UpdateScreen'

const api = window.lagu

export function App() {
  const library = useLibrary()
  const playlists = usePlaylists()
  const { settings, update, reload, loaded } = useSettings()

  const resolve = useCallback((id: string) => library.byId.get(id), [library.byId])
  const player = usePlayer(resolve, settings, update)

  const [selection, setSelection] = useState<SidebarSelection>('now')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [addUrlOpen, setAddUrlOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(0)
  const [sidebarWidth, setSidebarWidth] = useState(212)
  const [queueWidth, setQueueWidth] = useState(300)
  const [lyricsRevision, setLyricsRevision] = useState(0)
  const [lyricsDialog, setLyricsDialog] = useState(false)
  const [browseFocus, setBrowseFocus] = useState<{ kind: 'album' | 'artist' | 'playlist'; ref: string; token: number } | null>(null)
  const [browseReset, setBrowseReset] = useState(0)
  const [playlistDialog, setPlaylistDialog] = useState<{ trackIds: string[]; createOnly: boolean } | null>(null)
  const focusToken = useRef(0)
  const [artworkPalette, setArtworkPalette] = useState<Palette | null>(null)
  const initialisedView = useRef(false)
  const previousPanels = useRef<{ showSidebar: boolean; showQueue: boolean } | null>(null)

  const light = isLightTheme(settings.theme)

  // --- dynamic theming from artwork ----------------------------------------
  const artUrl = useArtwork(player.currentTrack?.id)
  useEffect(() => {
    let cancelled = false
    if (!artUrl) {
      setArtworkPalette(null)
      return
    }
    void extractPalette(artUrl, light).then((result) => {
      if (!cancelled) setArtworkPalette(result)
    })
    return () => {
      cancelled = true
    }
  }, [artUrl, light])

  const palette = useMemo(
    () => resolvePalette(settings.theme, settings.accentMode, settings.accentColor, artworkPalette),
    [settings.theme, settings.accentMode, settings.accentColor, artworkPalette]
  )

  useEffect(() => {
    applyTheme({
      theme: settings.theme,
      radius: settings.radius,
      density: settings.density,
      animations: settings.animations,
      performance: settings.performanceMode,
      palette
    })
  }, [settings.theme, settings.radius, settings.density, settings.animations, settings.performanceMode, palette])

  // --- zoom ----------------------------------------------------------------
  useEffect(() => {
    if (loaded) setZoom(settings.zoom)
  }, [loaded, settings.zoom])

  useEffect(() => {
    if (loaded) setSidebarWidth(settings.sidebarWidth)
  }, [loaded, settings.sidebarWidth])

  useEffect(() => {
    if (loaded) setQueueWidth(settings.queueWidth)
  }, [loaded, settings.queueWidth])

  const onZoom = useCallback((delta: number) => {
    void api.window.zoom(delta).then(setZoom)
  }, [])
  const onResetZoom = useCallback(() => {
    void api.window.resetZoom().then(setZoom)
  }, [])

  // --- fullscreen ----------------------------------------------------------
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const toggleFullscreen = useCallback(() => {
    void api.window.toggleFullscreen()
  }, [])

  useEffect(() => {
    return api.window.onFullscreenChange((value) => {
      setIsFullscreen(value)
      if (value) {
        previousPanels.current = {
          showSidebar: settingsRef.current.showSidebar,
          showQueue: settingsRef.current.showQueue
        }
        setSelection('now')
        update({ showSidebar: false, showQueue: false })
      } else if (previousPanels.current) {
        update(previousPanels.current)
        previousPanels.current = null
      }
    })
  }, [update])

  // First-run: land on Folders when the library is empty so adding is obvious.
  useEffect(() => {
    if (!loaded || initialisedView.current) return
    initialisedView.current = true
    if (library.folders.length === 0 && library.tracks.length === 0) setSelection('folders')
  }, [loaded, library.folders.length, library.tracks.length])

  // --- keyboard shortcuts --------------------------------------------------
  const playerRef = useRef(player)
  playerRef.current = player

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const mod = e.ctrlKey || e.metaKey

      if (mod) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          onZoom(1)
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault()
          onZoom(-1)
        } else if (e.key === '0') {
          e.preventDefault()
          onResetZoom()
        } else if (e.key === ',') {
          e.preventDefault()
          setSelection('settings')
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          playerRef.current.next()
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          playerRef.current.prev()
        }
        return
      }

      const p = playerRef.current
      const s = settingsRef.current
      const total = p.currentTrack?.duration || p.duration || 0

      if (e.key === 'Escape') {
        if (shortcutsOpen) setShortcutsOpen(false)
        else if (addUrlOpen) setAddUrlOpen(false)
        else if (isFullscreen) toggleFullscreen()
        return
      }

      // Customisable keybindings take priority over the fixed controls.
      const pressed = normalizeKey(e.key)
      const binds = s.keybindings ?? {}
      const action = KEYBIND_IDS.find((id) => binds[id] && normalizeKey(binds[id]) === pressed)
      if (action) {
        if (pressed === ' ') e.preventDefault()
        switch (action) {
          case 'playPause':
            p.toggle()
            break
          case 'nextTrack':
            p.next()
            break
          case 'prevTrack':
            p.prev()
            break
          case 'mute':
            p.toggleMute()
            break
          case 'shuffle':
            p.toggleShuffle()
            break
          case 'repeat':
            p.cycleRepeat()
            break
          case 'lyrics':
            if (hasLyricsRef.current) update({ showLyrics: !s.showLyrics })
            break
          case 'queue':
            update({ showQueue: !s.showQueue })
            break
          case 'toggleSidebar':
            update({ showSidebar: !s.showSidebar })
            break
          case 'fullscreen':
            toggleFullscreen()
            break
          case 'goNowPlaying':
            setSelection('now')
            break
          case 'goLibrary':
            setSelection('library')
            break
          case 'goAlbums':
            setSelection('albums')
            break
          case 'goArtists':
            setSelection('artists')
            break
          case 'goFolders':
            setSelection('folders')
            break
          case 'shortcuts':
            setShortcutsOpen((v) => !v)
            break
          default:
            break
        }
        return
      }

      // Fixed navigation controls.
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          p.seek(Math.min(total, p.currentTime + 5))
          break
        case 'ArrowLeft':
          e.preventDefault()
          p.seek(Math.max(0, p.currentTime - 5))
          break
        case 'ArrowUp':
          e.preventDefault()
          p.setVolume(Math.min(1, s.volume + 0.05))
          break
        case 'ArrowDown':
          e.preventDefault()
          p.setVolume(Math.max(0, s.volume - 0.05))
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onZoom, onResetZoom, update, toggleFullscreen, isFullscreen, shortcutsOpen, addUrlOpen])

  const lyricsOpen = settings.showLyrics && Boolean(player.currentTrack)

  const setTrackLyricsOffset = useCallback(
    (ms: number | null) => {
      const id = player.currentTrack?.id
      if (id) void api.metadata.setLyricsOffset([id], ms)
    },
    [player.currentTrack?.id]
  )

  const importLyricsFor = useCallback(() => {
    const id = player.currentTrack?.id
    if (id) void api.track.importLyrics(id).then(() => setLyricsRevision((v) => v + 1))
  }, [player.currentTrack?.id])

  const clearLyricsFor = useCallback(() => {
    const id = player.currentTrack?.id
    if (id) void api.track.clearLyrics(id).then(() => setLyricsRevision((v) => v + 1))
  }, [player.currentTrack?.id])

  const hasLyrics = useLyricsAvailable(player.currentTrack?.id ?? null, lyricsRevision)
  const hasLyricsRef = useRef(hasLyrics)
  hasLyricsRef.current = hasLyrics

  const lyricsSlot = useMemo(
    () => (
      <LyricsView
        trackId={player.currentTrack?.id ?? null}
        currentTime={player.currentTime}
        offset={player.currentTrack?.lyricsOffset ?? settings.lyricsOffset}
        revision={lyricsRevision}
      />
    ),
    [
      player.currentTrack?.id,
      player.currentTrack?.lyricsOffset,
      player.currentTime,
      settings.lyricsOffset,
      lyricsRevision
    ]
  )

  const submitSearch = useCallback(() => {
    const query = searchInput.trim()
    setSearchQuery(query)
    setSelection(query ? 'search' : 'now')
  }, [searchInput])

  const activatePin = useCallback(
    (pin: PinnedItem) => {
      if (pin.kind === 'track') {
        const track = library.byId.get(pin.ref)
        if (track) player.playTrack(track)
        return
      }
      if (pin.kind === 'album') {
        const list = library.tracks.filter((t) => albumKeyOf(t) === pin.ref)
        setSelection('albums')
        setBrowseFocus({ kind: 'album', ref: pin.ref, token: ++focusToken.current })
        // Don't hijack playback if something is already playing.
        if (!player.playing && list.length > 0) player.playContext(list, 0)
        return
      }
      if (pin.kind === 'playlist') {
        setSelection('playlists')
        setBrowseFocus({ kind: 'playlist', ref: pin.ref, token: ++focusToken.current })
        return
      }
      const list = library.tracks.filter((t) => (t.albumArtist || t.artist) === pin.ref)
      setSelection('artists')
      setBrowseFocus({ kind: 'artist', ref: pin.ref, token: ++focusToken.current })
      if (!player.playing && list.length > 0) player.playContext(list, 0)
      return
    },
    [library, player]
  )

  const selectSection = useCallback((sel: SidebarSelection) => {
    setSelection(sel)
    if (
      sel === 'library' ||
      sel === 'albums' ||
      sel === 'artists' ||
      sel === 'playlists' ||
      sel === 'folders'
    ) {
      setBrowseFocus(null)
      setBrowseReset((n) => n + 1)
    }
  }, [])

  const openSearchResult = useCallback(
    (target: SearchTarget) => {
      if (target.kind === 'track') {
        const track = library.byId.get(target.ref)
        if (track) player.playTrack(track)
        return
      }
      if (target.kind === 'album') {
        setSelection('albums')
        setBrowseFocus({ kind: 'album', ref: target.ref, token: ++focusToken.current })
        return
      }
      setSelection('artists')
      setBrowseFocus({ kind: 'artist', ref: target.ref, token: ++focusToken.current })
    },
    [library, player]
  )

  const meta = useMemo<MetadataActions>(
    () => ({
      update: (ids, patch) => void api.metadata.update(ids, patch),
      setCover: (ids) => void api.metadata.setCover(ids),
      clear: (ids) => void api.metadata.clear(ids),
      fetchCover: (ids) => void api.metadata.fetchCover(ids),
      remove: (ids) => void library.removeTracks(ids),
      trash: (ids) => void library.trashTracks(ids),
      importLyrics: (trackId) =>
        void api.track.importLyrics(trackId).then(() => setLyricsRevision((v) => v + 1)),
      clearLyrics: (trackId) =>
        void api.track.clearLyrics(trackId).then(() => setLyricsRevision((v) => v + 1)),
      setLyricsOffset: (trackId, ms) => void api.metadata.setLyricsOffset([trackId], ms),
      pin: (item) => {
        const id = `${item.kind}:${item.ref}`
        if (library.pinned.some((p) => p.id === id)) return
        void library.setPinned([...library.pinned, { ...item, id }])
      },
      addToPlaylist: (trackIds) => setPlaylistDialog({ trackIds, createOnly: false }),
      defaultLyricsOffset: settings.lyricsOffset,
      online: settings.fetchArtworkOnline
    }),
    [settings.fetchArtworkOnline, settings.lyricsOffset, library]
  )

  // --- auto-fetch lyrics online when a track has none (opt-in) ---------------
  useEffect(() => {
    if (!settings.autoLyrics) return
    const id = player.currentTrack?.id
    if (!id) return
    let cancelled = false
    void api.track.autoFetchLyrics(id).then(() => {
      if (!cancelled) setLyricsRevision((v) => v + 1)
    })
    return () => {
      cancelled = true
    }
  }, [player.currentTrack?.id, settings.autoLyrics])

  // --- Discord Rich Presence -----------------------------------------------
  useEffect(() => {
    const track = player.currentTrack
    api.discord.update(
      track && settings.discordRpc
        ? {
            title: track.title,
            artist: track.artist,
            album: track.album,
            position: player.currentTime,
            duration: player.duration,
            playing: player.playing
          }
        : null
    )
    // Intentionally keyed on the track + play state, not the ticking time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.discordRpc, player.currentTrack, player.playing])

  // --- immersive fullscreen: reveal the bottom bar near the screen edge ------
  const immersive = isFullscreen && selection === 'now'
  const [barRevealed, setBarRevealed] = useState(false)

  useEffect(() => {
    if (!immersive) {
      setBarRevealed(false)
      return
    }
    const onMove = (e: MouseEvent): void => {
      setBarRevealed(e.clientY >= window.innerHeight - 110)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [immersive])

  const className = [
    'app',
    settings.showSidebar ? '' : 'app--no-sidebar',
    settings.showQueue ? '' : 'app--no-queue',
    settings.showTrackNumbers ? '' : 'app--no-track-numbers',
    settings.lyricsAlign === 'left' ? 'app--lyrics-left' : '',
    settings.cover3d ? 'app--covers-3d' : '',
    immersive ? 'app--immersive' : '',
    immersive && !barRevealed ? 'app--bar-hidden' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const appStyle = { '--lyrics-size': `${settings.lyricsFontSize}px` } as CSSProperties

  return (
    <div className={className} style={appStyle}>
      <div className="workspace">
        {settings.showSidebar && (
          <Sidebar
            selection={selection}
            onSelect={selectSection}
            width={sidebarWidth}
            onResize={setSidebarWidth}
            onResizeEnd={(w) => update({ sidebarWidth: w })}
            folders={library.folders}
            scanning={library.scanning}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            onSearchSubmit={submitSearch}
            onSearchSelect={openSearchResult}
            pinned={library.pinned}
            tracks={library.tracks}
            playlists={playlists.playlists}
            volume={settings.volume}
            muted={settings.muted}
            onSetVolume={player.setVolume}
            onToggleMute={player.toggleMute}
            onActivatePin={activatePin}
            onUnpin={(id) => void library.setPinned(library.pinned.filter((p) => p.id !== id))}
            onAddFolder={() => void library.addFolder()}
            onRescan={() => void library.rescan()}
            onRemoveFolder={(id) => void library.removeFolder(id)}
            onAddUrl={() => setAddUrlOpen(true)}
          />
        )}

        <main className="main">
          {selection === 'now' && (
            <NowPlaying
              track={player.currentTrack}
              playing={player.playing}
              currentTime={player.currentTime}
              duration={player.duration}
              error={player.error}
              visualizer={settings.visualizer}
              lyricsOpen={lyricsOpen}
              accent={palette.accent}
              onSeek={player.seek}
              onOpenArtist={(name) => {
                setSelection('artists')
                setBrowseFocus({ kind: 'artist', ref: name, token: ++focusToken.current })
              }}
              lyricsSlot={lyricsSlot}
            />
          )}

          {selection === 'search' && (
            <SearchView
              query={searchQuery}
              tracks={library.tracks}
              currentTrackId={player.currentTrack?.id ?? null}
              onPlayContext={player.playContext}
              onPlayNext={player.playNext}
              onAddToQueue={player.addToQueue}
            />
          )}

          {selection === 'settings' && (
            <SettingsView
              settings={settings}
              update={update}
              zoom={zoom}
              onZoom={onZoom}
              onResetZoom={onResetZoom}
              onOpenShortcuts={() => setShortcutsOpen(true)}
              trackCount={library.tracks.length}
              artworkProgress={library.artworkProgress}
              onFetchMissingArtwork={() => void library.fetchMissingArtwork()}
              hiddenCount={library.hiddenCount}
              onRestoreHidden={() => void library.restoreHidden()}
              onResetSettings={async () => {
                await api.settings.reset()
                await reload()
              }}
            />
          )}

          {selection !== 'now' && selection !== 'settings' && selection !== 'search' && (
            <Browse
              key={browseReset}
              section={selection}
              tracks={library.tracks}
              byId={library.byId}
              playlists={playlists.playlists}
              folders={library.folders}
              scanning={library.scanning}
              progress={library.progress}
              unsupported={library.unsupported}
              currentTrackId={player.currentTrack?.id ?? null}
              playing={player.playing}
              onToggle={player.toggle}
              onPlayContext={player.playContext}
              onPlayNext={player.playNext}
              onAddToQueue={player.addToQueue}
              onFindCover={
                settings.fetchArtworkOnline
                  ? (track) => void library.fetchArtwork(track.id)
                  : undefined
              }
              onAddFolder={() => void library.addFolder()}
              onRescan={() => void library.rescan()}
              onRemoveFolder={(id) => void library.removeFolder(id)}
              onCreatePlaylist={() => setPlaylistDialog({ trackIds: [], createOnly: true })}
              onRenamePlaylist={(id, name) => playlists.rename(id, name)}
              onDeletePlaylist={(id) => {
                playlists.remove(id)
                if (browseFocus?.kind === 'playlist' && browseFocus.ref === id) setBrowseFocus(null)
              }}
              onRemoveFromPlaylist={(id, trackId) => playlists.removeTrack(id, trackId)}
              meta={meta}
              albumSort={settings.albumSort}
              albumSortDesc={settings.albumSortDesc}
              onSortChange={(albumSort, albumSortDesc) => update({ albumSort, albumSortDesc })}
              focus={browseFocus}
            />
          )}
        </main>

        {settings.showQueue && (
          <QueuePanel
            queue={player.queue}
            resolve={resolve}
            width={queueWidth}
            mode={settings.queueMode}
            onResize={setQueueWidth}
            onResizeEnd={(w) => update({ queueWidth: w })}
            onJump={player.jumpTo}
            onRemove={player.removeFromQueue}
            onMove={player.moveInQueue}
          />
        )}
      </div>

      <BottomBar
        track={player.currentTrack}
        playing={player.playing}
        currentTime={player.currentTime}
        duration={player.duration}
        shuffle={settings.shuffle}
        repeat={settings.repeat}
        visualizer={settings.visualizer}
        queueOpen={settings.showQueue}
        lyricsOpen={lyricsOpen}
        lyricsAvailable={hasLyrics}
        isFullscreen={isFullscreen}
        accent={palette.accent}
        onToggle={player.toggle}
        onNext={player.next}
        onPrev={player.prev}
        onSeek={player.seek}
        onToggleShuffle={player.toggleShuffle}
        onCycleRepeat={player.cycleRepeat}
        onToggleQueue={() => update({ showQueue: !settings.showQueue })}
        onToggleLyrics={() => update({ showLyrics: !settings.showLyrics })}
        onEditLyrics={() => setLyricsDialog(true)}
        onToggleFullscreen={toggleFullscreen}
      />

      {addUrlOpen && <AddUrlDialog onSubmit={library.addUrl} onClose={() => setAddUrlOpen(false)} />}

      {playlistDialog && (
        <AddToPlaylistDialog
          playlists={playlists.playlists}
          trackCount={playlistDialog.trackIds.length}
          createOnly={playlistDialog.createOnly}
          onAdd={(id) => {
            playlists.addTracks(id, playlistDialog.trackIds)
            setPlaylistDialog(null)
          }}
          onCreate={(name) => {
            const playlist = playlists.create(name, playlistDialog.trackIds)
            setPlaylistDialog(null)
            setSelection('playlists')
            setBrowseFocus({ kind: 'playlist', ref: playlist.id, token: ++focusToken.current })
          }}
          onClose={() => setPlaylistDialog(null)}
        />
      )}

      {shortcutsOpen && (
        <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} bindings={settings.keybindings} />
      )}

      <UpdateScreen />

      {lyricsDialog && player.currentTrack && (
        <LyricsDialog
          trackId={player.currentTrack.id}
          trackOffset={player.currentTrack.lyricsOffset ?? null}
          defaultOffset={settings.lyricsOffset}
          onImport={importLyricsFor}
          onClear={clearLyricsFor}
          onSetOffset={setTrackLyricsOffset}
          onClose={() => setLyricsDialog(false)}
        />
      )}
    </div>
  )
}
