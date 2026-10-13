import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { Footer, Platforms, Principles, Shortcuts } from '@/components/Info'
import { APP } from '@/config'

function Nav() {
  return (
    <nav className="nav">
      <span className="nav__brand">{APP.name}</span>
      <div className="nav__links">
        <a href="#features">Features</a>
        <a href="#platforms">Platforms</a>
        <a href="#shortcuts">Shortcuts</a>
        <a href="#privacy">Privacy</a>
        <a className="nav__cta" href="#download">
          Download
        </a>
      </div>
    </nav>
  )
}

export function App() {
  return (
    <div className="page">
      <div className="page__glow" aria-hidden />
      <Nav />
      <main>
        <Hero />
        <Features />
        <Platforms />
        <Shortcuts />
        <Principles />
      </main>
      <Footer />
    </div>
  )
}
