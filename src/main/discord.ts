import { Client } from '@xhayper/discord-rpc'

export interface DiscordPresence {
  title: string
  artist: string
  album?: string
  position?: number
  duration?: number
  playing: boolean
}

let client: Client | null = null
let clientId = ''
let enabled = false
let connected = false
let connecting = false
let current: DiscordPresence | null = null
let retryTimer: NodeJS.Timeout | null = null

function clip(text: string, max = 128): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function clearRetry(): void {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
}

function scheduleRetry(): void {
  if (!enabled || !clientId || retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    void connect()
  }, 15000)
  retryTimer.unref?.()
}

async function teardown(): Promise<void> {
  clearRetry()
  connected = false
  const old = client
  client = null
  if (old) {
    try {
      await old.destroy()
    } catch {
      /* ignore */
    }
  }
}

async function connect(): Promise<void> {
  if (!enabled || !clientId || connecting || connected) return
  connecting = true
  clearRetry()
  await teardown()
  if (!enabled || !clientId) {
    connecting = false
    return
  }

  const instance = new Client({ clientId })
  // Keep the module reference in place before connecting so the 'connected'
  // handler (which fires mid-connect) can read `client.user`.
  client = instance

  const markReady = (): void => {
    connected = true
    void push()
  }
  // `connect()` resolves on the "connected" event (the plain IPC/READY path);
  // "ready" is only emitted by the OAuth `login()` path. Listen for both.
  instance.on('connected', markReady)
  instance.on('ready', markReady)
  instance.on('disconnected', () => {
    connected = false
    if (client === instance) scheduleRetry()
  })

  try {
    await instance.connect()
  } catch {
    // Discord isn't running (or the id is wrong) - try again later.
    if (client === instance) {
      client = null
      connected = false
      try {
        await instance.destroy()
      } catch {
        /* ignore */
      }
      scheduleRetry()
    }
  } finally {
    connecting = false
  }
}

async function push(): Promise<void> {
  const user = client?.user
  if (!connected || !user) return
  try {
    if (!current || !current.playing) {
      await user.clearActivity()
      return
    }
    await user.setActivity({
      details: clip(current.title),
      state: clip(current.artist + (current.album ? ` · ${current.album}` : '')),
      startTimestamp: Date.now() - Math.max(0, (current.position ?? 0) * 1000),
      instance: false
    })
  } catch {
    /* ignore transient RPC errors */
  }
}

/** Apply the Discord settings; connects/disconnects only when they change. */
export function configureDiscord(options: { enabled: boolean; clientId: string }): void {
  const changed = options.enabled !== enabled || options.clientId !== clientId
  enabled = options.enabled
  clientId = options.clientId
  if (!changed) return
  if (enabled && clientId) void connect()
  else void teardown()
}

/** Update the "now playing" activity (null clears it). */
export function setNowPlaying(info: DiscordPresence | null): void {
  current = info
  void push()
}

export function destroyDiscord(): void {
  enabled = false
  void teardown()
}
