import { marked } from 'marked'

/** Render the project's Markdown docs and rewrite links to in-site routes. */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { gfm: true, async: false }) as string
  return html.replace(/href="([^"#]+)\.md(#[^"]*)?"/g, (_match, slug: string, anchor?: string) => {
    return `href="#/docs/${slug}${anchor ?? ''}"`
  })
}
