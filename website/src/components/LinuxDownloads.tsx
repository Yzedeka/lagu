import { APP, downloadUrl, formatSize, linuxDownloads } from '@/config'
import { useDownloads, formatCount } from '@/lib/DownloadContext'
import { ChevronLeftIcon, DownloadIcon, LinuxIcon, TerminalIcon } from '@/icons'
import { Counter } from './Download'

export function LinuxDownloads() {
  const { register, files } = useDownloads()
  const formats = linuxDownloads()
  const origin = typeof location === 'undefined' ? '' : location.origin
  const installCmd = `curl -fsSL ${origin}/install.sh | sh`

  return (
    <section className="page-section">
      <a className="back" href="#/">
        <ChevronLeftIcon size={16} /> Back
      </a>

      <h1 className="page-title">
        <LinuxIcon size={24} /> Lagu for Linux
      </h1>
      <p className="page-lead">
        Every Linux build of {APP.name} {APP.versionLabel}
        {APP.beta ? ' (beta)' : ''}.
      </p>

      <div className="install-card">
        <div className="install-card__head">
          <TerminalIcon size={15} /> Automatic install
        </div>
        <p className="install-card__note">
          Installs FUSE 2 for you if it is missing, then downloads and sets up the AppImage.
        </p>
        <code className="install-card__cmd">{installCmd}</code>
      </div>

      <ul className="fmt-list">
        {formats.map((format) => (
          <li key={format.file}>
            <a
              className="fmt-row"
              href={downloadUrl(format.file)}
              download={format.file}
              onClick={() => void register(format.file)}
            >
              <span className="fmt-row__text">
                <span className="fmt-row__label">
                  {format.file}
                  {format.primary && <em className="fmt-row__tag">recommended</em>}
                </span>
              </span>
              <span className="fmt-row__size">{formatSize(format.size)}</span>
              <span className="fmt-row__count">{formatCount(files[format.file] ?? 0)}</span>
              <DownloadIcon size={18} />
            </a>
          </li>
        ))}
      </ul>

      <div className="fmt-note">
        <p>The AppImage needs FUSE 2. On Arch: fuse2, Debian/Ubuntu: libfuse2, Fedora: fuse-libs.</p>
        <p>If you would rather not install it, use the portable tar.gz above.</p>
      </div>

      <Counter hint={false} />
    </section>
  )
}
