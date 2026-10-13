import {
  AlbumIcon,
  ArtistIcon,
  EditIcon,
  FolderIcon,
  GraphicEqIcon,
  LyricsIcon,
  PaletteIcon,
  PinIcon,
  QueueIcon,
  SearchIcon,
  SettingsIcon,
  ShuffleIcon
} from '@/icons'

interface Feature {
  icon: typeof PaletteIcon
  title: string
  text: string
}

const FEATURES: Feature[] = [
  {
    icon: PaletteIcon,
    title: 'Artwork-driven theming',
    text: 'Lagu pulls a small palette from the cover of whatever is playing and tints the whole interface with it. Dark, Light, Grey or near-AMOLED Black.'
  },
  {
    icon: GraphicEqIcon,
    title: 'A slim visualizer',
    text: 'A subtle, rounded spectrum under the controls that reacts to the audio and borrows its colour from the artwork. Turn it off if you like things quiet.'
  },
  {
    icon: LyricsIcon,
    title: 'Synchronized lyrics',
    text: 'Line-by-line and word-by-word (Enhanced LRC), with a per-track timing offset for the tracks that are a little off. Missing lyrics are handled honestly.'
  },
  {
    icon: QueueIcon,
    title: 'A queue that behaves',
    text: 'A persistent Up Next you can reorder and prune, shuffle and repeat, restored between sessions.'
  },
  {
    icon: ShuffleIcon,
    title: 'Crossfade & 8D audio',
    text: 'Blend tracks into each other like a DJ, or rotate the sound around your head. Both optional, both off the beaten path.'
  },
  {
    icon: FolderIcon,
    title: 'Your folders, untouched',
    text: 'Lagu reads your music where it lives. It never moves, renames or rewrites your files - edits are stored inside the app.'
  },
  {
    icon: SearchIcon,
    title: 'Search and pins',
    text: 'Find anything instantly, and pin artists, albums and tracks to the sidebar with their cover art.'
  },
  {
    icon: EditIcon,
    title: 'Fix your tags',
    text: 'Right-click to correct a title, artist, album or year - or fetch the right cover online - without touching the file.'
  },
  {
    icon: AlbumIcon,
    title: 'Small, quick library',
    text: 'Folders are scanned in the background and watched live, so new files just appear. Nothing blocks the interface.'
  },
  {
    icon: ArtistIcon,
    title: 'Artist pages',
    text: 'Each artist gets a page with their artwork, track count and an editable bio.'
  },
  {
    icon: SettingsIcon,
    title: 'Made to be tuned',
    text: 'Themes, accent colour, corner radius, density, zoom, panels - and every icon lives in one folder you can swap.'
  },
  {
    icon: PinIcon,
    title: 'Plays what you have',
    text: 'MP3, M4A, AAC, FLAC, Ogg, Opus, WAV, MP4 and MOV audio - files stay on your disk, offline.'
  }
]

export function Features() {
  return (
    <section className="section" id="features">
      <h2 className="section__title">Everything you need, nothing you do not</h2>
      <p className="section__lead">
        Lagu is built to be a small, dependable desktop player - not a store, not a social network.
      </p>
      <div className="features">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <article className="feature" key={title}>
            <span className="feature__icon">
              <Icon size={18} />
            </span>
            <h3 className="feature__title">{title}</h3>
            <p className="feature__text">{text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
