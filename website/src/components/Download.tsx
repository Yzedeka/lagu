import { useMemo } from 'react'
import { APP, OS_LABEL, detectOs, downloadUrl, formatSize, primaryFor } from '@/config'
import { useDownloads, formatCount } from '@/lib/DownloadContext'
import { AppleIcon, DownloadIcon, LinuxIcon, WindowsIcon } from '@/icons'

const OS_ICON = { windows: WindowsIcon, macos: AppleIcon, linux: LinuxIcon } as const

/** The big call-to-action: one button, tailored to the visitor's platform. */
export function BigDownload() {
  const os = useMemo(detectOs, [])
  const { register } = useDownloads()
  const Icon = OS_ICON[os]
  const primary = primaryFor(os)

  if (os === 'linux') {
    return (
      <a className="big-dl" href="#/linux">
        <Icon size={22} />
        <span className="big-dl__text">
          <span className="big-dl__label">Download for Linux</span>
        </span>
        <DownloadIcon size={20} />
      </a>
    )
  }

  return (
    <a
      className="big-dl"
      href={downloadUrl(primary.file)}
      download={primary.file}
      onClick={() => void register(primary.file)}
    >
      <Icon size={22} />
      <span className="big-dl__text">
        <span className="big-dl__label">Download for {OS_LABEL[os]}</span>
        <span className="big-dl__detail">{formatSize(primary.size)}</span>
      </span>
      <DownloadIcon size={20} />
    </a>
  )
}

export function Counter({ hint = true }: { hint?: boolean }) {
  const { count, limited } = useDownloads()
  return (
    <>
      <div className="counter" aria-live="polite">
        <strong>{formatCount(count)}</strong>
        <span>downloads</span>
      </div>
      {hint && (
        <p className="counter__hint">
          {limited ? 'One download is counted every 5 seconds.' : APP.versionLabel}
        </p>
      )}
    </>
  )
}
