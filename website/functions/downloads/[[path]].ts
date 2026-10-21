/// <reference types="@cloudflare/workers-types" />

/**
 * Download redirect.
 *
 * The installers are attached to GitHub Releases in `Yzedeka/laguversions`
 * (they are far too large for the Pages bundle). Any request to
 * `/downloads/<file>` is sent to the matching asset on the latest release, so
 * the site's download buttons always serve the real binaries.
 *
 * Only single release-asset names are forwarded: Lagu installers (any version,
 * so the auto-updater can fetch a release newer than the site's list) and the
 * electron-updater feeds (`latest*.yml`). Anything else is a 404.
 */
const RELEASE_BASE = 'https://github.com/Yzedeka/laguversions/releases/latest/download'

const ASSET = /^(?:lagu[\w.+-]*|latest(?:-[a-z0-9]+)*\.yml)$/i

export const onRequestGet: PagesFunction = ({ params }) => {
  const parts = Array.isArray(params.path) ? params.path : [String(params.path ?? '')]
  const file = parts.filter(Boolean).join('/')
  if (!file) return Response.redirect('https://lagu.yzedeka.com/#/download', 302)
  if (!ASSET.test(file)) return new Response('Not found', { status: 404 })
  return Response.redirect(`${RELEASE_BASE}/${file}`, 302)
}
