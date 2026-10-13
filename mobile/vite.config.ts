import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the bundle loads from the Capacitor file:// origin on Android.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' }
})
