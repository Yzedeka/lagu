import appIcon from '@/assets/lagu-frame-rounded.png'
import wordmark from '@/assets/lagu-wordmark.png'
import { APP } from '@/config'
import { CodeIcon, ShieldIcon, WifiIcon } from '@/icons'
import { DownloadPanel } from './DownloadPanel'

export function Hero() {
  return (
    <header className="hero">
      <div className="hero__brand">
        <img className="hero__icon" src={appIcon} alt="" draggable={false} />
        <img className="hero__wordmark" src={wordmark} alt="Lagu" draggable={false} />
      </div>

      <h1 className="hero__title">Your music, minus the noise.</h1>
      <p className="hero__tagline">
        {APP.tagline} Artwork drives the interface, the queue behaves, and your files are never
        touched.
      </p>

      <div className="badges">
        {APP.beta && <span className="badge badge--beta">Beta {APP.version}</span>}
        <span className="badge">
          <CodeIcon size={13} /> Open source
        </span>
        <span className="badge">
          <WifiIcon size={13} /> Offline-first
        </span>
        <span className="badge">
          <ShieldIcon size={13} /> Files untouched
        </span>
      </div>

      <DownloadPanel />
    </header>
  )
}
