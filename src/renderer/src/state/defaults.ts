import type { AppSettings } from '@shared/types'
import { DEFAULT_KEYBINDINGS } from '@shared/keybinds'

/** Mirrors the main process defaults; used before persisted settings load. */
export const defaultSettings: AppSettings = {
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',
  visualizer: true,
  showSidebar: true,
  showQueue: true,
  showLyrics: false,
  theme: 'black',
  accentMode: 'artwork',
  accentColor: '#7d97b8',
  radius: 5,
  fontFamily: '',
  density: 'comfortable',
  animations: true,
  crossfade: 4,
  eightD: false,
  autoLyrics: true,
  lyricsOffset: 0,
  sidebarWidth: 212,
  queueWidth: 300,
  fetchArtworkOnline: true,
  albumSort: 'artist',
  albumSortDesc: false,
  zoom: 1,
  lyricsFontSize: 20,
  lyricsAlign: 'center',
  showTrackNumbers: true,
  scanOnStartup: true,
  keybindings: { ...DEFAULT_KEYBINDINGS },
  performanceMode: false,
  queueMode: 'normal',
  cover3d: false,
  discordRpc: false,
  discordClientId: ''
}

export const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: 'Steel', value: '#7d97b8' },
  { name: 'Amber', value: '#d99a4e' },
  { name: 'Moss', value: '#6fae7f' },
  { name: 'Rose', value: '#cf7d92' },
  { name: 'Violet', value: '#9b8bd0' },
  { name: 'Cyan', value: '#5fb3b3' }
]
