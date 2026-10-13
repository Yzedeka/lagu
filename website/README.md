# Lagu website

The marketing and download site for [Lagu](..), a minimalist desktop music
player. Built with Vite + React + TypeScript for **Cloudflare Pages**, with a
Pages Function powering a live download counter.

## Stack

- **Vite + React + TypeScript**
- Reuses the app's assets: the app icon, framed icon and "lagu" wordmark, the
  icon set (`src/icons/`, all Material Symbols) and the Inter typeface.
- **Docs are rendered from `../docs`** - the same Markdown as the repository, so
  the site and the docs never drift apart.
- **Cloudflare Pages Function** (`functions/api/downloads.ts`) + **D1** for the
  download counter.

## Routes

The site is a single static page with a small hash router:

| Route | Page |
| --- | --- |
| `#/` | Home - hero, one big download button (detects your OS), features, shortcuts |
| `#/linux` | Linux downloads - AppImage, .deb, .rpm, Flatpak, portable |
| `#/docs` | Documentation (rendered from `../docs`) |

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site into dist/
npm run typecheck  # app + functions
```

The counter API is a Pages Function, so it is not available under plain `vite`
dev (the counter shows `-`). Downloads, however, **do** work locally: a small
Vite plugin serves `/downloads/*` straight from the app's `../build` folder.

To exercise the API locally use `npx wrangler pages dev dist`.

## Downloads

The installers are served from **the site itself** at `/downloads/<file>`:

- **Locally** - a Vite plugin in `vite.config.ts` streams them from `../build`.
- **In production** - Cloudflare Pages caps static assets at 25 MiB, so point
  `/downloads/*` at a bucket (e.g. **Cloudflare R2**) with a Worker or a custom
  domain, and upload the files from the app's `build/` folder:

  | OS | File |
  | --- | --- |
  | Windows | `Lagu-0.1.0-setup.exe` |
  | macOS | `Lagu-0.1.0-mac.zip` |
  | Linux | `Lagu-0.1.0.AppImage`, `lagu-music-player_0.1.0_amd64.deb`, `lagu-music-player-0.1.0.x86_64.rpm`, `Lagu-0.1.0.flatpak`, `lagu-music-player-0.1.0.tar.gz` |

## The download counter

- `GET /api/downloads` returns `{ count }`.
- `POST /api/downloads` increments the total and returns the new `{ count }`.
- **Rate limited**: one counted download per visitor every **5 seconds**
  (by `CF-Connecting-IP`); a limited request returns `429` and does not change
  the total.
- The site polls on load and every 30 seconds, and updates instantly on click.

## Deploy to Cloudflare Pages

```bash
# 1. Create the project
npx wrangler pages project create lagu

# 2. Create the database and apply the schema
npx wrangler d1 create lagu-downloads
npx wrangler d1 execute lagu-downloads --remote --file=./schema.sql

# 3. Put the returned database_id into wrangler.toml, then:
npm run build
npx wrangler pages deploy dist
```

With the Git integration, Cloudflare Pages builds automatically (build command
`npm run build`, output directory `dist`); add the D1 binding in the project
settings.

## Structure

```
index.html
src/
  App.tsx                 routes (home / linux / docs)
  config.ts               app metadata, download list, /downloads base
  styles.css              shared design language with the app
  icons/                  the app's icon set (Material Symbols)
  assets/                 app icon, framed icon, wordmark
  components/             Hero, Download, LinuxDownloads, Docs, Features, Info
  lib/                    router, download counter, docs, markdown
functions/
  api/downloads.ts        Pages Function (counter + rate limiting)
schema.sql                D1 tables
wrangler.toml             Pages + D1 binding
```
