import indexMd from '../../../docs/index.md?raw'
import gettingStartedMd from '../../../docs/getting-started.md?raw'
import featuresMd from '../../../docs/features.md?raw'
import libraryMd from '../../../docs/library-and-metadata.md?raw'
import playbackMd from '../../../docs/playback.md?raw'
import lyricsMd from '../../../docs/lyrics.md?raw'
import customizationMd from '../../../docs/customization.md?raw'
import shortcutsMd from '../../../docs/shortcuts.md?raw'
import dataMd from '../../../docs/data-and-storage.md?raw'
import architectureMd from '../../../docs/architecture.md?raw'
import buildingMd from '../../../docs/building-and-packaging.md?raw'
import limitationsMd from '../../../docs/limitations.md?raw'

export interface Doc {
  slug: string
  title: string
  summary: string
  markdown: string
}

export const DOCS: Doc[] = [
  {
    slug: 'index',
    title: 'Overview',
    summary: 'What Lagu is and how the docs are laid out.',
    markdown: indexMd
  },
  {
    slug: 'getting-started',
    title: 'Getting Started',
    summary: 'Install, run and build from source.',
    markdown: gettingStartedMd
  },
  {
    slug: 'features',
    title: 'Features',
    summary: 'Everything the player can do.',
    markdown: featuresMd
  },
  {
    slug: 'library-and-metadata',
    title: 'Library & Metadata',
    summary: 'Scanning, tags, artwork and editing.',
    markdown: libraryMd
  },
  {
    slug: 'playback',
    title: 'Playback',
    summary: 'Queue, crossfade, 8D audio and the visualizer.',
    markdown: playbackMd
  },
  {
    slug: 'lyrics',
    title: 'Lyrics',
    summary: 'LRC, Enhanced LRC, offsets and online lookup.',
    markdown: lyricsMd
  },
  {
    slug: 'customization',
    title: 'Customization',
    summary: 'Themes, settings, icons and layout.',
    markdown: customizationMd
  },
  {
    slug: 'shortcuts',
    title: 'Keyboard Shortcuts',
    summary: 'Every shortcut in one table.',
    markdown: shortcutsMd
  },
  {
    slug: 'data-and-storage',
    title: 'Data & Storage',
    summary: 'The ~/Lagu folder and its catalog.',
    markdown: dataMd
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    summary: 'How the app is put together.',
    markdown: architectureMd
  },
  {
    slug: 'building-and-packaging',
    title: 'Building & Packaging',
    summary: 'AppImage, deb, rpm, Flatpak, exe, app and the APK plan.',
    markdown: buildingMd
  },
  {
    slug: 'limitations',
    title: 'Limitations',
    summary: 'Formats and platform notes.',
    markdown: limitationsMd
  }
]

export function findDoc(slug: string | undefined): Doc {
  if (!slug) return DOCS[0]
  return DOCS.find((d) => d.slug === slug) ?? DOCS[0]
}
