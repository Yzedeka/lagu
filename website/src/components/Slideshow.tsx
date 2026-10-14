import { useEffect, useState } from 'react'

interface Slide {
  src: string
  label: string
}

const SLIDES: Slide[] = [
  { src: '/screenshots/now-playing.png', label: 'Now Playing' },
  { src: '/screenshots/library.png', label: 'Library' },
  { src: '/screenshots/albums.png', label: 'Albums' },
  { src: '/screenshots/artists.png', label: 'Artists' },
  { src: '/screenshots/playlists.png', label: 'Playlists' },
  { src: '/screenshots/settings.png', label: 'Settings' }
]

const INTERVAL = 5000

/** Auto-advancing app preview shown between the download area and the features. */
export function Slideshow() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => setIndex((v) => (v + 1) % SLIDES.length), INTERVAL)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <section
      className="showcase"
      aria-roledescription="carousel"
      aria-label="Lagu app preview"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="showcase__frame">
        {SLIDES.map((s, i) => (
          <img
            key={s.src}
            className={`showcase__img${i === index ? ' is-active' : ''}`}
            src={s.src}
            alt={s.label}
            draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        <div className="showcase__dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              className={`showcase__dot${i === index ? ' is-active' : ''}`}
              aria-label={`Show ${s.label}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>

      <p className="showcase__label">{SLIDES[index].label}</p>
    </section>
  )
}
