/**
 * Release metadata shared by the site and its Pages Functions (which use the
 * file list as the download-counter allowlist), so keep this free of DOM APIs.
 */
export const APP = {
  name: 'Lagu',
  version: '0.4.1',
  /** Display label (the 'b' marks the beta). */
  versionLabel: 'b0.4.1',
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
    size: 157803888,
    primary: true
  },
  {
    os: 'macos',
    label: 'macOS (Apple Silicon)',
    file: `Lagu-${APP.version}-mac-arm64.zip`,
    size: 458164811,
    primary: true
  },
  {
    os: 'macos',
    label: 'macOS (Intel)',
    file: `Lagu-${APP.version}-mac-x64.zip`,
    size: 469515729
  },
  {
    os: 'linux',
    label: 'AppImage',
    file: `Lagu-${APP.version}.AppImage`,
    size: 201871232,
    primary: true
  },
  {
    os: 'linux',
    label: 'Flatpak',
    file: `Lagu-${APP.version}.flatpak`,
    size: 157232928
  },
  {
    os: 'linux',
    label: 'Arch (pacman)',
    file: `lagu-${APP.version}-1-x86_64.pkg.tar.zst`,
    size: 192938868
  },
  {
    os: 'linux',
    label: '.deb',
    file: `lagu-music-player_${APP.version}_amd64.deb`,
    size: 169919992
  },
  {
    os: 'linux',
    label: '.rpm',
    file: `lagu-music-player-${APP.version}.x86_64.rpm`,
    size: 155665298
  },
  {
    os: 'linux',
    label: 'Portable tar.gz',
    file: `lagu-music-player-${APP.version}.tar.gz`,
    size: 194214043
  }
]
