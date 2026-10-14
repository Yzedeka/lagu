export interface MobilePlaylist {
  id: string
  name: string
  trackIds: string[]
  /** Object URL for a custom cover, when the user set one. */
  cover?: string
}

const KEY = 'lagu.playlists'

export function getPlaylists(): MobilePlaylist[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as MobilePlaylist[]) : []
  } catch {
    return []
  }
}

export function savePlaylists(playlists: MobilePlaylist[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(playlists))
  } catch {
    /* storage unavailable */
  }
}

export function newPlaylistId(): string {
  return `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export interface MobileSettings {
  discMode: boolean
  covers3d: boolean
}

const SETTINGS_KEY = 'lagu.settings'

export function getSettings(): MobileSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { discMode: false, covers3d: false }
    const parsed = JSON.parse(raw) as Partial<MobileSettings>
    return { discMode: Boolean(parsed.discMode), covers3d: Boolean(parsed.covers3d) }
  } catch {
    return { discMode: false, covers3d: false }
  }
}

export function saveSettings(settings: MobileSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* storage unavailable */
  }
}
