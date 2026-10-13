import { useEffect, useState } from 'react'

interface Slide {
  src: string
  caption: string
}

const SLIDES: Slide[] = [
  { src: '/screenshots/now-playing.png', caption: 'Now Playing, tinted by the artwork' },
  { src: '/screenshots/library.png', caption: 'Your whole library, searchable' },
  { src: '/screenshots/albums.png', caption: 'Browse by album' },
  { src: '/screenshots/artists.png', caption: 'Artists, with bios and stats' },
  { src: '/screenshots/settings.png', caption: 'Deep, searchable settings' }
]

const INTERVAL = 5000

/** Auto-advancing app preview shown under the download button. */
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
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="showcase__frame">
        {SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            className={`showcase__img${i === index ? ' is-active' : ''}`}
            src={slide.src}
            alt={slide.caption}
            draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>

      <div className="showcase__bar">
        <p className="showcase__caption">{SLIDES[index].caption}</p>
        <div className="showcase__dots">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              className={`showcase__dot${i === index ? ' is-active' : ''}`}
              aria-label={`Show: ${slide.caption}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
