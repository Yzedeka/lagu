import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import wordmark from '@/assets/lagu-wordmark.png'
import appIcon from '@/assets/app_icon.png'
import { CloseIcon, DiscIcon, NextIcon, PauseIcon, PlayIcon, PlusIcon, PrevIcon } from '@/icons'
import { formatTime, trackFromFile, type MobileTrack } from '@/lib/tracks'

export function App() {
  const [tracks, setTracks] = useState<MobileTrack[]>([])
  const [index, setIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const current = index >= 0 ? tracks[index] ?? null : null

  // --- load the current track into the <audio> element ----------------------
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (audio.src !== current.url) {
      audio.src = current.url
      audio.load()
    }
    void audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    )
    setCurrentTime(0)
    setDuration(current.duration ?? 0)
  }, [current])

  const next = useCallback(() => {
    setIndex((i) => (i + 1 < tracks.length ? i + 1 : i))
  }, [tracks.length])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    setIndex((i) => (i - 1 >= 0 ? i - 1 : i))
  }, [])

  // --- media session (lock screen / notification controls) ------------------
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album,
      artwork: current.artwork ? [{ src: current.artwork }] : []
    })
    navigator.mediaSession.setActionHandler('play', () => void audioRef.current?.play())
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause())
    navigator.mediaSession.setActionHandler('nexttrack', () => next())
    navigator.mediaSession.setActionHandler('previoustrack', () => prev())
  })

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [current])

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setLoading(true)
    const parsed = await Promise.all(Array.from(files).map(trackFromFile))
    setTracks((prev) => [...prev, ...parsed])
    setIndex((i) => (i < 0 ? 0 : i))
    setLoading(false)
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const list = useMemo(
    () =>
      tracks.map((track, i) => (
        <button
          key={track.id}
          type="button"
          className={`row ${i === index ? 'row--active' : ''}`}
          onClick={() => {
            setIndex(i)
            setPlaying(true)
          }}
        >
          <span className="row__art">
            {track.artwork ? <img src={track.artwork} alt="" /> : <DiscIcon size={18} />}
          </span>
          <span className="row__text">
            <span className="row__title">{track.title}</span>
            <span className="row__sub">{track.artist}</span>
          </span>
          <span className="row__dur">{formatTime(track.duration)}</span>
        </button>
      )),
    [tracks, index]
  )

  return (
    <div className="app">
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={next}
      />

      <header className="bar">
        <img className="bar__wordmark" src={wordmark} alt="Lagu" />
        <label className="bar__add">
          <PlusIcon size={16} />
          Add music
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => {
              void addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </header>

      <main className="list">
        {tracks.length === 0 ? (
          <div className="empty">
            <img className="empty__icon" src={appIcon} alt="" />
            <div className="empty__title">No music yet</div>
            <div className="empty__text">Tap “Add music” and pick some audio files from your phone.</div>
          </div>
        ) : (
          list
        )}
        {loading && <div className="loading">Reading files…</div>}
      </main>

      {current && !expanded && (
        <button type="button" className="mini" onClick={() => setExpanded(true)}>
          <span className="mini__art">
            {current.artwork ? <img src={current.artwork} alt="" /> : <DiscIcon size={18} />}
          </span>
          <span className="mini__text">
            <span className="mini__title">{current.title}</span>
            <span className="mini__sub">{current.artist}</span>
          </span>
          <span className="mini__progress">
            <span style={{ width: `${progress}%` }} />
          </span>
          <span
            className="mini__btn"
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
          >
            {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
          </span>
        </button>
      )}

      {current && expanded && (
        <section className="np">
          <header className="np__head">
            <button type="button" className="np__close" onClick={() => setExpanded(false)}>
              <CloseIcon size={20} />
            </button>
          </header>

          <div className="np__art">
            {current.artwork ? <img src={current.artwork} alt="" /> : <DiscIcon size={72} />}
          </div>

          <div className="np__meta">
            <div className="np__title">{current.title}</div>
            <div className="np__sub">{current.artist}</div>
          </div>

          <div className="np__seek">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(e) => {
                const audio = audioRef.current
                if (audio) audio.currentTime = Number(e.target.value)
              }}
            />
            <div className="np__times">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="np__controls">
            <button type="button" onClick={prev}>
              <PrevIcon size={30} />
            </button>
            <button type="button" className="np__play" onClick={toggle}>
              {playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
            </button>
            <button type="button" onClick={next}>
              <NextIcon size={30} />
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
