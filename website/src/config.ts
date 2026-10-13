export const APP = {
  name: 'Lagu',
  version: '0.1.0',
  /** Display label (the 'b' marks the beta). */
  versionLabel: 'v0.1.0b',
  beta: true,
  tagline: 'A minimalist desktop player for your local music library.'
} as const

export type Os = 'windows' | 'macos' | 'linux'

export interface Download {
  os: Os
  /** Short name shown on the button/row. */
  label: string
  detail: string
  file: string
  /** Recommended build for that platform. */
  primary?: boolean
}

export const DOWNLOADS: Download[] = [
  {
    os: 'windows',
    label: 'Windows',
    detail: 'Installer - Windows 10/11, 64-bit',
    file: `Lagu-${APP.version}-setup.exe`,
    primary: true
  },
  {
    os: 'macos',
    label: 'macOS',
    detail: '.app bundle - Intel, unsigned',
    file: `Lagu-${APP.version}-mac.zip`,
    primary: true
  },
  {
    os: 'linux',
    label: 'AppImage',
    detail: 'Portable - needs FUSE 2',
    file: `Lagu-${APP.version}.AppImage`,
    primary: true
  },
  {
    os: 'linux',
    label: '.deb',
    detail: 'Debian, Ubuntu, Mint',
    file: `lagu-music-player_${APP.version}_amd64.deb`
  },
  {
    os: 'linux',
    label: '.rpm',
    detail: 'Fedora, RHEL, openSUSE',
    file: `lagu-music-player-${APP.version}.x86_64.rpm`
  },
  {
    os: 'linux',
    label: 'Flatpak',
    detail: 'Sandboxed bundle',
    file: `Lagu-${APP.version}.flatpak`
  },
  {
    os: 'linux',
    label: 'Portable tar.gz',
    detail: 'For systems without FUSE 2',
    file: `lagu-music-player-${APP.version}.tar.gz`
  }
]

/** Files are served from the site itself (R2 in production). */
export const DOWNLOAD_BASE = '/downloads'

export function downloadUrl(file: string): string {
  return `${DOWNLOAD_BASE}/${file}`
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
