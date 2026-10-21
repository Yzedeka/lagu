# Lagu

A minimalist, fast desktop music player for your local library - artwork-driven
theming, a real queue, crossfade, 8D audio and synchronized lyrics.

> Version 0.4.1 - MIT licensed - **still in beta**.

## Repository layout

| Path | What it is |
| --- | --- |
| `src/` | The Electron app (main, preload, renderer) |
| `docs/` | Human-readable documentation (also used by the website) |
| `website/` | The marketing/download site (Vite + React, Cloudflare Pages) |
| `flatpak/` | Flatpak manifest, desktop entry and launcher |
| `scripts/` | Build helpers (Flatpak, Android placeholder) |
| `electron-builder.yml` | Desktop packaging configuration |

## Quick start

```bash
npm install
npm run dev        # run the app
npm run build      # bundle
npm run typecheck  # main + preload + renderer
npm run fetch:ytdlp # optional: bundle yt-dlp + ffmpeg for downloads
```

The download search uses `yt-dlp` and `ffmpeg` (both bundled by the packaging
scripts; system installs are used when running from source).

## Packaging

```bash
npm run dist:linux    # AppImage + tar.gz + deb + rpm
npm run dist:win      # NSIS installer (.exe)
npm run dist:mac      # .app + .zip
npm run dist:flatpak  # Flatpak bundle
npm run dist:all
```

Artifacts land in `build/`. See [docs/building-and-packaging.md](docs/building-and-packaging.md).

## Website

See [website/README.md](website/README.md) for local development and Cloudflare
Pages deployment (including the download counter).

## Documentation

Start at [docs/index.md](docs/index.md).

## License
We use the [Polyform Noncommercial License](https://polyformproject.org/licenses/noncommercial/1.0.0)
read here [LICENSE](LICENSE)
