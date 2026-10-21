import type { ComponentType } from 'react'
import type { IconProps } from '@renderer/icons'

export interface NavEntry<T extends string> {
  id: T
  label: string
  icon: ComponentType<IconProps>
}

interface NavListProps<T extends string> {
  items: NavEntry<T>[]
  /** Highlighted entry, or null when the current view isn't in this list. */
  active: T | null
  onSelect: (id: T) => void
  className?: string
}

/** Vertical navigation used by both the sidebar and the settings page. */
export function NavList<T extends string>({ items, active, onSelect, className }: NavListProps<T>) {
  return (
    <nav className={`nav-list ${className ?? ''}`}>
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`nav-item ${active === id ? 'nav-item--active' : ''}`}
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onSelect(id)}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
