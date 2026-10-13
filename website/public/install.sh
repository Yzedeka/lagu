#!/bin/sh
# Lagu installer for Linux.
#
# Downloads the AppImage and, if FUSE 2 is missing (AppImages need it to mount),
# installs it with your distribution's package manager.
#
#   curl -fsSL https://<your-site>/install.sh | sh
#
# Override the download host or install location with:
#   LAGU_BASE=https://example.com/downloads LAGU_DIR=~/.local/bin sh install.sh
set -eu

VERSION="0.1.0"
BASE="${LAGU_BASE:-https://lagu.app/downloads}"
APP_NAME="Lagu-${VERSION}.AppImage"
APP_DIR="${LAGU_DIR:-$HOME/.local/bin}"
DEST="$APP_DIR/Lagu.AppImage"

say() { printf '%s\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

fuse2_present() {
  ldconfig -p 2>/dev/null | grep -q 'libfuse\.so\.2'
}

install_fuse2() {
  if fuse2_present; then
    say "FUSE 2 is already installed."
    return 0
  fi
  say "FUSE 2 is missing - installing it (AppImages need it to run)."
  if have pacman; then
    sudo pacman -S --needed --noconfirm fuse2
  elif have apt-get; then
    sudo apt-get update && sudo apt-get install -y libfuse2
  elif have dnf; then
    sudo dnf install -y fuse-libs
  elif have zypper; then
    sudo zypper --non-interactive install fuse-libs
  elif have apk; then
    sudo apk add fuse
  else
    say "Could not detect a package manager. Install FUSE 2 manually, or use the portable tar.gz."
    return 1
  fi
}

install_fuse2 || say "Continuing without FUSE 2 (you can also run the AppImage with APPIMAGE_EXTRACT_AND_RUN=1)."

mkdir -p "$APP_DIR"
say "Downloading $APP_NAME ..."
if have curl; then
  curl -fL "$BASE/$APP_NAME" -o "$DEST"
elif have wget; then
  wget -O "$DEST" "$BASE/$APP_NAME"
else
  say "Need curl or wget to download. Aborting."
  exit 1
fi
chmod +x "$DEST"

say ""
say "Installed to $DEST"
say "Run it with: $DEST"
