export const APP = {
  name: 'Lagu',
  version: '0.1.0',
  beta: true,
  repo: 'https://github.com/Yzedeka/lagu',
  releases: 'https://github.com/Yzedeka/lagu/releases',
  tagline: 'A minimalist, fast desktop music player for your local library.'
} as const

export type Os = 'windows' | 'macos' | 'linux'

export interface Download {
  os: Os
  label: string
  detail: string
  file: string
  /** Shown first for the detected platform. */
  primary?: boolean
}

export const DOWNLOADS: Download[] = [
  {
    os: 'windows',
    label: 'Windows',
    detail: 'Installer - Windows 10/11 (64-bit)',
    file: `Lagu-${APP.version}-setup.exe`,
    primary: true
  },
  {
    os: 'macos',
    label: 'macOS',
    detail: '.app bundle (Intel) - unsigned',
    file: `Lagu-${APP.version}-mac.zip`,
    primary: true
  },
  {
    os: 'linux',
    label: 'AppImage',
    detail: 'Portable - requires FUSE 2',
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
    label: 'Portable',
    detail: 'tar.gz - no FUSE needed',
    file: `lagu-music-player-${APP.version}.tar.gz`
  }
]

/**
 * Where the release files are hosted.
 *
 * By default this points at GitHub Releases for the repository. If the repo is
 * private, either make the release assets public or host them elsewhere (e.g. a
 * Cloudflare R2 bucket) and set VITE_DOWNLOAD_BASE at build time.
 */
export const DOWNLOAD_BASE: string =
  (import.meta.env.VITE_DOWNLOAD_BASE as string | undefined) ?? `${APP.releases}/latest/download`

export function downloadUrl(file: string): string {
  return `${DOWNLOAD_BASE.replace(/\/$/, '')}/${file}`
}

export function detectOs(): Os {
  if (typeof navigator === 'undefined') return 'linux'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac')) return 'macos'
  if (ua.includes('linux') || ua.includes('x11')) return 'linux'
  return 'linux'
}
