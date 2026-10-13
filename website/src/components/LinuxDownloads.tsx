import { APP, downloadUrl, linuxDownloads } from '@/config'
import { useDownloads, formatCount } from '@/lib/DownloadContext'
import { ChevronLeftIcon, DownloadIcon, LinuxIcon } from '@/icons'
import { Counter } from './Download'

export function LinuxDownloads() {
  const { register, files } = useDownloads()
  const formats = linuxDownloads()

  return (
    <section className="page-section">
      <a className="back" href="#/">
        <ChevronLeftIcon size={16} /> Back
      </a>

      <h1 className="page-title">
        <LinuxIcon size={26} /> Lagu for Linux
      </h1>
      <p className="page-lead">
        Pick the package for your distribution. Version {APP.version}
        {APP.beta ? ' (beta)' : ''}.
      </p>

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
                <span className="fmt-row__label">{format.label}</span>
                <span className="fmt-row__detail">{format.detail}</span>
              </span>
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
