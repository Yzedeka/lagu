import type { AppSettings } from '@shared/types'

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
  theme: 'dark',
  accentMode: 'artwork',
  accentColor: '#7d97b8',
  radius: 3,
  density: 'comfortable',
  animations: true,
  crossfade: 4,
  eightD: false,
  autoLyrics: false,
  lyricsOffset: 0,
  sidebarWidth: 212,
  fetchArtworkOnline: false,
  albumSort: 'artist',
  albumSortDesc: false,
  zoom: 0
}

export const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: 'Steel', value: '#7d97b8' },
  { name: 'Amber', value: '#d99a4e' },
  { name: 'Moss', value: '#6fae7f' },
  { name: 'Rose', value: '#cf7d92' },
  { name: 'Violet', value: '#9b8bd0' },
  { name: 'Cyan', value: '#5fb3b3' }
]
