import { useMemo } from 'react'
import { DOCS, findDoc } from '@/lib/docs'
import { renderMarkdown } from '@/lib/markdown'

export function Docs({ slug }: { slug?: string }) {
  const doc = findDoc(slug)
  const html = useMemo(() => renderMarkdown(doc.markdown), [doc])

  return (
    <section className="docs">
      <aside className="docs__nav">
        <span className="docs__nav-title">Documentation</span>
        {DOCS.map((entry) => (
          <a
            key={entry.slug}
            className={`docs__link ${entry.slug === doc.slug ? 'docs__link--active' : ''}`}
            href={`#/docs/${entry.slug}`}
          >
            {entry.title}
          </a>
        ))}
      </aside>
      <article className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  )
}
