#!/bin/sh
# Launch the bundled Electron binary through the Flatpak sandbox shim.
exec zypak-wrapper /app/main/lagu-music-player "$@"
