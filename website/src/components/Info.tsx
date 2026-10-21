import { useEffect, useState } from 'react'
import appIcon from '@/assets/app_icon.png'
import wordmark from '@/assets/lagu-wordmark.png'
import { APP, DONATE_URL, REPO_URL, VERSIONS_REPO } from '@/config'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <div className="nav__inner">
        <a className="nav__brand" href="#/" aria-label={APP.name}>
          <img className="nav__icon" src={appIcon} alt="" draggable={false} />
          <img className="nav__wordmark" src={wordmark} alt={APP.name} draggable={false} />
        </a>
        <div className="nav__links">
          <a href="#/docs">Docs</a>
          <a href="#/download">Download</a>
          <a
            className="nav__donate"
            href={DONATE_URL}
            target="_blank"
            rel="noreferrer"
          >
            Donate
          </a>
        </div>
      </div>
    </nav>
  )
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Space'], label: 'Play / pause' },
  { keys: ['←', '→'], label: 'Seek 5s' },
  { keys: ['Ctrl', '←', '→'], label: 'Previous / next' },
  { keys: ['↑', '↓'], label: 'Volume' },
  { keys: ['M'], label: 'Mute' },
  { keys: ['S'], label: 'Shuffle' },
  { keys: ['R'], label: 'Repeat' },
  { keys: ['L'], label: 'Lyrics' },
  { keys: ['Q'], label: 'Queue' },
  { keys: ['B'], label: 'Sidebar' },
  { keys: ['F'], label: 'Fullscreen' },
  { keys: ['1', '2', '3', '4'], label: 'Library / Albums / Artists / Folders' },
  { keys: ['Ctrl', ','], label: 'Settings' },
  { keys: ['?'], label: 'Shortcut help' }
]

export function Shortcuts() {
  return (
    <section className="section">
      <h2 className="section__title">Keyboard shortcuts</h2>
      <div className="shortcuts">
        {SHORTCUTS.map((s) => (
          <div className="shortcut" key={s.label}>
            <span className="shortcut__keys">
              {s.keys.map((k) => (
                <kbd key={k}>{k}</kbd>
              ))}
            </span>
            <span className="shortcut__label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is Lagu free?',
    a: 'Yes. Lagu is free to download and use, and the source is available. Donations are optional and keep development going.'
  },
  {
    q: 'Do I need an account?',
    a: 'No. There is no sign-in and no cloud. Your account-less library stays on your own machine.'
  },
  {
    q: 'Which platforms does it run on?',
    a: 'Windows, macOS (Apple Silicon and Intel) and Linux - AppImage, .deb, .rpm, Flatpak, a portable tarball and an Arch package.'
  },
  {
    q: 'Can I download music with it?',
    a: 'Yes. Lagu searches YouTube through yt-dlp and can save single tracks or full playlists into your library, with a folder, format and quality you choose.'
  },
  {
    q: 'What audio formats work?',
    a: 'MP3, M4A/AAC, FLAC, OGG/Vorbis, Opus, WAV and more, plus remote stream URLs.'
  },
  {
    q: 'Will it change my music files?',
    a: 'Never. Lagu reads your files where they live; tags edits, covers and lyrics are stored separately in your Lagu folder.'
  },
  {
    q: 'Can I set it as my default music player?',
    a: 'Yes. Register Lagu as your default audio app and double-clicking a file opens it and starts playing.'
  }
]

export function Faq() {
  return (
    <section className="section">
      <h2 className="section__title">Frequently asked questions</h2>
      <div className="faq">
        {FAQ.map((item) => (
          <details className="faq__item" key={item.q}>
            <summary className="faq__q">{item.q}</summary>
            <p className="faq__a">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <img className="footer__wordmark" src={wordmark} alt={APP.name} draggable={false} />
          <p className="footer__tagline">
            A minimalist desktop player for your local music library. Your files, your machine.
          </p>
        </div>

        <nav className="footer__cols">
          <div className="footer__col">
            <span className="footer__col-title">Product</span>
            <a href="#/download">Download</a>
            <a href="#/linux">Linux builds</a>
            <a href="#/docs">Documentation</a>
          </div>
          <div className="footer__col">
            <span className="footer__col-title">Project</span>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              Source code
            </a>
            <a href={VERSIONS_REPO} target="_blank" rel="noreferrer">
              Version archive
            </a>
            <a href={DONATE_URL} target="_blank" rel="noreferrer">
              Donate
            </a>
          </div>
          <div className="footer__col">
            <span className="footer__col-title">Platforms</span>
            <span className="footer__muted">Windows · macOS · Linux</span>
            <span className="footer__muted">{APP.versionLabel} (beta)</span>
          </div>
        </nav>
      </div>

      <div className="footer__base">
        <span>
          {APP.name} {APP.versionLabel}
        </span>
        <span>Source-available · offline-first · not affiliated with any streaming service.</span>
      </div>
    </footer>
  )
}
