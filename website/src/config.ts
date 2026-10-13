export const APP = {
  name: 'Lagu',
  version: '0.2.2',
  /** Display label (the 'b' marks the beta). */
  versionLabel: 'v0.2.2b',
  beta: true,
  tagline: 'A minimalist desktop player for your local music library.'
} as const

export type Os = 'windows' | 'macos' | 'linux'

export interface Download {
  os: Os
  /** Format name shown in lists. */
  label: string
  file: string
  /** Size in bytes. */
  size: number
  /** Recommended build for that platform. */
  primary?: boolean
}

export const DOWNLOADS: Download[] = [
  {
    os: 'windows',
    label: 'Windows',
    file: `Lagu-${APP.version}-setup.exe`,
    size: 118295681,
    primary: true
  },
  {
    os: 'macos',
    label: 'macOS',
    file: `Lagu-${APP.version}-mac.zip`,
    size: 389155648,
    primary: true
  },
  {
    os: 'linux',
    label: 'AppImage',
    file: `Lagu-${APP.version}.AppImage`,
    size: 131472938,
    primary: true
  },
  {
    os: 'linux',
    label: 'Arch (pacman)',
    file: `lagu-${APP.version}-1-x86_64.pkg.tar.zst`,
    size: 123964099
  },
  {
    os: 'linux',
    label: '.deb',
    file: `lagu-music-player_${APP.version}_amd64.deb`,
    size: 105794344
  },
  {
    os: 'linux',
    label: '.rpm',
    file: `lagu-music-player-${APP.version}.x86_64.rpm`,
    size: 94588564
  },
  {
    os: 'linux',
    label: 'Portable tar.gz',
    file: `lagu-music-player-${APP.version}.tar.gz`,
    size: 125417586
  }
]

/** Archive of every released version (manifests + GitHub Releases). */
export const VERSIONS_REPO = 'https://github.com/Yzedeka/laguversions'

/** Files are served from the site itself (R2 in production). */
export const DOWNLOAD_BASE = '/downloads'

export function downloadUrl(file: string): string {
  return `${DOWNLOAD_BASE}/${file}`
}

/** Human-readable size, e.g. "113 MB". */
export function formatSize(bytes: number): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
}

export function primaryFor(os: Os): Download {
  return DOWNLOADS.find((d) => d.os === os && d.primary) ?? DOWNLOADS[0]
}

export function linuxDownloads(): Download[] {
  return DOWNLOADS.filter((d) => d.os === 'linux')
}

export const OS_LABEL: Record<Os, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux'
}

export function detectOs(): Os {
  if (typeof navigator === 'undefined') return 'linux'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac')) return 'macos'
  return 'linux'
}
