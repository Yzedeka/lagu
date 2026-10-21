import { useEffect, useMemo, useState } from 'react'
import { APP, OS_LABEL, detectOs, downloadUrl, primaryFor, type Os } from '@/config'
import { useDownloads } from '@/lib/DownloadContext'
import { BigDownload, Counter } from './Download'

const OTHERS: Os[] = ['windows', 'macos', 'linux']

const PREVIEWS = [
  { src: '/screenshots/now-playing.png', label: 'Now Playing' },
  { src: '/screenshots/library.png', label: 'Library' },
  { src: '/screenshots/albums.png', label: 'Albums' },
  { src: '/screenshots/artists.png', label: 'Artists' },
  { src: '/screenshots/playlists.png', label: 'Playlists' },
  { src: '/screenshots/settings.png', label: 'Settings' }
]

const INTERVAL = 5000

export function Hero() {
  const os = useMemo(detectOs, [])
  const { register } = useDownloads()
  const others = OTHERS.filter((o) => o !== os)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => setIndex((v) => (v + 1) % PREVIEWS.length), INTERVAL)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <header className="hero">
      <div className="hero__copy">
        <h1 className="hero__title">{APP.name} Music Player</h1>
        <p className="hero__tagline">{APP.tagline}</p>

        <div className="hero__actions">
          <BigDownload />
        </div>

        <div className="hero__meta">
          <Counter />
        </div>

        <p className="hero__others">
          Also for{' '}
          {others.map((o, i) => (
            <span key={o}>
              {i > 0 && ' and '}
              <a
                href={downloadUrl(primaryFor(o).file)}
                download={primaryFor(o).file}
                onClick={() => void register()}
              >
                {OS_LABEL[o]}
              </a>
            </span>
          ))}
          .
        </p>
      </div>

      <div
        className="hero__visual"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="hero__shot">
          {PREVIEWS.map((preview, i) => (
            <img
              key={preview.src}
              className={i === index ? 'is-active' : ''}
              src={preview.src}
              alt={preview.label}
              draggable={false}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
        <div className="hero__dots">
          {PREVIEWS.map((preview, i) => (
            <button
              key={preview.src}
              type="button"
              className={i === index ? 'is-active' : ''}
              aria-label={preview.label}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </header>
  )
}
