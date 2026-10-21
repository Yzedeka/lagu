#!/usr/bin/env bash
# Build a pacman-installable package for Lagu from the electron-builder
# linux-unpacked output. Installs to /opt/Lagu with a stable desktop entry, so
# the app always launches from a fixed path (no AppImage mount to lose).
#
#   scripts/build-arch.sh
#
# Requires makepkg + fakeroot (Arch). Run after `npx electron-builder --linux dir`.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

VERSION="$(node -p "require('./package.json').version")"
APPDIR="build/linux-unpacked"

if [ ! -d "$APPDIR" ]; then
  echo "missing $APPDIR - build it first (npx electron-builder --linux dir)" >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cp -a "$APPDIR" "$WORK/app"
cp build/icon.png "$WORK/icon.png"
cp LICENSE "$WORK/LICENSE"

cat > "$WORK/lagu.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Lagu
GenericName=Music Player
Comment=A minimalist desktop music player for your local music library
Exec=lagu %U
Icon=lagu
Terminal=false
Categories=AudioVideo;Audio;Player;GTK;
Keywords=music;player;audio;library;
MimeType=audio/mpeg;audio/mp4;audio/aac;audio/flac;audio/ogg;audio/x-wav;audio/x-ms-wma;
StartupWMClass=lagu
EOF

cat > "$WORK/PKGBUILD" <<EOF
pkgname=lagu
pkgver=${VERSION}
pkgrel=1
pkgdesc="A minimalist desktop music player for your local music library"
arch=('x86_64')
url="https://lagu.yzedeka.com"
license=('LicenseRef-PolyForm-Noncommercial-1.0.0')
depends=('gtk3' 'nss' 'libxss' 'libxtst' 'alsa-lib' 'libnotify' 'libsecret' 'xdg-utils' 'at-spi2-core' 'libcups')
options=('!strip' '!debug')
package() {
  install -dm755 "\$pkgdir/opt/Lagu"
  cp -a "\$startdir/app/." "\$pkgdir/opt/Lagu/"
  install -dm755 "\$pkgdir/usr/bin"
  ln -sf /opt/Lagu/lagu-music-player "\$pkgdir/usr/bin/lagu"
  install -Dm644 "\$startdir/lagu.desktop" "\$pkgdir/usr/share/applications/lagu.desktop"
  install -Dm644 "\$startdir/icon.png" "\$pkgdir/usr/share/icons/hicolor/512x512/apps/lagu.png"
  install -Dm644 "\$startdir/LICENSE" "\$pkgdir/usr/share/licenses/lagu/LICENSE"
}
EOF

cd "$WORK"
makepkg -f --nodeps --noconfirm >/tmp/lagu-makepkg.log 2>&1 || { tail -20 /tmp/lagu-makepkg.log; exit 1; }

PKG="$(ls lagu-${VERSION}-*.pkg.tar.zst)"
cp "$PKG" "$REPO/build/$PKG"
echo "Built build/$PKG"
