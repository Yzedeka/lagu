import { useMemo } from 'react'
import type { Track } from '@shared/types'
import { SongGrid } from './SongGrid'
import { CloudDownloadIcon } from '@renderer/icons'

interface SearchViewProps {
  query: string
  tracks: Track[]
  currentTrackId: string | null
  onPlayContext: (tracks: Track[], index: number) => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  onSearchYouTube: (query: string) => void
}

export function SearchView({
  query,
  tracks,
  currentTrackId,
  onPlayContext,
  onPlayNext,
  onAddToQueue,
  onSearchYouTube
}: SearchViewProps) {
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.artist.toLowerCase().includes(needle) ||
        t.album.toLowerCase().includes(needle)
    )
  }, [query, tracks])

  return (
    <div className="browse">
      <header className="browse__header">
        <h2 className="browse__title">Search</h2>
        <div className="browse__actions">
          {query.trim() ? (
            <>
              <span className="browse__count">
                {results.length} result{results.length === 1 ? '' : 's'} for “{query.trim()}”
              </span>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => onSearchYouTube(query.trim())}
              >
                <CloudDownloadIcon size={14} /> Search YouTube
              </button>
            </>
          ) : (
            <span className="browse__count">Type in the sidebar and press Enter</span>
          )}
        </div>
      </header>
      <div className="browse__body">
        <SongGrid
          tracks={results}
          currentTrackId={currentTrackId}
          onPlay={(i) => onPlayContext(results, i)}
          onPlayNext={onPlayNext}
          onAddToQueue={onAddToQueue}
          emptyMessage={
            query.trim() ? 'No matching tracks.' : 'Search your library from the sidebar.'
          }
        />
      </div>
    </div>
  )
}
