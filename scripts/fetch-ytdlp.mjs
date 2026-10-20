#!/usr/bin/env node
/**
 * Download the standalone yt-dlp binary for the current platform into
 * `resources/bin/`, where electron-builder ships it as an extra resource.
 *
 *   node scripts/fetch-ytdlp.mjs          # skip if already present
 *   node scripts/fetch-ytdlp.mjs --force  # refresh to the latest release
 *
 * yt-dlp is public domain. The binary is not committed; packaging fetches it,
 * and running from source falls back to a system `yt-dlp` on PATH.
 */
import { createHash } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FORCE = process.argv.includes('--force')

function option(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const platform = option('--platform') ?? process.platform
const arch = option('--arch') ?? (platform === process.platform ? process.arch : 'x64')
const OUT_DIR = path.join(
  ROOT,
  'resources',
  'bin',
  platform === process.platform ? '' : platform
)

function assetFor(targetPlatform, targetArch) {
  if (targetPlatform === 'win32') {
    return targetArch === 'arm64' ? 'yt-dlp_arm64.exe' : 'yt-dlp.exe'
  }
  if (targetPlatform === 'darwin') return 'yt-dlp_macos'
  if (targetArch === 'arm64') return 'yt-dlp_linux_aarch64'
  if (targetArch === 'arm') return 'yt-dlp_linux_armv7l'
  return 'yt-dlp_linux'
}

const asset = assetFor(platform, arch)
const fileName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
const target = path.join(OUT_DIR, fileName)
const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`

async function exists(file) {
  try {
    const info = await stat(file)
    return info.isFile() && info.size > 1_000_000
  } catch {
    return false
  }
}

async function main() {
  if (!FORCE && (await exists(target))) {
    console.log(`[lagu] yt-dlp already bundled at ${path.relative(ROOT, target)}`)
    return
  }

  await mkdir(OUT_DIR, { recursive: true })
  const partial = `${target}.download`
  await rm(partial, { force: true })

  console.log(`[lagu] Downloading ${asset}…`)
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Lagu build script' }
  })
  if (!response.ok || !response.body) {
    throw new Error(`download failed: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength < 1_000_000) {
    throw new Error(`download looked too small (${buffer.byteLength} bytes)`)
  }
  await writeFile(partial, buffer)
  await rename(partial, target)
  if (process.platform !== 'win32') await chmod(target, 0o755)

  const digest = createHash('sha256').update(await readFile(target)).digest('hex').slice(0, 12)
  console.log(
    `[lagu] Bundled ${path.relative(ROOT, target)} (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB, sha256 ${digest}…)`
  )
}

main().catch((err) => {
  console.error(`[lagu] Could not bundle yt-dlp: ${err.message}`)
  process.exit(1)
})
