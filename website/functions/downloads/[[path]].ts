/// <reference types="@cloudflare/workers-types" />

/**
 * Download redirect.
 *
 * The installers are attached to GitHub Releases in `Yzedeka/laguversions`
 * (they are far too large for the Pages bundle). Any request to
 * `/downloads/<file>` is sent to the matching asset on the latest release, so
 * the site's download buttons always serve the real binaries.
 */
const RELEASE_BASE = 'https://github.com/Yzedeka/laguversions/releases/latest/download'

export const onRequestGet: PagesFunction = ({ params }) => {
  const parts = Array.isArray(params.path) ? params.path : [String(params.path ?? '')]
  const file = parts.filter(Boolean).join('/')
  if (!file) return Response.redirect('https://lagu.yzedeka.com/#/download', 302)
  return Response.redirect(`${RELEASE_BASE}/${file}`, 302)
}
