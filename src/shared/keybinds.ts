/**
 * Default keyboard bindings. Values are `KeyboardEvent.key` strings
 * (lower-cased for single characters; ' ' means the space bar).
 * Users can rebind these from Settings; the app looks up the action by key.
 */
export const DEFAULT_KEYBINDINGS: Record<string, string> = {
  playPause: ' ',
  nextTrack: 'n',
  prevTrack: 'p',
  mute: 'm',
  shuffle: 's',
  repeat: 'r',
  lyrics: 'l',
  queue: 'q',
  toggleSidebar: 'b',
  fullscreen: 'f',
  goNowPlaying: '0',
  goLibrary: '1',
  goAlbums: '2',
  goArtists: '3',
  goFolders: '4',
  shortcuts: '?'
}

export const KEYBIND_IDS = Object.keys(DEFAULT_KEYBINDINGS)

/** Canonical form for comparing/storing a key. */
export function normalizeKey(key: string): string {
  if (key === 'Spacebar' || key === 'Space') return ' '
  if (key.length === 1) return key.toLowerCase()
  return key
}
