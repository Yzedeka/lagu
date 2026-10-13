import {
  AlbumIcon,
  ArtistIcon,
  EditIcon,
  GraphicEqIcon,
  LyricsIcon,
  PaletteIcon,
  QueueIcon,
  SearchIcon
} from '@/icons'

const FEATURES = [
  {
    icon: PaletteIcon,
    title: 'Theming from your artwork',
    text: 'The cover of whatever is playing tints the interface. Four themes, and an accent you can fix.'
  },
  {
    icon: QueueIcon,
    title: 'A real queue',
    text: 'A persistent Up Next you can reorder and prune, with shuffle and repeat.'
  },
  {
    icon: LyricsIcon,
    title: 'Synchronized lyrics',
    text: 'Line-by-line and word-by-word from .lrc files, with a per-track timing offset.'
  },
  {
    icon: GraphicEqIcon,
    title: 'Crossfade and 8D audio',
    text: 'Blend tracks into each other, or rotate the sound around your head. Both optional.'
  },
  {
    icon: EditIcon,
    title: 'Fix your tags',
    text: 'Right-click to correct a title, artist or year, or fetch the right cover online.'
  },
  {
    icon: SearchIcon,
    title: 'Search and pins',
    text: 'Find anything fast, and pin artists, albums and tracks to the sidebar.'
  },
  {
    icon: AlbumIcon,
    title: 'Albums and artists',
    text: 'Browse by library, album, artist or folder, with artwork everywhere.'
  },
  {
    icon: ArtistIcon,
    title: 'Your files stay on disk',
    text: 'Lagu reads your music where it lives and never rewrites it. Plays offline.'
  }
]

export function Features() {
  return (
    <section className="features">
      {FEATURES.map(({ icon: Icon, title, text }) => (
        <article className="feature" key={title}>
          <span className="feature__icon">
            <Icon size={18} />
          </span>
          <h3 className="feature__title">{title}</h3>
          <p className="feature__text">{text}</p>
        </article>
      ))}
    </section>
  )
}
