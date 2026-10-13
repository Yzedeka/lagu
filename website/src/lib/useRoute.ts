import { useEffect, useState } from 'react'

export type RouteName = 'home' | 'download' | 'linux' | 'docs'

export interface Route {
  name: RouteName
  param?: string
}

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [head, param] = path.split('/')
  if (head === 'download') return { name: 'download' }
  if (head === 'linux') return { name: 'linux' }
  if (head === 'docs') return { name: 'docs', param }
  return { name: 'home' }
}

/** Tiny hash router - keeps the site a single static page on Cloudflare Pages. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(location.hash))

  useEffect(() => {
    const onChange = (): void => {
      setRoute(parse(location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export function navigate(to: string): void {
  location.hash = to
}
