# Building & Packaging

Lagu is packaged with **electron-builder** for the desktop formats and
**flatpak-builder** for Flatpak. Configuration lives in `electron-builder.yml`
and `flatpak/`; artifacts are written to `build/`.

## Scripts

```bash
npm run dist            # current platform (electron-builder)
npm run dist:linux      # AppImage + .deb + .rpm
npm run dist:win        # NSIS installer (.exe)
npm run dist:mac        # .app + .zip
npm run dist:all        # all three desktop platforms
npm run dist:flatpak    # Flatpak bundle
npm run build:apk       # Android placeholder (see below)
npm run fetch:ytdlp     # bundle yt-dlp + ffmpeg
```

`dist` and the platform targets fetch yt-dlp and ffmpeg first into
`resources/bin/` (git-ignored); electron-builder ships the whole folder.
Cross-builds fetch the target platform into a subfolder (`win32/`, `darwin/`),
including separate macOS Intel/Apple Silicon ffmpeg binaries, and the app
resolves the right tool at runtime. Set `--force` on the fetch script to refresh
to the latest release.

## Artifacts

| Format | File | Tool |
| --- | --- | --- |
| Linux AppImage | `build/Lagu-<version>.AppImage` | electron-builder |
| Linux portable | `build/lagu-music-player-<version>.tar.gz` | electron-builder |
| Debian/Ubuntu | `build/lagu-music-player_<version>_amd64.deb` | electron-builder (fpm) |
| Fedora/RHEL | `build/lagu-music-player-<version>.x86_64.rpm` | electron-builder (fpm) |
| Flatpak | `build/Lagu-<version>.flatpak` | flatpak-builder |
| Windows | `build/Lagu-<version>-setup.exe` | electron-builder (NSIS) |
| macOS | `build/mac/Lagu.app` and `build/Lagu-<version>-mac.zip` | electron-builder |

## Running the AppImage

AppImage type 2 needs **FUSE 2** (`libfuse.so.2`). Some modern distros ship
only FUSE 3, in which case the AppImage exits immediately with:

```
dlopen(): error loading libfuse.so.2
```

Fix it one of three ways:

1. Install FUSE 2 - Arch: `sudo pacman -S fuse2`, Debian/Ubuntu:
   `sudo apt install libfuse2`, Fedora: `sudo dnf install fuse-libs`.
2. Run it without FUSE (extracts to a temp dir first):

   ```bash
   APPIMAGE_EXTRACT_AND_RUN=1 ./Lagu-0.2.0.AppImage
   ```

3. Use the **portable tarball** instead - extract and run, no FUSE at all:

   ```bash
   tar -xzf lagu-music-player-0.2.0.tar.gz
   ./lagu-music-player-0.2.0/lagu-music-player
   ```

## Icons

- `build/icon.png` - 512x512, used for Linux, Flatpak and to derive the macOS
  `.icns`.
- `build/icon.ico` - multi-size, used for Windows.

The runtime window icon is `src/renderer/src/icons/app_icon.png`; it is copied
into the package via `extraResources` so it resolves after packaging.

## What goes into the package

electron-builder ships only the bundled output and manifest - `out/**` and
`package.json`. The renderer and main process are already bundled by
electron-vite, so no `node_modules` are included. `asar` is on.

## Tool requirements

- **RPM** needs `rpmbuild` on the build machine (provided by the `rpm` /
  `rpm-tools` package). Debian's `rpm` package, Fedora's `rpm-build`, Arch's
  `rpm-tools`.
- **Flatpak** needs `flatpak` and `flatpak-builder`. If `flatpak-builder` is not
  installed system-wide, the build script falls back to the `org.flatpak.Builder`
  flatpak:

  ```bash
  flatpak remote-add --user --if-not-exists flathub \
    https://flathub.org/repo/flathub.flatpakrepo
  flatpak install --user -y flathub org.flatpak.Builder
  ```

## Flatpak

The Flatpak lives in `flatpak/`:

```
flatpak/
  com.lagu.musicplayer.yml          the manifest
  com.lagu.musicplayer.desktop      desktop entry
  lagu.sh                           launcher (zypak-wrapper + bundled Electron)
```

It builds on top of the shared **`org.electronjs.Electron2.BaseApp`** (which
provides the sandbox shim and Chromium libraries), copies the pre-built
`build/linux-unpacked` app into `/app/main`, and launches it through
`zypak-wrapper`. Permissions are declared in the manifest: Wayland/X11, PulseAudio,
GPU, network (for the opt-in online features) and home access (to read your music
and write the `~/Lagu` data folder).

`npm run dist:flatpak` builds the app, runs flatpak-builder, and writes
`build/Lagu-<version>.flatpak`. Install it with:

```bash
flatpak install --user build/Lagu-0.2.0.flatpak
flatpak run com.lagu.musicplayer
```

## Cross-building

- **Linux** targets build natively.
- **Windows** installers build on Linux via **wine** (electron-builder's NSIS
  dependency).
- **macOS** `.app`/`.zip` can be produced on Linux but are **unsigned** - signing
  and notarising must happen on macOS or CI. The `.dmg` target needs macOS.

## Android (.apk) - the plan

Electron cannot produce an APK, so Android will be a **separate shell** that
reuses the existing renderer:

1. Add Capacitor (`@capacitor/cli`, `@capacitor/core`, `@capacitor/android`).
2. Point it at the built renderer (`out/renderer`) as the web directory.
3. Implement the `window.lagu` bridge for Android using Capacitor plugins
   (filesystem, media, http) instead of Electron IPC.
4. Build with Gradle to produce an APK.

`npm run build:apk` currently prints these steps (see `scripts/build-apk.mjs`).
The groundwork is in place: the renderer is a plain web app and every OS call is
isolated behind `src/shared/ipc.ts`, so only that one bridge needs a mobile
implementation.
