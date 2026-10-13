import { CloseIcon, KeyboardIcon } from '@renderer/icons'
import { KEYBIND_ACTIONS, keyLabel } from '@renderer/lib/keybinds'

interface ShortcutsOverlayProps {
  onClose: () => void
  bindings: Record<string, string>
}

interface Shortcut {
  keys: string[]
  label: string
}

const FIXED: { title: string; items: Shortcut[] }[] = [
  {
    title: 'Playback',
    items: [
      { keys: ['→'], label: 'Seek forward 5s' },
      { keys: ['←'], label: 'Seek back 5s' },
      { keys: ['↑'], label: 'Volume up' },
      { keys: ['↓'], label: 'Volume down' }
    ]
  },
  {
    title: 'Interface',
    items: [
      { keys: ['Ctrl', ','], label: 'Settings' },
      { keys: ['Ctrl', '='], label: 'Zoom in' },
      { keys: ['Ctrl', '−'], label: 'Zoom out' },
      { keys: ['Ctrl', '0'], label: 'Reset zoom' },
      { keys: ['Esc'], label: 'Exit fullscreen / close' }
    ]
  }
]

export function ShortcutsOverlay({ onClose, bindings }: ShortcutsOverlayProps) {
  const bound = (id: string): string[] => [keyLabel(bindings[id] ?? '')]

  const playback: Shortcut[] = [
    { keys: bound('playPause'), label: 'Play / pause' },
    { keys: bound('nextTrack'), label: 'Next track' },
    { keys: bound('prevTrack'), label: 'Previous track' },
    { keys: bound('mute'), label: 'Mute / unmute' },
    { keys: bound('shuffle'), label: 'Toggle shuffle' },
    { keys: bound('repeat'), label: 'Cycle repeat' }
  ]

  const iface: Shortcut[] = [
    { keys: bound('lyrics'), label: 'Toggle lyrics' },
    { keys: bound('queue'), label: 'Toggle queue' },
    { keys: bound('toggleSidebar'), label: 'Toggle sidebar' },
    { keys: bound('fullscreen'), label: 'Fullscreen' },
    { keys: bound('shortcuts'), label: 'This help' }
  ]

  const nav: Shortcut[] = [
    { keys: bound('goNowPlaying'), label: 'Now Playing' },
    { keys: bound('goLibrary'), label: 'Library' },
    { keys: bound('goAlbums'), label: 'Albums' },
    { keys: bound('goArtists'), label: 'Artists' },
    { keys: bound('goFolders'), label: 'Folders' }
  ]

  const groups: { title: string; items: Shortcut[] }[] = [
    { title: 'Playback', items: [...playback, ...FIXED[0].items] },
    { title: 'Interface', items: [...iface, ...FIXED[1].items] },
    { title: 'Navigation', items: nav }
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <span className="modal__title">
            <KeyboardIcon size={15} /> Keyboard shortcuts
          </span>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>
        <div className="modal__body">
          <p className="shortcuts__hint">
            Change these in Settings → Keybinds. {KEYBIND_ACTIONS.length} actions can be rebound.
          </p>
          <div className="shortcuts__grid">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="settings__section-title">{group.title}</h3>
                {group.items.map((item) => (
                  <div key={item.label} className="shortcut-row">
                    <span>
                      {item.keys.map((key, i) => (
                        <kbd key={`${key}-${i}`} className="kbd">
                          {key}
                        </kbd>
                      ))}
                    </span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
