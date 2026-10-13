#!/usr/bin/env bash
# Build a Flatpak bundle of Lagu into build/.
#
# Requires flatpak + flatpak-builder. If flatpak-builder is not installed
# system-wide, this uses the org.flatpak.Builder flatpak instead:
#   flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
#   flatpak install --user -y flathub org.flatpak.Builder
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./package.json').version")"

echo "==> Building the app (unpacked Linux)"
npm run build
npx electron-builder --linux dir

BUILDER=(flatpak-builder)
if ! command -v flatpak-builder >/dev/null 2>&1; then
  if flatpak info org.flatpak.Builder >/dev/null 2>&1; then
    BUILDER=(flatpak run org.flatpak.Builder)
  else
    echo "flatpak-builder is not available. See the header of this script." >&2
    exit 1
  fi
fi

echo "==> Building the Flatpak"
"${BUILDER[@]}" --user --install --force-clean \
  --install-deps-from=flathub \
  --repo=flatpak/repo \
  flatpak/build-dir \
  flatpak/com.lagu.musicplayer.yml

echo "==> Bundling build/Lagu-${VERSION}.flatpak"
mkdir -p build
flatpak build-bundle flatpak/repo "build/Lagu-${VERSION}.flatpak" com.lagu.musicplayer
echo "Done: build/Lagu-${VERSION}.flatpak"
