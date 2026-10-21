export * from './releases'
import { DOWNLOADS, type Download, type Os } from './releases'

/** Archive of every released version (manifests + GitHub Releases). */
export const VERSIONS_REPO = 'https://github.com/Yzedeka/laguversions'

/** Main source repository. */
export const REPO_URL = 'https://github.com/Yzedeka/lagu'

/** Where the Donate button points. */
export const DONATE_URL = 'https://github.com/sponsors/Yzedeka'

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
