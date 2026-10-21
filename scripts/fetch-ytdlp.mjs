#!/usr/bin/env node
/**
 * Download the standalone yt-dlp + ffmpeg binaries for a platform into
 * `resources/bin/`, where electron-builder ships them as extra resources.
 *
 *   node scripts/fetch-ytdlp.mjs                    # current platform
 *   node scripts/fetch-ytdlp.mjs --platform=win32 --arch=x64
 *   node scripts/fetch-ytdlp.mjs --force            # refresh everything
 *   node scripts/fetch-ytdlp.mjs --version=2026.08.19 # another yt-dlp release
 *
 * yt-dlp is pinned (YTDLP_VERSION) and checked against that release's
 * SHA2-256SUMS before it is bundled. Bump the constant to update.
 *
 * yt-dlp is public domain; the ffmpeg builds come from ffmpeg-static
 * (eugeneware/ffmpeg-static). Binaries are not committed. Running from source
 * still falls back to system tools on PATH.
 */
import { createHash } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

/** Pinned yt-dlp release tag. */
const YTDLP_VERSION = '2026.08.19'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BIN = path.join(ROOT, 'resources', 'bin')
const FORCE = process.argv.includes('--force')

function option(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const ytdlpVersion = option('--version') ?? YTDLP_VERSION
const platform = option('--platform') ?? process.platform
const arch = option('--arch') ?? (platform === process.platform ? process.arch : 'x64')
const windows = platform === 'win32'
const darwin = platform === 'darwin'
const cross = platform !== process.platform

// yt-dlp for macOS is universal, so it lives in bin/darwin. ffmpeg is
// architecture-specific and lives in bin/darwin/<arch>.
const toolDir = darwin ? path.join(BIN, 'darwin') : cross ? path.join(BIN, platform) : BIN
const ffDir = darwin ? path.join(toolDir, arch) : toolDir

const ytdlpName = windows ? 'yt-dlp.exe' : 'yt-dlp'
const ffmpegName = windows ? 'ffmpeg.exe' : 'ffmpeg'

function ytdlpAsset() {
  if (windows) return arch === 'arm64' ? 'yt-dlp_arm64.exe' : 'yt-dlp.exe'
  if (darwin) return 'yt-dlp_macos'
  if (arch === 'arm64') return 'yt-dlp_linux_aarch64'
  if (arch === 'arm') return 'yt-dlp_linux_armv7l'
  return 'yt-dlp_linux'
}

async function exists(file) {
  try {
    const info = await stat(file)
    return info.isFile() && info.size > 1_000_000
  } catch {
    return false
  }
}

async function fetchOk(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Lagu build script' }
  })
  if (!response.ok || !response.body) {
    throw new Error(`download failed: ${url} ${response.status} ${response.statusText}`)
  }
  return response
}

async function download(url, target, { gzip = false, label, sha256 } = {}) {
  await mkdir(path.dirname(target), { recursive: true })
  const partial = `${target}.download`
  await rm(partial, { force: true })

  console.log(`[lagu] Downloading ${label ?? path.basename(target)}…`)
  const response = await fetchOk(url)

  let buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength < 1_000_000) {
    throw new Error(`download looked too small (${buffer.byteLength} bytes)`)
  }
  if (sha256) {
    const actual = createHash('sha256').update(buffer).digest('hex')
    if (actual !== sha256) {
      throw new Error(`checksum mismatch for ${label ?? url}: expected ${sha256}, got ${actual}`)
    }
  }
  if (gzip) buffer = gunzipSync(buffer)
  await writeFile(partial, buffer)
  await rename(partial, target)
  if (!windows) await chmod(target, 0o755)

  const digest = createHash('sha256').update(await readFile(target)).digest('hex').slice(0, 12)
  console.log(
    `[lagu] Bundled ${path.relative(ROOT, target)} (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB, sha256 ${digest}…${sha256 ? ' verified' : ''})`
  )
}

async function readStamp(file) {
  try {
    return (await readFile(file, 'utf8')).trim()
  } catch {
    return ''
  }
}

/** Expected sha256 for `asset`, from the release's SHA2-256SUMS. */
async function ytdlpDigest(releaseBase, asset) {
  const sums = await (await fetchOk(`${releaseBase}/SHA2-256SUMS`)).text()
  for (const line of sums.split('\n')) {
    const [digest, name] = line.trim().split(/\s+\*?/)
    if (name === asset && /^[0-9a-f]{64}$/.test(digest)) return digest
  }
  throw new Error(`no checksum for ${asset} in yt-dlp ${ytdlpVersion} SHA2-256SUMS`)
}

async function fetchYtdlp() {
  const target = path.join(toolDir, ytdlpName)
  const stamp = `${target}.version`
  if (!FORCE && (await exists(target)) && (await readStamp(stamp)) === ytdlpVersion) {
    console.log(`[lagu] yt-dlp ${ytdlpVersion} already bundled at ${path.relative(ROOT, target)}`)
    return
  }
  const asset = ytdlpAsset()
  const releaseBase = `https://github.com/yt-dlp/yt-dlp/releases/download/${ytdlpVersion}`
  await download(`${releaseBase}/${asset}`, target, {
    label: `yt-dlp ${ytdlpVersion} (${asset})`,
    sha256: await ytdlpDigest(releaseBase, asset)
  })
  await writeFile(stamp, `${ytdlpVersion}\n`)
}

async function fetchFfmpeg() {
  const target = path.join(ffDir, ffmpegName)
  if (!FORCE && (await exists(target))) {
    console.log(`[lagu] ffmpeg already bundled at ${path.relative(ROOT, target)}`)
    return
  }
  // ffmpeg-static has no Windows arm64 build; x64 runs under emulation.
  const ffmpegArch = windows ? 'x64' : arch
  const asset = `ffmpeg-${platform}-${ffmpegArch}.gz`
  await download(
    `https://github.com/eugeneware/ffmpeg-static/releases/latest/download/${asset}`,
    target,
    { gzip: true, label: asset }
  )
}

async function main() {
  console.log(`[lagu] Bundling media tools for ${platform}/${arch}`)
  await fetchYtdlp()
  await fetchFfmpeg()
}

main().catch((err) => {
  console.error(`[lagu] Could not bundle media tools: ${err.message}`)
  process.exit(1)
})
