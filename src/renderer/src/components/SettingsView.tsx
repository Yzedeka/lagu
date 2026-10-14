import { useEffect, useState, type ReactNode } from 'react'
import type { AlbumSort, AppSettings, LyricsAlign, ThemeMode } from '@shared/types'
import { ACCENT_PRESETS } from '@renderer/state/defaults'
import {
  AnimationIcon,
  CloudDownloadIcon,
  FolderIcon,
  GraphicEqIcon,
  ImageIcon,
  KeyboardIcon,
  LayersIcon,
  LibraryIcon,
  LyricsIcon,
  PaletteIcon,
  WifiIcon,
  ZoomInIcon,
  ZoomOutIcon
} from '@renderer/icons'
import { Range } from './Range'
import { SearchBar } from './SearchBar'
import { KEYBIND_ACTIONS, defaultBindings, keyLabel, normalizeKey } from '@renderer/lib/keybinds'

interface SettingsViewProps {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  zoom: number
  onZoom: (delta: number) => void
  onResetZoom: () => void
  onOpenShortcuts: () => void
  trackCount: number
  artworkProgress: { done: number; total: number } | null
  onFetchMissingArtwork: () => void
  hiddenCount: number
  onRestoreHidden: () => void
  onResetSettings: () => Promise<void>
}

type CategoryId =
  | 'appearance'
  | 'panels'
  | 'playback'
  | 'lyrics'
  | 'library'
  | 'artwork'
  | 'keybinds'
  | 'integrations'
  | 'data'
  | 'help'

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'grey', label: 'Grey' },
  { id: 'black', label: 'Black' }
]

const ALBUM_SORTS: { id: AlbumSort; label: string }[] = [
  { id: 'artist', label: 'Artist' },
  { id: 'name', label: 'Album name' },
  { id: 'year', label: 'Year' },
  { id: 'added', label: 'Recently added' },
  { id: 'tracks', label: 'Track count' }
]

const CATEGORIES: { id: CategoryId; label: string; icon: typeof PaletteIcon }[] = [
  { id: 'appearance', label: 'Appearance', icon: PaletteIcon },
  { id: 'panels', label: 'Panels', icon: AnimationIcon },
  { id: 'playback', label: 'Playback', icon: GraphicEqIcon },
  { id: 'lyrics', label: 'Lyrics', icon: LyricsIcon },
  { id: 'library', label: 'Songs', icon: LibraryIcon },
  { id: 'artwork', label: 'Artwork', icon: ImageIcon },
  { id: 'keybinds', label: 'Keybinds', icon: KeyboardIcon },
  { id: 'integrations', label: 'Integrations', icon: WifiIcon },
  { id: 'data', label: 'Data', icon: FolderIcon },
  { id: 'help', label: 'Help', icon: LayersIcon }
]

interface RowDef {
  id: string
  category: CategoryId
  label: string
  desc?: string
  keywords?: string
  control: ReactNode
}

function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={option.id === value ? 'button--active' : ''}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      className={`switch ${on ? 'switch--on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    />
  )
}

const api = window.lagu

export function SettingsView({
  settings,
  update,
  zoom,
  onZoom,
  onResetZoom,
  onOpenShortcuts,
  trackCount,
  artworkProgress,
  onFetchMissingArtwork,
  hiddenCount,
  onRestoreHidden,
  onResetSettings
}: SettingsViewProps) {
  const zoomPercent = Math.round(100 * 1.2 ** zoom)

  const [query, setQuery] = useState('')
  const [active, setActive] = useState<CategoryId>('appearance')
  const [dataFolder, setDataFolder] = useState('')
  const [offsetText, setOffsetText] = useState((settings.lyricsOffset / 1000).toString())
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    setOffsetText((settings.lyricsOffset / 1000).toString())
  }, [settings.lyricsOffset])

  useEffect(() => {
    void api.app.dataFolder().then(setDataFolder)
  }, [])

  const row = (
    category: CategoryId,
    id: string,
    label: string,
    control: ReactNode,
    desc?: string,
    keywords?: string
  ): RowDef => ({ category, id, label, desc, keywords, control })

  const rows: RowDef[] = [
    // --- Appearance -------------------------------------------------------
    row(
      'appearance',
      'theme',
      'Theme',
      <Segmented value={settings.theme} options={THEMES} onChange={(theme) => update({ theme })} />,
      'Charcoal, light, light grey or near-black.'
    ),
    row(
      'appearance',
      'accent-mode',
      'Accent colour',
      <Segmented
        value={settings.accentMode}
        options={[
          { id: 'artwork', label: 'Artwork' },
          { id: 'fixed', label: 'Fixed' }
        ]}
        onChange={(accentMode) => update({ accentMode })}
      />,
      'Follow the playing artwork, or pick a fixed colour.',
      'accent tint colour theme'
    ),
    ...(settings.accentMode === 'fixed'
      ? [
          row(
            'appearance',
            'accent-color',
            'Accent',
            <div className="swatches">
              {ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.name}
                  className={`swatch ${
                    settings.accentColor.toLowerCase() === preset.value.toLowerCase()
                      ? 'swatch--active'
                      : ''
                  }`}
                  style={{ background: preset.value }}
                  onClick={() => update({ accentColor: preset.value })}
                />
              ))}
              <input
                type="color"
                className="color-input"
                value={settings.accentColor}
                onChange={(e) => update({ accentColor: e.target.value })}
              />
            </div>,
            undefined,
            'accent tint colour theme'
          )
        ]
      : []),
    row(
      'appearance',
      'radius',
      'Corner radius',
      <div className="settings__slider">
        <Range
          value={settings.radius}
          max={8}
          onChange={(v) => update({ radius: Math.round(v) })}
          ariaLabel="Corner radius"
        />
      </div>,
      `${settings.radius}px - 0 keeps everything sharp.`,
      'rounded corners'
    ),
    row(
      'appearance',
      'density',
      'Density',
      <Segmented
        value={settings.density}
        options={[
          { id: 'comfortable', label: 'Comfortable' },
          { id: 'compact', label: 'Compact' }
        ]}
        onChange={(density) => update({ density })}
      />,
      'Row height and spacing.'
    ),
    row(
      'appearance',
      'animations',
      'Animations',
      <Switch on={settings.animations} onChange={(animations) => update({ animations })} />,
      'Transitions and view effects.',
      'motion reduce'
    ),
    row(
      'appearance',
      'performance',
      'Performance mode',
      <Switch
        on={settings.performanceMode}
        onChange={(performanceMode) => update({ performanceMode })}
      />,
      'Disable every animation, transition and visual extra for the smoothest experience.',
      'motion reduce speed low end'
    ),
    row(
      'appearance',
      'cover-3d',
      '3D album covers',
      <Switch on={settings.cover3d} onChange={(cover3d) => update({ cover3d })} />,
      'Show albums as records with a disc behind the sleeve. Square corners while on.',
      'cover art record disc depth perspective'
    ),
    row(
      'appearance',
      'zoom',
      'Interface zoom',
      <div className="swatches">
        <button type="button" className="icon-btn" title="Zoom out" onClick={() => onZoom(-1)}>
          <ZoomOutIcon size={16} />
        </button>
        <span className="settings__value">{zoomPercent}%</span>
        <button type="button" className="icon-btn" title="Zoom in" onClick={() => onZoom(1)}>
          <ZoomInIcon size={16} />
        </button>
        <button type="button" className="ghost-btn" onClick={onResetZoom}>
          Reset
        </button>
      </div>,
      'Ctrl + / Ctrl − / Ctrl 0',
      'scale size'
    ),
    row(
      'appearance',
      'sidebar-width',
      'Sidebar width',
      <div className="settings__slider">
        <Range
          value={settings.sidebarWidth}
          min={150}
          max={440}
          onChange={(v) => update({ sidebarWidth: Math.round(v) })}
          ariaLabel="Sidebar width"
        />
      </div>,
      `${Math.round(settings.sidebarWidth)}px`,
      'panel width resize'
    ),

    // --- Panels -----------------------------------------------------------
    row(
      'panels',
      'show-sidebar',
      'Show sidebar',
      <Switch on={settings.showSidebar} onChange={(showSidebar) => update({ showSidebar })} />,
      'Toggle the left sidebar (B).'
    ),
    row(
      'panels',
      'show-queue',
      'Show queue',
      <Switch on={settings.showQueue} onChange={(showQueue) => update({ showQueue })} />,
      'Toggle the Up Next panel (Q).'
    ),
    row(
      'panels',
      'queue-mode',
      'Queue style',
      <Segmented
        value={settings.queueMode}
        options={[
          { id: 'normal', label: 'Normal' },
          { id: 'compact', label: 'Compact' }
        ]}
        onChange={(queueMode) => update({ queueMode })}
      />,
      'How dense the queue rows are.',
      'queue density compact tiny normal'
    ),
    row(
      'panels',
      'queue-width',
      'Queue width',
      <div className="settings__slider">
        <Range
          value={settings.queueWidth}
          min={64}
          max={560}
          onChange={(v) => update({ queueWidth: Math.round(v) })}
          ariaLabel="Queue width"
        />
      </div>,
      `${Math.round(settings.queueWidth)}px`,
      'panel width resize'
    ),
    row(
      'panels',
      'visualizer',
      'Audio visualizer',
      <Switch on={settings.visualizer} onChange={(visualizer) => update({ visualizer })} />,
      'React to the playing audio.'
    ),

    // --- Playback ---------------------------------------------------------
    row(
      'playback',
      'eight-d',
      '8D audio',
      <Switch on={settings.eightD} onChange={(eightD) => update({ eightD })} />,
      'Rotate the sound around your head (local files).',
      'spatial surround'
    ),
    row(
      'playback',
      'crossfade',
      'Crossfade',
      <div className="settings__number">
        <input
          type="number"
          className="text-input text-input--number"
          min={0}
          max={20}
          step={1}
          value={settings.crossfade}
          aria-label="Crossfade seconds"
          onChange={(e) =>
            update({ crossfade: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })
          }
        />
        <span className="settings__unit">s</span>
      </div>,
      'Blend the end of a track into the next one, in seconds (0 disables).',
      'fade gapless'
    ),
    row(
      'playback',
      'scan-startup',
      'Scan on startup',
      <Switch on={settings.scanOnStartup} onChange={(scanOnStartup) => update({ scanOnStartup })} />,
      'Rescan your library folders each time Lagu launches.',
      'startup refresh rescan'
    ),

    // --- Lyrics -----------------------------------------------------------
    row(
      'lyrics',
      'auto-lyrics',
      'Auto-scan lyrics online',
      <Switch on={settings.autoLyrics} onChange={(autoLyrics) => update({ autoLyrics })} />,
      'Look up lyrics for tracks that have none. Prefers word-by-word (Enhanced LRC).'
    ),
    row(
      'lyrics',
      'lyrics-offset',
      'Timing offset',
      <div className="settings__number">
        <input
          type="number"
          className="text-input text-input--number"
          step="0.1"
          min={-600}
          max={600}
          value={offsetText}
          aria-label="Lyrics timing offset in seconds"
          onChange={(e) => {
            setOffsetText(e.target.value)
            const seconds = Number(e.target.value)
            if (e.target.value.trim() !== '' && Number.isFinite(seconds)) {
              update({
                lyricsOffset: Math.max(-600000, Math.min(600000, Math.round(seconds * 1000)))
              })
            }
          }}
          onBlur={() => setOffsetText((settings.lyricsOffset / 1000).toString())}
        />
        <span className="settings__unit">s</span>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => update({ lyricsOffset: 0 })}
          disabled={settings.lyricsOffset === 0}
        >
          Reset
        </button>
      </div>,
      'Default shift in seconds. Positive delays lyrics. Per-track overrides live in Edit .lrc.'
    ),
    row(
      'lyrics',
      'lyrics-size',
      'Text size',
      <div className="settings__slider">
        <Range
          value={settings.lyricsFontSize}
          min={11}
          max={30}
          onChange={(v) => update({ lyricsFontSize: Math.round(v) })}
          ariaLabel="Lyrics text size"
        />
      </div>,
      `${Math.round(settings.lyricsFontSize)}px`,
      'font size'
    ),
    row(
      'lyrics',
      'lyrics-align',
      'Alignment',
      <Segmented
        value={settings.lyricsAlign}
        options={[
          { id: 'center', label: 'Center' },
          { id: 'left', label: 'Left' }
        ]}
        onChange={(lyricsAlign: LyricsAlign) => update({ lyricsAlign })}
      />,
      'How lyric lines are aligned in the Now Playing view.'
    ),

    // --- Library ----------------------------------------------------------
    row(
      'library',
      'track-count',
      'Tracks',
      <span className="settings__value">{trackCount}</span>,
      'Songs currently in your library.'
    ),
    row(
      'library',
      'hidden',
      'Hidden items',
      <div className="swatches">
        <span className="settings__value">{hiddenCount}</span>
        <button type="button" className="ghost-btn" onClick={onRestoreHidden} disabled={hiddenCount === 0}>
          Restore
        </button>
      </div>,
      'Tracks you removed from the library. Their files are untouched.'
    ),
    row(
      'library',
      'track-numbers',
      'Show track numbers',
      <Switch
        on={settings.showTrackNumbers}
        onChange={(showTrackNumbers) => update({ showTrackNumbers })}
      />,
      'Show the number column in track lists.'
    ),
    row(
      'library',
      'album-sort',
      'Default album sort',
      <select
        className="select"
        value={settings.albumSort}
        aria-label="Default album sort"
        onChange={(e) => update({ albumSort: e.target.value as AlbumSort })}
      >
        {ALBUM_SORTS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>,
      'How the Albums grid is ordered when you open it.'
    ),
    row(
      'library',
      'album-sort-dir',
      'Sort direction',
      <Segmented
        value={settings.albumSortDesc ? 'desc' : 'asc'}
        options={[
          { id: 'asc', label: 'Ascending' },
          { id: 'desc', label: 'Descending' }
        ]}
        onChange={(dir) => update({ albumSortDesc: dir === 'desc' })}
      />
    ),

    // --- Artwork ----------------------------------------------------------
    row(
      'artwork',
      'fetch-online',
      'Look up covers online',
      <Switch
        on={settings.fetchArtworkOnline}
        onChange={(fetchArtworkOnline) => update({ fetchArtworkOnline })}
      />,
      'Search iTunes / Deezer for missing album art. Requires a network connection.'
    ),
    row(
      'artwork',
      'fetch-missing',
      'Fetch missing covers',
      <div className="swatches">
        {artworkProgress && (
          <span className="settings__value">
            {artworkProgress.done}/{artworkProgress.total}
          </span>
        )}
        <button
          type="button"
          className="ghost-btn"
          onClick={onFetchMissingArtwork}
          disabled={!settings.fetchArtworkOnline || Boolean(artworkProgress)}
        >
          <CloudDownloadIcon size={14} />
          {artworkProgress ? 'Fetching…' : 'Fetch now'}
        </button>
      </div>,
      'Look up artwork for every track that has none. Runs gently in the background.'
    ),

    // --- Keybinds ---------------------------------------------------------
    ...KEYBIND_ACTIONS.map((action) =>
      row(
        'keybinds',
        `key-${action.id}`,
        action.label,
        <KeybindRecorder
          value={settings.keybindings[action.id] ?? ''}
          onChange={(key) =>
            update({ keybindings: { ...settings.keybindings, [action.id]: key } })
          }
        />,
        action.group,
        'keybind shortcut hotkey key'
      )
    ),
    row(
      'keybinds',
      'key-reset',
      'Reset keybinds',
      <button
        type="button"
        className="ghost-btn"
        onClick={() => update({ keybindings: defaultBindings() })}
      >
        Reset
      </button>,
      'Restore every shortcut to its default key.',
      'defaults'
    ),

    // --- Integrations -----------------------------------------------------
    row(
      'integrations',
      'discord-rpc',
      'Discord Rich Presence',
      <Switch on={settings.discordRpc} onChange={(discordRpc) => update({ discordRpc })} />,
      'Show the track you are playing as your Discord status.',
      'discord rich presence status'
    ),
    row(
      'integrations',
      'discord-client',
      'Discord application ID',
      <input
        className="text-input text-input--client"
        type="text"
        value={settings.discordClientId}
        placeholder="Application ID"
        spellCheck={false}
        onChange={(e) => update({ discordClientId: e.target.value.trim() })}
      />,
      'Create an app at discord.com/developers and paste its Application ID.',
      'discord client id application'
    ),

    // --- Data -------------------------------------------------------------
    row(
      'data',
      'data-folder',
      'Data folder',
      <button type="button" className="ghost-btn" onClick={() => void api.app.openDataFolder()}>
        <FolderIcon size={14} /> Open
      </button>,
      dataFolder || 'Loading…',
      'location config storage'
    ),
    row(
      'data',
      'clear-artwork',
      'Clear cover cache',
      <button
        type="button"
        className="ghost-btn"
        disabled={busy !== null}
        onClick={async () => {
          setBusy('artwork')
          const removed = await api.artwork.clearCache()
          setBusy(null)
          setNote(`Removed ${removed} cached cover${removed === 1 ? '' : 's'}.`)
        }}
      >
        Clear
      </button>,
      'Delete cached cover images. They are re-fetched when needed.',
      'artwork thumbnails'
    ),
    row(
      'data',
      'clear-lyrics',
      'Clear lyrics cache',
      <button
        type="button"
        className="ghost-btn"
        disabled={busy !== null}
        onClick={async () => {
          setBusy('lyrics')
          const removed = await api.library.clearLyricsCache()
          setBusy(null)
          setNote(`Removed ${removed} cached lyrics file${removed === 1 ? '' : 's'}.`)
        }}
      >
        Clear
      </button>,
      'Delete downloaded lyrics. Imported .lrc files are kept.'
    ),
    row(
      'data',
      'reset-settings',
      'Reset all settings',
      <button
        type="button"
        className="danger-btn"
        disabled={busy !== null}
        onClick={async () => {
          setBusy('reset')
          await onResetSettings()
          setBusy(null)
          setNote('Settings restored to defaults.')
        }}
      >
        Reset
      </button>,
      'Restore every option on this page to its default value.',
      'factory default'
    ),

    // --- Help -------------------------------------------------------------
    row(
      'help',
      'shortcuts',
      'Keyboard shortcuts',
      <button type="button" className="ghost-btn" onClick={onOpenShortcuts}>
        <KeyboardIcon size={14} /> View
      </button>,
      'See everything you can trigger from the keyboard.'
    ),
    row(
      'help',
      'about',
      'About',
      <span className="settings__value">Lagu</span>,
      'A minimalist local music player. Source available on GitHub.',
      'version'
    )
  ]

  const q = query.trim().toLowerCase()
  const matches = (r: RowDef): boolean =>
    !q ||
    `${r.label} ${r.desc ?? ''} ${r.keywords ?? ''}`.toLowerCase().includes(q)

  const filtered = rows.filter(matches)
  const groups = q
    ? [{ id: 'results' as const, label: 'Results', icon: PaletteIcon, rows: filtered }]
    : CATEGORIES.map((category) => ({
        ...category,
        rows: rows.filter((r) => r.category === category.id)
      })).filter((group) => group.rows.length > 0)

  return (
    <div className="settings-view">
      <header className="browse__header settings-view__header">
        <h2 className="browse__title">Settings</h2>
        <div className="settings-view__search">
          <SearchBar
            value={query}
            placeholder="Search settings…"
            compact
            onChange={setQuery}
            onSubmit={() => undefined}
            onClear={() => setQuery('')}
          />
        </div>
      </header>

      <div className="settings-layout">
        {!q && (
          <nav className="settings-nav">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`settings-nav__item ${
                  active === category.id ? 'settings-nav__item--active' : ''
                }`}
                onClick={() => setActive(category.id)}
              >
                <category.icon size={15} />
                <span>{category.label}</span>
              </button>
            ))}
          </nav>
        )}

        <div className="settings-view__body">
          {note && (
            <div className="settings-note">
              {note}
              <button type="button" className="icon-btn" onClick={() => setNote('')}>
                ✕
              </button>
            </div>
          )}

          {page(groups, q, active)}
        </div>
      </div>
    </div>
  )
}

function page(
  groups: { id: string; label: string; icon: typeof PaletteIcon; rows: RowDef[] }[],
  searching: string,
  active: CategoryId
): ReactNode {
  const visible = searching
    ? groups
    : groups.filter((group) => group.id === active)

  if (visible.every((group) => group.rows.length === 0)) {
    return <div className="empty-state">No settings match your search.</div>
  }

  return visible.map((group) => (
    <section key={group.id} className="settings__section">
      <h3 className="settings__section-title">
        <group.icon size={13} /> {group.label}
      </h3>
      {group.rows.map((r) => (
        <div key={r.id} className="settings__row">
          <div className="settings__text">
            <div className="settings__label">{r.label}</div>
            {r.desc && <div className="settings__desc">{r.desc}</div>}
          </div>
          <div className="settings__control">{r.control}</div>
        </div>
      ))}
    </section>
  ))
}

function KeybindRecorder({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(false)
        return
      }
      onChange(normalizeKey(e.key))
      setRecording(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, onChange])

  return (
    <button
      type="button"
      className={`keybind ${recording ? 'keybind--recording' : ''}`}
      title="Click, then press a key"
      onClick={() => setRecording((v) => !v)}
    >
      {recording ? 'Press a key…' : keyLabel(value)}
    </button>
  )
}
