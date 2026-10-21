import { useMemo } from 'react'
import { APP, OS_LABEL, detectOs, downloadUrl, primaryFor, type Os } from '@/config'
import { useDownloads } from '@/lib/DownloadContext'
import { BigDownload, Counter } from './Download'

const OTHERS: Os[] = ['windows', 'macos', 'linux']

export function Hero() {
  const os = useMemo(detectOs, [])
  const { register } = useDownloads()
  const others = OTHERS.filter((o) => o !== os)

  return (
    <header className="hero">
      <div className="hero__copy">
        <p className="eyebrow">
          <span className="eyebrow__dot" />
          Local music player
          <span className="eyebrow__sep">/</span>
          {APP.versionLabel} beta
        </p>

        <h1 className="hero__title">
          Your music.
          <br />
          Your machine.
        </h1>

        <p className="hero__tagline">
          A fast, quiet desktop player for the library you already own. Artwork-driven
          colour, a real queue, synchronized lyrics and no cloud in the middle.
        </p>

        <div className="hero__actions">
          <BigDownload />
          <a className="text-link" href="#/docs">
            Read the docs <span aria-hidden>→</span>
          </a>
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

      <figure className="hero__visual">
        <div className="hero__shot">
          <img src="/screenshots/albums.png" alt="Lagu album grid" draggable={false} />
        </div>
        <figcaption>
          <span>Albums</span>
          <span>3D covers · artwork accent</span>
        </figcaption>
      </figure>
    </header>
  )
}
