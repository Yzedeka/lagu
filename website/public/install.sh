#!/bin/sh
# Lagu installer for Linux.
#
# Downloads the AppImage once and *extracts* it to a fixed location
# (~/.local/opt/lagu), then creates a launcher and a desktop entry that point at
# that stable path. Unlike running the AppImage directly, nothing depends on a
# temporary FUSE mount, so the app always reopens after you close it.
#
#   curl -fsSL https://lagu.yzedeka.com/install.sh | sh
#
# Installs the latest release. Override the version, download host or install
# location with:
#   LAGU_VERSION=0.4.0 LAGU_BASE=https://example.com/downloads LAGU_DIR=~/.local/opt/lagu sh install.sh
set -eu

BASE="${LAGU_BASE:-https://lagu.yzedeka.com/downloads}"
RELEASES_API="https://api.github.com/repos/Yzedeka/laguversions/releases/latest"
APP_DIR="${LAGU_DIR:-$HOME/.local/opt/lagu}"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

say() { printf '%s\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if have curl; then
  fetch() { curl -fsSL "$1"; }
  download() { curl -fL "$1" -o "$2"; }
elif have wget; then
  fetch() { wget -qO- "$1"; }
  download() { wget -O "$2" "$1"; }
else
  say "Need curl or wget to download. Aborting."
  exit 1
fi

# Work out the latest version: the updater manifest published with each
# release first, then the GitHub API.
VERSION="${LAGU_VERSION:-}"
if [ -z "$VERSION" ]; then
  VERSION="$(fetch "$BASE/latest-linux.yml" 2>/dev/null | sed -n 's/^version: *//p' | head -n 1 || true)"
fi
if [ -z "$VERSION" ]; then
  VERSION="$(fetch "$RELEASES_API" 2>/dev/null | sed -n 's/.*"tag_name": *"v\{0,1\}\([^"]*\)".*/\1/p' | head -n 1 || true)"
fi
if [ -z "$VERSION" ]; then
  say "Could not determine the latest Lagu version. Set LAGU_VERSION and retry."
  exit 1
fi
APP_NAME="Lagu-${VERSION}.AppImage"

say "Downloading $APP_NAME ..."
download "$BASE/$APP_NAME" "$TMP/lagu.AppImage"
chmod +x "$TMP/lagu.AppImage"

say "Extracting to $APP_DIR ..."
( cd "$TMP" && ./lagu.AppImage --appimage-extract >/dev/null 2>&1 )
rm -rf "$APP_DIR"
mkdir -p "$(dirname "$APP_DIR")"
mv "$TMP/squashfs-root" "$APP_DIR"

# Launcher that always runs the installed copy.
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/lagu" <<EOF
#!/bin/sh
exec "$APP_DIR/lagu-music-player" "\$@"
EOF
chmod +x "$BIN_DIR/lagu"

# Icon: an absolute path in the desktop file always resolves, so the menu and
# taskbar never fall back to a question mark.
ICON_SRC="$(ls "$APP_DIR"/*.png 2>/dev/null | head -n 1 || true)"
if [ -n "$ICON_SRC" ]; then
  cp "$ICON_SRC" "$APP_DIR/icon.png"
  mkdir -p "$ICON_DIR"
  cp "$ICON_SRC" "$ICON_DIR/lagu.png"
  have gtk-update-icon-cache && gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_DIR/lagu.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Lagu
GenericName=Music Player
Comment=A minimalist desktop music player for your local music library
Exec=$BIN_DIR/lagu %U
Icon=$APP_DIR/icon.png
Terminal=false
Categories=AudioVideo;Audio;Player;GTK;
Keywords=music;player;audio;library;
MimeType=audio/mpeg;audio/mp4;audio/aac;audio/flac;audio/ogg;audio/x-wav;audio/x-ms-wma;
StartupWMClass=lagu
EOF

have update-desktop-database && update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true

say ""
say "Installed to $APP_DIR"
say "Launcher:  $BIN_DIR/lagu"
say "Menu:      Lagu"
if ! printf '%s' ":$PATH:" | grep -q ":$BIN_DIR:"; then
  say ""
  say "Note: $BIN_DIR is not on your PATH. Either add it, or launch from the menu."
fi
