const KEY = 'lagu.artistBios'

type BioMap = Record<string, string>

function read(): BioMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as BioMap) : {}
  } catch {
    return {}
  }
}

export function getArtistBios(): BioMap {
  return read()
}

export function getArtistBio(name: string): string {
  return read()[name] ?? ''
}

export function setArtistBio(name: string, text: string): string {
  const map = read()
  const trimmed = text.trim()
  if (trimmed) map[name] = trimmed
  else delete map[name]
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable */
  }
  return trimmed
}
