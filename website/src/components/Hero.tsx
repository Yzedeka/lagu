import { useMemo } from 'react'
import appIcon from '@/assets/app_icon.png'
import { APP, OS_LABEL, detectOs, downloadUrl, primaryFor, type Os } from '@/config'
import { useDownloads } from '@/lib/DownloadContext'
import { BigDownload, Counter } from './Download'
import { Slideshow } from './Slideshow'

const OTHERS: Os[] = ['windows', 'macos', 'linux']

export function Hero() {
  const os = useMemo(detectOs, [])
  const { register } = useDownloads()
  const others = OTHERS.filter((o) => o !== os)

  return (
    <header className="hero">
      <img className="hero__icon" src={appIcon} alt="Lagu" draggable={false} />

      <p className="hero__tagline">{APP.tagline}</p>

      <div className="badges">
        {APP.beta && <span className="badge badge--beta">Beta {APP.versionLabel}</span>}
        <span className="badge">Source available</span>
        <span className="badge">Offline-first</span>
      </div>

      <BigDownload />
      <Slideshow />
      <Counter />

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
    </header>
  )
}
