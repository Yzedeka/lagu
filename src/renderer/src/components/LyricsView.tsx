import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lyrics } from '@shared/types'

const api = window.lagu

interface LyricsViewProps {
  trackId: string | null
  currentTime: number
  /** Effective timing offset in ms (per-track override or the global default). */
  offset: number
  /** Bump to force a reload (after importing via the pencil). */
  revision?: number
}

/** Synchronized lyrics rendered on the background - no chrome, no boxes. */
export function LyricsView({ trackId, currentTime, offset, revision = 0 }: LyricsViewProps) {
  const [lyrics, setLyrics] = useState<Lyrics | null>(null)
  const [loading, setLoading] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const lastLyricsRef = useRef<Lyrics | null>(null)

  const reload = useCallback(async () => {
    if (!trackId) {
      setLyrics(null)
      return
    }
    setLoading(true)
    setLyrics(await api.track.lyrics(trackId))
    setLoading(false)
  }, [trackId, revision])

  useEffect(() => {
    void reload()
  }, [reload])

  const matchMs = currentTime * 1000 - offset

  const activeIndex = useMemo(() => {
    if (!lyrics?.synced) return -1
    let index = -1
    for (let i = 0; i < lyrics.lines.length; i += 1) {
      const t = lyrics.lines[i].time
      if (t != null && t <= matchMs) index = i
      else break
    }
    return index
  }, [lyrics, matchMs])

  const wordIndex = useMemo(() => {
    const line = activeIndex >= 0 ? lyrics?.lines[activeIndex] : undefined
    if (!line?.words) return -1
    let index = -1
    for (let i = 0; i < line.words.length; i += 1) {
      if (line.words[i].time <= matchMs) index = i
      else break
    }
    return index
  }, [lyrics, activeIndex, matchMs])

  useEffect(() => {
    if (activeIndex < 0) return
    const el = lineRefs.current[activeIndex]
    const scroller = scrollerRef.current
    if (!el || !scroller) return
    const instant = lastLyricsRef.current !== lyrics
    lastLyricsRef.current = lyrics
    const top = el.offsetTop - scroller.clientHeight / 2 + el.clientHeight / 2
    scroller.scrollTo({ top: Math.max(0, top), behavior: instant ? 'auto' : 'smooth' })
  }, [activeIndex, lyrics])

  const hasLyrics = Boolean(lyrics && (lyrics.synced || lyrics.plain))

  if (loading) return <div className="lyrics-empty">Loading…</div>
  if (!hasLyrics) return <div className="lyrics-empty">No lyrics for this track.</div>

  if (!lyrics?.synced) {
    return (
      <div className="lyrics-plain" ref={scrollerRef}>
        {lyrics?.plain}
      </div>
    )
  }

  return (
    <div className="lyrics-lines" ref={scrollerRef}>
      {lyrics.lines.map((line, i) => (
        <p
          key={`${line.time}-${i}`}
          ref={(el) => {
            lineRefs.current[i] = el
          }}
          className={`lyric-line ${i === activeIndex ? 'lyric-line--active' : i < activeIndex ? 'lyric-line--past' : ''}`}
        >
          {i === activeIndex && line.words ? (
            line.words.map((word, w) => (
              <span
                key={`${word.time}-${w}`}
                className={`lyric-word ${
                  w < wordIndex ? 'lyric-word--done' : w === wordIndex ? 'lyric-word--current' : ''
                }`}
              >
                {word.text}{' '}
              </span>
            ))
          ) : (
            line.text || '\u00A0'
          )}
        </p>
      ))}
    </div>
  )
}
