import { CloseIcon, KeyboardIcon } from '@renderer/icons'

interface ShortcutsOverlayProps {
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  label: string
}

const GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'Playback',
    items: [
      { keys: ['Space'], label: 'Play / pause' },
      { keys: ['→'], label: 'Seek forward 5s' },
      { keys: ['←'], label: 'Seek back 5s' },
      { keys: ['Ctrl', '→'], label: 'Next track' },
      { keys: ['Ctrl', '←'], label: 'Previous track' },
      { keys: ['↑'], label: 'Volume up' },
      { keys: ['↓'], label: 'Volume down' },
      { keys: ['M'], label: 'Mute / unmute' },
      { keys: ['S'], label: 'Toggle shuffle' },
      { keys: ['R'], label: 'Cycle repeat' }
    ]
  },
  {
    title: 'Interface',
    items: [
      { keys: ['L'], label: 'Toggle lyrics' },
      { keys: ['Q'], label: 'Toggle queue' },
      { keys: ['B'], label: 'Toggle sidebar' },
      { keys: ['F'], label: 'Fullscreen now playing' },
      { keys: ['0'], label: 'Now Playing' },
      { keys: ['1'], label: 'Library' },
      { keys: ['2'], label: 'Albums' },
      { keys: ['3'], label: 'Artists' },
      { keys: ['4'], label: 'Folders' },
      { keys: ['Ctrl', ','], label: 'Settings' },
      { keys: ['Ctrl', '='], label: 'Zoom in' },
      { keys: ['Ctrl', '−'], label: 'Zoom out' },
      { keys: ['Ctrl', '0'], label: 'Reset zoom' },
      { keys: ['?'], label: 'This help' },
      { keys: ['Esc'], label: 'Exit fullscreen / close' }
    ]
  }
]

export function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps) {
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
          <div className="shortcuts__grid">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="settings__section-title">{group.title}</h3>
                {group.items.map((item) => (
                  <div key={item.label} className="shortcut-row">
                    <span>
                      {item.keys.map((key) => (
                        <kbd key={key} className="kbd">
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
