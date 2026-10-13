import { DEFAULT_KEYBINDINGS } from '@shared/keybinds'

export { normalizeKey } from '@shared/keybinds'

export interface KeybindAction {
  id: string
  label: string
  group: string
}

/** Every rebindable action, in the order they appear in Settings. */
export const KEYBIND_ACTIONS: KeybindAction[] = [
  { id: 'playPause', label: 'Play / pause', group: 'Playback' },
  { id: 'nextTrack', label: 'Next track', group: 'Playback' },
  { id: 'prevTrack', label: 'Previous track', group: 'Playback' },
  { id: 'mute', label: 'Mute / unmute', group: 'Playback' },
  { id: 'shuffle', label: 'Toggle shuffle', group: 'Playback' },
  { id: 'repeat', label: 'Cycle repeat', group: 'Playback' },
  { id: 'lyrics', label: 'Toggle lyrics', group: 'Interface' },
  { id: 'queue', label: 'Toggle queue', group: 'Interface' },
  { id: 'toggleSidebar', label: 'Toggle sidebar', group: 'Interface' },
  { id: 'fullscreen', label: 'Fullscreen', group: 'Interface' },
  { id: 'shortcuts', label: 'Shortcuts help', group: 'Interface' },
  { id: 'goNowPlaying', label: 'Go to Now Playing', group: 'Navigation' },
  { id: 'goLibrary', label: 'Go to Library', group: 'Navigation' },
  { id: 'goAlbums', label: 'Go to Albums', group: 'Navigation' },
  { id: 'goArtists', label: 'Go to Artists', group: 'Navigation' },
  { id: 'goFolders', label: 'Go to Folders', group: 'Navigation' }
]

export function defaultBindings(): Record<string, string> {
  return { ...DEFAULT_KEYBINDINGS }
}

const KEY_NAMES: Record<string, string> = {
  ' ': 'Space',
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Escape: 'Esc',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: '⌫',
  Delete: 'Del'
}

/** Human-readable label for a stored key value. */
export function keyLabel(key: string): string {
  if (!key) return 'Unset'
  if (KEY_NAMES[key]) return KEY_NAMES[key]
  if (key.startsWith('Arrow')) return key.slice(5)
  if (key.length === 1) return key.toUpperCase()
  return key
}
