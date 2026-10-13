#!/usr/bin/env node
/**
 * Android (.apk) placeholder.
 *
 * Electron cannot emit an APK, so Android will be a separate shell that reuses
 * the existing renderer (src/renderer) as a static web app:
 *
 *   1. Add Capacitor: `npm i -D @capacitor/cli @capacitor/core @capacitor/android`
 *   2. `npx cap init Lagu com.lagu.musicplayer --web-dir=out/renderer`
 *   3. `npx cap add android`
 *   4. Provide a mobile-friendly bridge for the `window.lagu` API — the desktop
 *      one lives in src/preload; Android needs its own implementation backed by
 *      Capacitor plugins (filesystem, media, http) instead of Electron IPC.
 *   5. `npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)`
 *
 * Everything that talks to the OS is already isolated behind the `window.lagu`
 * contract in src/shared/ipc.ts, so only that bridge needs a mobile backend.
 */
console.log('[lagu] Android/.apk build is not wired up yet.')
console.log('[lagu] The renderer + window.lagu contract are ready for a Capacitor shell.')
console.log('[lagu] See the comments in scripts/build-apk.mjs for the steps.')
process.exit(0)
