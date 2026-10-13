import { useEffect, useState } from 'react'

interface Slide {
  src: string
  eyebrow: string
  title: string
  text: string
}

const SLIDES: Slide[] = [
  {
    src: '/screenshots/now-playing.png',
    eyebrow: 'Now Playing',
    title: 'Calm, focused playback',
    text: 'The cover tints the whole interface, with synchronized lyrics and a full queue a click away.'
  },
  {
    src: '/screenshots/library.png',
    eyebrow: 'Library',
    title: 'Your whole collection',
    text: 'Every song in a searchable grid, using the artwork already inside your files.'
  },
  {
    src: '/screenshots/albums.png',
    eyebrow: 'Albums',
    title: 'Browse by album',
    text: 'Your records laid out as covers, sorted by artist, year or however you like.'
  },
  {
    src: '/screenshots/artists.png',
    eyebrow: 'Artists',
    title: 'Artists with context',
    text: 'Profile art, a short bio, and how many albums and tracks each artist has.'
  },
  {
    src: '/screenshots/settings.png',
    eyebrow: 'Settings',
    title: 'Tune every detail',
    text: 'Themes, accent colours, custom keybinds and a performance mode that strips animations.'
  }
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

  const slide = SLIDES[index]

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
            alt={s.title}
            draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
        <div className={`showcase__progress${paused ? ' is-paused' : ''}`} key={index} />
      </div>

      <div className="showcase__bar">
        <div className="showcase__copy" key={index}>
          <span className="showcase__eyebrow">{slide.eyebrow}</span>
          <h3 className="showcase__title">{slide.title}</h3>
          <p className="showcase__text">{slide.text}</p>
        </div>

        <div className="showcase__dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              className={`showcase__dot${i === index ? ' is-active' : ''}`}
              aria-label={`Show: ${s.title}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
