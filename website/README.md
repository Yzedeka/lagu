# Lagu website

The marketing site for [Lagu](..), a minimalist desktop music player. Built
with Vite + React + TypeScript and made to deploy on **Cloudflare Pages**, with a
Pages Function powering a live download counter.

## Stack

- **Vite + React + TypeScript**
- Reuses the app's assets: the app icon, the "lagu" wordmark, the icon set
  (`src/icons/`, all Material Symbols) and the Inter typeface.
- **Cloudflare Pages Function** (`functions/api/downloads.ts`) + **D1** for the
  download counter.

## Develop

```bash
npm install
npm run dev
```

The counter API is a Pages Function, so it is not available under plain `vite`
dev. The UI degrades gracefully (it just shows `-`) until deployed or run with
`wrangler pages dev`.

```bash
npm run build       # static site into dist/
npm run typecheck   # app + functions
```

## Deploy to Cloudflare Pages

1. Create the project and link the repo (or use the Pages dashboard):

   ```bash
   npx wrangler pages project create lagu
   ```

2. Create the D1 database and apply the schema:

   ```bash
   npx wrangler d1 create lagu-downloads
   npx wrangler d1 execute lagu-downloads --remote --file=./schema.sql
   ```

3. Put the returned `database_id` into `wrangler.toml`.

4. Deploy:

   ```bash
   npm run build
   npx wrangler pages deploy dist
   ```

   (With the Git integration, Cloudflare Pages builds automatically: build
   command `npm run build`, output directory `dist`. Remember to add the D1
   binding in the project settings too.)

## The download counter

- `GET /api/downloads` returns `{ count }`.
- `POST /api/downloads` increments the total and returns the new `{ count }`.
- **Rate limited**: one counted download per visitor every **5 seconds**
  (tracked by `CF-Connecting-IP`). A limited request returns `429` and does not
  change the total.
- The site polls the count on load and every 30 seconds, and updates it
  immediately after a download click.

## Where the downloads live

The download buttons point at `VITE_DOWNLOAD_BASE`, which defaults to the
repository's GitHub Releases
(`https://github.com/Yzedeka/lagu/releases/latest/download`).

> Because the repository is private, those links only work for people with
> access. For public downloads, either publish the release assets or host the
> files somewhere public (for example a Cloudflare **R2** bucket) and point the
> site at it:

```bash
VITE_DOWNLOAD_BASE="https://downloads.example.com/lagu" npm run build
```

Upload the files from the app's `build/` folder:

| OS | File |
| --- | --- |
| Windows | `Lagu-0.1.0-setup.exe` |
| macOS | `Lagu-0.1.0-mac.zip` |
| Linux | `Lagu-0.1.0.AppImage`, `lagu-music-player_0.1.0_amd64.deb`, `lagu-music-player-0.1.0.x86_64.rpm`, `Lagu-0.1.0.flatpak`, `lagu-music-player-0.1.0.tar.gz` |

## Structure

```
index.html
src/
  App.tsx                 page composition
  config.ts               app metadata, download list, base URL
  styles.css              shared design language with the app
  icons/                  the app's icon set (Material Symbols)
  assets/                 app icon, framed icon, wordmark
  components/             Hero, DownloadPanel, Features, Info (platforms/shortcuts/principles/footer)
  lib/useDownloads.ts     download counter hook
functions/
  api/downloads.ts        Pages Function (counter + rate limiting)
schema.sql                D1 tables
wrangler.toml             Pages + D1 binding
```
