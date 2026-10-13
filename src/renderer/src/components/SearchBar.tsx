import { CloseIcon, SearchIcon } from '@renderer/icons'

interface SearchBarProps {
  value: string
  placeholder?: string
  compact?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
}

/** Pill-shaped search field with a leading magnifier; submits on Enter. */
export function SearchBar({
  value,
  placeholder = 'Search your library…',
  compact,
  onChange,
  onSubmit,
  onClear
}: SearchBarProps) {
  return (
    <div className={`search ${compact ? 'search--compact' : ''}`}>
      <SearchIcon size={compact ? 15 : 17} className="search__icon" />
      <input
        className="search__input"
        type="text"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit()
          if (e.key === 'Escape') onClear()
        }}
      />
      {value && (
        <button type="button" className="search__clear" title="Clear" onClick={onClear}>
          <CloseIcon size={compact ? 13 : 15} />
        </button>
      )}
    </div>
  )
}
