import appIconUrl from '@renderer/icons/app_icon.png'
import { CheckIcon } from '@renderer/icons'
import { useUpdater } from '@renderer/state/useUpdater'

/** Full-window screen shown while the app is updating itself. */
export function UpdateScreen() {
  const status = useUpdater()

  const visible =
    status.phase === 'checking' ||
    status.phase === 'available' ||
    status.phase === 'downloading' ||
    status.phase === 'ready'
  if (!visible) return null

  const ready = status.phase === 'ready'
  const percent = status.percent ?? 0

  return (
    <div className="update-screen">
      <div className="update-screen__card">
        <img className="update-screen__icon" src={appIconUrl} alt="" draggable={false} />

        <div className="update-screen__title">{ready ? 'Update ready' : 'Updating Lagu'}</div>

        <div className="update-screen__sub">
          {status.phase === 'checking'
            ? 'Checking for updates…'
            : ready
              ? `Version ${status.version} is ready to install.`
              : status.version
                ? `Downloading version ${status.version}…`
                : 'Downloading…'}
        </div>

        {!ready && (
          <div className={`update-screen__bar ${status.phase === 'downloading' ? '' : 'is-indeterminate'}`}>
            <span style={status.phase === 'downloading' ? { width: `${percent}%` } : undefined} />
          </div>
        )}

        {status.phase === 'downloading' && (
          <div className="update-screen__percent">{percent}%</div>
        )}

        {ready && (
          <button
            type="button"
            className="primary-btn update-screen__action"
            onClick={() => void window.lagu.update.install()}
          >
            <CheckIcon size={15} /> Restart and update
          </button>
        )}
      </div>
    </div>
  )
}
