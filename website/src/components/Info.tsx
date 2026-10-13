import { useEffect, useState } from 'react'
import wordmark from '@/assets/lagu-wordmark.png'
import { APP } from '@/config'

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
          <img className="nav__wordmark" src={wordmark} alt={APP.name} draggable={false} />
        </a>
        <div className="nav__links">
          <a href="#/docs">Docs</a>
          <a className="nav__cta" href="#/download">
            Download
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

export function Footer() {
  return (
    <footer className="footer">
      <span>
        {APP.name} {APP.versionLabel}
      </span>
      <div className="footer__links">
        <a href="#/">Download</a>
        <a href="#/docs">Docs</a>
      </div>
    </footer>
  )
}
