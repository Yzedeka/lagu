import {
  AppleIcon,
  CodeIcon,
  FolderIcon,
  LinuxIcon,
  ShieldIcon,
  WindowsIcon,
  WifiIcon
} from '@/icons'
import { APP } from '@/config'

export function Platforms() {
  return (
    <section className="section section--alt" id="platforms">
      <h2 className="section__title">Every platform, one small download</h2>
      <p className="section__lead">Installers and portable builds for the desktop you actually use.</p>

      <div className="platforms">
        <article className="platform">
          <span className="platform__icon">
            <WindowsIcon size={22} />
          </span>
          <h3>Windows</h3>
          <p>A standard installer for Windows 10 and 11 (64-bit).</p>
        </article>
        <article className="platform">
          <span className="platform__icon">
            <AppleIcon size={22} />
          </span>
          <h3>macOS</h3>
          <p>A .app bundle for Intel Macs. Unsigned, so right-click and Open the first time.</p>
        </article>
        <article className="platform">
          <span className="platform__icon">
            <LinuxIcon size={22} />
          </span>
          <h3>Linux</h3>
          <p>AppImage, .deb, .rpm, Flatpak and a portable tarball for distros without FUSE 2.</p>
        </article>
      </div>

      <div className="note">
        <ShieldIcon size={15} />
        <p>
          Cross-built Windows and macOS builds are <strong>unsigned</strong> - your OS will warn you
          the first time. Signing lands in a later beta.
        </p>
      </div>
    </section>
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
  { keys: ['Ctrl', '+'], label: 'Zoom' },
  { keys: ['?'], label: 'Shortcut help' }
]

export function Shortcuts() {
  return (
    <section className="section" id="shortcuts">
      <h2 className="section__title">Built for the keyboard</h2>
      <p className="section__lead">Press ? in the app for the full list.</p>
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

export function Principles() {
  return (
    <section className="section section--alt" id="privacy">
      <h2 className="section__title">Yours, quietly</h2>
      <div className="principles">
        <article className="principle">
          <span className="principle__icon">
            <FolderIcon size={18} />
          </span>
          <h3>Your files stay yours</h3>
          <p>
            Lagu never moves, renames or rewrites your music. Edits, lyrics and settings live in a
            single readable folder you can copy or delete.
          </p>
        </article>
        <article className="principle">
          <span className="principle__icon">
            <WifiIcon size={18} />
          </span>
          <h3>Nothing leaves by default</h3>
          <p>
            The app works fully offline. Online cover and lyric lookups are opt-in, use keyless
            public APIs, and are off until you turn them on.
          </p>
        </article>
        <article className="principle">
          <span className="principle__icon">
            <CodeIcon size={18} />
          </span>
          <h3>Open and hackable</h3>
          <p>
            TypeScript end to end, a typed bridge between the UI and the OS, and every icon in one
            folder meant to be swapped.
          </p>
        </article>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__left">
        <span>
          {APP.name} {APP.version}
        </span>
        <span className="footer__dot">-</span>
        <span>MIT licensed</span>
        <span className="footer__dot">-</span>
        <span>Still in beta</span>
      </div>
      <div className="footer__links">
        <a href={APP.repo} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <a href={APP.releases} target="_blank" rel="noopener noreferrer">
          Releases
        </a>
        <a href="#download">Download</a>
      </div>
    </footer>
  )
}
