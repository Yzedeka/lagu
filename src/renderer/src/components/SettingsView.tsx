import { useEffect, useState, type ReactNode } from 'react'
import type { AppSettings, ThemeMode } from '@shared/types'
import { ACCENT_PRESETS } from '@renderer/state/defaults'
import {
  AnimationIcon,
  CloudDownloadIcon,
  FolderIcon,
  GraphicEqIcon,
  ImageIcon,
  KeyboardIcon,
  LibraryIcon,
  LyricsIcon,
  PaletteIcon,
  ZoomInIcon,
  ZoomOutIcon
} from '@renderer/icons'
import { Range } from './Range'

interface SettingsViewProps {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  zoom: number
  onZoom: (delta: number) => void
  onResetZoom: () => void
  onOpenShortcuts: () => void
  trackCount: number
  artworkProgress: { done: number; total: number } | null
  onFetchMissingArtwork: () => void
  hiddenCount: number
  onRestoreHidden: () => void
}

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'grey', label: 'Grey' },
  { id: 'black', label: 'Black' }
]

function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={option.id === value ? 'button--active' : ''}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      className={`switch ${on ? 'switch--on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    />
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="settings__row">
      <div className="settings__text">
        <div className="settings__label">{label}</div>
        {desc && <div className="settings__desc">{desc}</div>}
      </div>
      <div className="settings__control">{children}</div>
    </div>
  )
}

const api = window.lagu

export function SettingsView({
  settings,
  update,
  zoom,
  onZoom,
  onResetZoom,
  onOpenShortcuts,
  trackCount,
  artworkProgress,
  onFetchMissingArtwork,
  hiddenCount,
  onRestoreHidden
}: SettingsViewProps) {
  const zoomPercent = Math.round(100 * 1.2 ** zoom)

  const [dataFolder, setDataFolder] = useState('')
  const [offsetText, setOffsetText] = useState((settings.lyricsOffset / 1000).toString())
  useEffect(() => {
    setOffsetText((settings.lyricsOffset / 1000).toString())
  }, [settings.lyricsOffset])

  useEffect(() => {
    void api.app.dataFolder().then(setDataFolder)
  }, [])

  return (
    <div className="settings-view">
      <header className="browse__header">
        <h2 className="browse__title">Settings</h2>
      </header>

      <div className="settings-view__body">
        <section className="settings__section">
          <h3 className="settings__section-title">
            <PaletteIcon size={13} /> Appearance
          </h3>

          <Row label="Theme" desc="Charcoal, light, light grey or near-black.">
            <Segmented value={settings.theme} options={THEMES} onChange={(theme) => update({ theme })} />
          </Row>

          <Row label="Accent colour" desc="Follow the artwork, or pick a fixed colour.">
            <Segmented
              value={settings.accentMode}
              options={[
                { id: 'artwork', label: 'Artwork' },
                { id: 'fixed', label: 'Fixed' }
              ]}
              onChange={(accentMode) => update({ accentMode })}
            />
          </Row>

          {settings.accentMode === 'fixed' && (
            <Row label="Accent">
              <div className="swatches">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.name}
                    className={`swatch ${
                      settings.accentColor.toLowerCase() === preset.value.toLowerCase()
                        ? 'swatch--active'
                        : ''
                    }`}
                    style={{ background: preset.value }}
                    onClick={() => update({ accentColor: preset.value })}
                  />
                ))}
                <input
                  type="color"
                  className="color-input"
                  value={settings.accentColor}
                  onChange={(e) => update({ accentColor: e.target.value })}
                />
              </div>
            </Row>
          )}

          <Row label="Corner radius" desc={`${settings.radius}px - 0 keeps everything sharp.`}>
            <div className="settings__slider">
              <Range
                value={settings.radius}
                max={8}
                onChange={(v) => update({ radius: Math.round(v) })}
                ariaLabel="Corner radius"
              />
            </div>
          </Row>

          <Row label="Density" desc="Row height and spacing.">
            <Segmented
              value={settings.density}
              options={[
                { id: 'comfortable', label: 'Comfortable' },
                { id: 'compact', label: 'Compact' }
              ]}
              onChange={(density) => update({ density })}
            />
          </Row>
        </section>

        <section className="settings__section">
          <h3 className="settings__section-title">
            <AnimationIcon size={13} /> Motion &amp; panels
          </h3>
          <Row label="Animations" desc="Transitions and view effects.">
            <Switch on={settings.animations} onChange={(animations) => update({ animations })} />
          </Row>
          <Row label="Audio visualizer" desc="React to the playing audio.">
            <Switch on={settings.visualizer} onChange={(visualizer) => update({ visualizer })} />
          </Row>
          <Row label="Show sidebar">
            <Switch on={settings.showSidebar} onChange={(showSidebar) => update({ showSidebar })} />
          </Row>
          <Row label="Show queue">
            <Switch on={settings.showQueue} onChange={(showQueue) => update({ showQueue })} />
          </Row>
        </section>

        <section className="settings__section">
          <h3 className="settings__section-title">
            <GraphicEqIcon size={13} /> Playback
          </h3>
          <Row label="8D audio" desc="Rotate the sound around your head (local files).">
            <Switch on={settings.eightD} onChange={(eightD) => update({ eightD })} />
          </Row>
          <Row
            label="Crossfade"
            desc="Blend the end of a track into the next one, in seconds (0 disables)."
          >
            <div className="settings__number">
              <input
                type="number"
                className="text-input text-input--number"
                min={0}
                max={20}
                step={1}
                value={settings.crossfade}
                aria-label="Crossfade seconds"
                onChange={(e) =>
                  update({ crossfade: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })
                }
              />
              <span className="settings__unit">s</span>
            </div>
          </Row>
        </section>

        <section className="settings__section">
          <h3 className="settings__section-title">
            <LyricsIcon size={13} /> Lyrics
          </h3>
          <Row
            label="Auto-scan lyrics online"
            desc="Look up lyrics for tracks that have none. Prefers word-by-word (Enhanced LRC), falling back to line-by-line."
          >
            <Switch on={settings.autoLyrics} onChange={(autoLyrics) => update({ autoLyrics })} />
          </Row>
          <Row
            label="Timing offset"
            desc="Default shift in seconds (up to 10 min). Positive delays lyrics. Per-track overrides live in Edit .lrc."
          >
            <div className="settings__number">
              <input
                type="number"
                className="text-input text-input--number"
                step="0.1"
                min={-600}
                max={600}
                value={offsetText}
                aria-label="Lyrics timing offset in seconds"
                onChange={(e) => {
                  setOffsetText(e.target.value)
                  const seconds = Number(e.target.value)
                  if (e.target.value.trim() !== '' && Number.isFinite(seconds)) {
                    update({
                      lyricsOffset: Math.max(-600000, Math.min(600000, Math.round(seconds * 1000)))
                    })
                  }
                }}
                onBlur={() => setOffsetText((settings.lyricsOffset / 1000).toString())}
              />
              <span className="settings__unit">s</span>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => update({ lyricsOffset: 0 })}
                disabled={settings.lyricsOffset === 0}
              >
                Reset
              </button>
            </div>
          </Row>
        </section>

        <section className="settings__section">
          <h3 className="settings__section-title">
            <ImageIcon size={13} /> Album art
          </h3>
          <Row
            label="Look up covers online"
            desc="Search iTunes / Deezer for missing album art. Requires a network connection."
          >
            <Switch
              on={settings.fetchArtworkOnline}
              onChange={(fetchArtworkOnline) => update({ fetchArtworkOnline })}
            />
          </Row>
          <Row
            label="Fetch missing covers"
            desc="Look up artwork for every track that has none. Runs gently in the background."
          >
            <div className="swatches">
              {artworkProgress && (
                <span className="settings__value">
                  {artworkProgress.done}/{artworkProgress.total}
                </span>
              )}
              <button
                type="button"
                className="ghost-btn"
                onClick={onFetchMissingArtwork}
                disabled={!settings.fetchArtworkOnline || Boolean(artworkProgress)}
              >
                <CloudDownloadIcon size={14} />
                {artworkProgress ? 'Fetching…' : 'Fetch now'}
              </button>
            </div>
          </Row>
        </section>

        <section className="settings__section">
          <h3 className="settings__section-title">
            <LibraryIcon size={13} /> Library
          </h3>
          <Row label="Tracks" desc="Songs currently in your library.">
            <span className="settings__value">{trackCount}</span>
          </Row>
          <Row
            label="Hidden items"
            desc="Tracks you removed from the library. Their files are untouched."
          >
            <div className="swatches">
              <span className="settings__value">{hiddenCount}</span>
              <button
                type="button"
                className="ghost-btn"
                onClick={onRestoreHidden}
                disabled={hiddenCount === 0}
              >
                Restore
              </button>
            </div>
          </Row>
        </section>

        <section className="settings__section">
          <h3 className="settings__section-title">
            <FolderIcon size={13} /> Data
          </h3>
          <Row
            label="Data folder"
            desc={dataFolder || 'Loading…'}
          >
            <button
              type="button"
              className="ghost-btn"
              onClick={() => void api.app.openDataFolder()}
            >
              <FolderIcon size={14} /> Open
            </button>
          </Row>
        </section>

        <section className="settings__section">
          <h3 className="settings__section-title">
            <ZoomInIcon size={13} /> Interface zoom
          </h3>
          <Row label="Zoom" desc="Ctrl + / Ctrl − / Ctrl 0">
            <div className="swatches">
              <button type="button" className="icon-btn" title="Zoom out" onClick={() => onZoom(-1)}>
                <ZoomOutIcon size={16} />
              </button>
              <span className="settings__value">{zoomPercent}%</span>
              <button type="button" className="icon-btn" title="Zoom in" onClick={() => onZoom(1)}>
                <ZoomInIcon size={16} />
              </button>
              <button type="button" className="ghost-btn" onClick={onResetZoom}>
                Reset
              </button>
            </div>
          </Row>
        </section>

        <section className="settings__section">
          <h3 className="settings__section-title">
            <KeyboardIcon size={13} /> Help
          </h3>
          <Row label="Keyboard shortcuts" desc="See everything you can trigger from the keyboard.">
            <button type="button" className="ghost-btn" onClick={onOpenShortcuts}>
              <KeyboardIcon size={14} /> View
            </button>
          </Row>
        </section>
      </div>
    </div>
  )
}
