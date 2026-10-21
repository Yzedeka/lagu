import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Content Security Policy for the packaged renderer. Local media and artwork
// come through lagu://; URL tracks may stream from any http(s) host. Only
// injected into production builds, since the dev server relies on inline
// scripts and a websocket for HMR.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' lagu: data: blob:",
  "font-src 'self' data:",
  "media-src 'self' lagu: blob: http: https:",
  "connect-src 'self' lagu:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ')

function cspPlugin(): Plugin {
  return {
    name: 'lagu-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend'
      }
    ]
  }
}

export default defineConfig({
  main: {
    // Bundle music-metadata (ESM-only) into the CJS main bundle to avoid
    // require(ESM) interop issues at runtime.
    plugins: [externalizeDepsPlugin({ exclude: ['music-metadata'] })],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), cspPlugin()]
  }
})
