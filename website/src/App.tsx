import { useRoute } from '@/lib/useRoute'
import { DownloadProvider } from '@/lib/DownloadContext'
import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { Footer, Nav, Shortcuts } from '@/components/Info'
import { DownloadPage } from '@/components/DownloadPage'
import { LinuxDownloads } from '@/components/LinuxDownloads'
import { Docs } from '@/components/Docs'

export function App() {
  const route = useRoute()

  return (
    <DownloadProvider>
      <div className="page">
        <div className="page__glow" aria-hidden />
        <Nav />
        <main>
          {route.name === 'home' && (
            <>
              <Hero />
              <Features />
              <Shortcuts />
            </>
          )}
          {route.name === 'download' && <DownloadPage />}
          {route.name === 'linux' && <LinuxDownloads />}
          {route.name === 'docs' && <Docs slug={route.param} />}
        </main>
        <Footer />
      </div>
    </DownloadProvider>
  )
}
