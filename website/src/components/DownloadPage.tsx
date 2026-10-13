import { APP, DOWNLOADS, OS_LABEL, VERSIONS_REPO, downloadUrl, formatSize, type Os } from '@/config'
import { useDownloads, formatCount } from '@/lib/DownloadContext'
import { ChevronLeftIcon, DownloadIcon, HistoryIcon, MusicIcon } from '@/icons'
import { Counter } from './Download'

const ORDER: Os[] = ['windows', 'macos', 'linux']

export function DownloadPage() {
  const { register, files } = useDownloads()

  return (
    <section className="page-section">
      <a className="back" href="#/">
        <ChevronLeftIcon size={16} /> Back
      </a>

      <h1 className="page-title">Download Lagu</h1>
      <p className="page-lead">
        Every build of {APP.name} {APP.versionLabel}
        {APP.beta ? ' (beta)' : ''}.
      </p>

      {ORDER.map((os) => {
        const items = DOWNLOADS.filter((d) => d.os === os)
        if (items.length === 0) return null
        return (
          <div className="dl-group" key={os}>
            <h2 className="dl-group__title">{OS_LABEL[os]}</h2>
            <ul className="fmt-list">
              {items.map((item) => (
                <li key={item.file}>
                  <a
                    className="fmt-row"
                    href={downloadUrl(item.file)}
                    download={item.file}
                    onClick={() => void register(item.file)}
                  >
                    <span className="fmt-row__text">
                      <span className="fmt-row__label">
                        {item.file}
                        {item.primary && <em className="fmt-row__tag">recommended</em>}
                      </span>
                    </span>
                    <span className="fmt-row__size">{formatSize(item.size)}</span>
                    <span className="fmt-row__count">{formatCount(files[item.file] ?? 0)}</span>
                    <DownloadIcon size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      <p className="dl-foot">
        <MusicIcon size={13} /> Free, source available, and still in beta.
      </p>
      <p className="dl-foot">
        <HistoryIcon size={13} /> Every past version is archived at{' '}
        <a href={VERSIONS_REPO} target="_blank" rel="noopener noreferrer">
          Yzedeka/laguversions
        </a>
        .
      </p>

      <Counter hint={false} />
    </section>
  )
}
