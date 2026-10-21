import {
  CloudDownloadIcon,
  EditIcon,
  GraphicEqIcon,
  LibraryIcon,
  LyricsIcon,
  PaletteIcon,
  PlaylistIcon,
  QueueIcon,
} from '@/icons'

const FEATURES = [
  {
    icon: LibraryIcon,
    title: 'A library that stays yours',
    text: 'Add any folders, scan once, and browse a local index. Files are never moved, renamed or rewritten.'
  },
  {
    icon: PaletteIcon,
    title: 'Colour from the cover',
    text: 'The playing artwork sets the accent, panels and text contrast. Four themes, or pin one colour.'
  },
  {
    icon: QueueIcon,
    title: 'A queue you can edit',
    text: 'Reorder, remove, play next or add to queue. Shuffle keeps the order you can return to.'
  },
  {
    icon: LyricsIcon,
    title: 'Lyrics that follow',
    text: 'Line-level and word-level LRC, embedded tags, per-track offsets and optional online lookup.'
  },
  {
    icon: CloudDownloadIcon,
    title: 'Find it, download it',
    text: 'Search YouTube through yt-dlp, download single tracks or full playlists straight into your library.'
  },
  {
    icon: PlaylistIcon,
    title: 'Playlists and pins',
    text: 'Build collections with their own covers, then pin artists, albums, tracks and playlists to the sidebar.'
  },
  {
    icon: GraphicEqIcon,
    title: 'Crossfade, 8D and a visualizer',
    text: 'Blend tracks sample-accurately, rotate the sound, or watch a slim spectrum move with the audio.'
  },
  {
    icon: EditIcon,
    title: 'Fix the details',
    text: 'Correct tags, pick a cover or rename an artist. Edits live in Lagu; the original files are untouched.'
  }
]

export function Features() {
  return (
    <section className="section section--features">
      <header className="section__head">
        <span className="section__kicker">Features</span>
        <h2 className="section__title">Small player. Serious about your library.</h2>
        <p className="section__lead">
          Everything is built around local files and a clean listening flow - not feeds,
          recommendations or accounts.
        </p>
      </header>

      <div className="feature-list">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <article className="feature" key={title}>
            <span className="feature__icon">
              <Icon size={17} />
            </span>
            <div>
              <h3 className="feature__title">{title}</h3>
              <p className="feature__text">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
