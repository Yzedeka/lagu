import { useMemo } from 'react'
import {
  AppleIcon,
  CloudDownloadIcon,
  DownloadIcon,
  LinuxIcon,
  MusicIcon,
  VerifiedIcon,
  WindowsIcon
} from '@/icons'
import { DOWNLOADS, detectOs, downloadUrl, type Download, type Os } from '@/config'
import { useDownloadCount } from '@/lib/useDownloads'

const OS_ORDER: Os[] = ['windows', 'macos', 'linux']

const OS_META: Record<Os, { label: string; icon: typeof WindowsIcon }> = {
  windows: { label: 'Windows', icon: WindowsIcon },
  macos: { label: 'macOS', icon: AppleIcon },
  linux: { label: 'Linux', icon: LinuxIcon }
}

function formatCount(value: number | null): string {
  if (value == null) return '-'
  return value.toLocaleString('en-US')
}

export function DownloadPanel() {
  const { count, register, limited } = useDownloadCount()
  const detected = useMemo(detectOs, [])

  // One recommended download per OS, detected platform first.
  const perOs = useMemo(() => {
    const map = new Map<Os, Download>()
    for (const os of OS_ORDER) {
      const entry = DOWNLOADS.find((d) => d.os === os && d.primary)
      if (entry) map.set(os, entry)
    }
    return map
  }, [])

  const ordered = useMemo(
    () => [...OS_ORDER].sort((a, b) => (a === detected ? -1 : b === detected ? 1 : 0)),
    [detected]
  )

  const extras = DOWNLOADS.filter((d) => !d.primary)

  return (
    <section className="downloads" id="download">
      <div className="downloads__primary">
        {ordered.map((os) => {
          const entry = perOs.get(os)
          if (!entry) return null
          const { label, icon: Icon } = OS_META[os]
          return (
            <a
              key={os}
              className={`dl-btn ${os === detected ? 'dl-btn--primary' : 'dl-btn--secondary'}`}
              href={downloadUrl(entry.file)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void register()}
            >
              <Icon size={18} />
              <span className="dl-btn__text">
                <span className="dl-btn__label">
                  Download for {label}
                  {os === detected && <em className="dl-btn__tag">recommended</em>}
                </span>
                <span className="dl-btn__detail">{entry.detail}</span>
              </span>
            </a>
          )
        })}
      </div>

      <div className="counter" aria-live="polite">
        <VerifiedIcon size={15} />
        <strong>{formatCount(count)}</strong>
        <span>downloads so far</span>
      </div>
      <p className="downloads__hint">
        {limited
          ? 'Thanks! Only one download is counted every 5 seconds.'
          : 'Every download helps - thank you for trying Lagu.'}
      </p>

      <div className="downloads__others">
        <div className="downloads__others-title">
          <CloudDownloadIcon size={15} /> More Linux packages
        </div>
        <ul className="dl-list">
          {extras.map((d) => {
            const Icon = OS_META[d.os].icon
            return (
              <li key={d.file}>
                <a
                  className="dl-row"
                  href={downloadUrl(d.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void register()}
                >
                  <Icon size={16} />
                  <span className="dl-row__label">{d.label}</span>
                  <span className="dl-row__detail">{d.detail}</span>
                  <DownloadIcon size={15} />
                </a>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="downloads__note">
        <MusicIcon size={13} /> Lagu is <strong>free and open source</strong> and still in{' '}
        <strong>beta</strong> - expect rough edges.
      </p>
    </section>
  )
}
