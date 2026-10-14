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
let ready = false
let connecting = false
let current: DiscordPresence | null = null

function clip(text: string, max = 128): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

async function teardown(): Promise<void> {
  const c = client
  client = null
  ready = false
  if (c) {
    try {
      await c.destroy()
    } catch {
      /* ignore */
    }
  }
}

async function connect(): Promise<void> {
  if (!enabled || !clientId || connecting) return
  connecting = true
  await teardown()
  try {
    const c = new Client({ clientId })
    c.on('ready', () => {
      ready = true
      void push()
    })
    c.on('disconnected', () => {
      ready = false
    })
    await c.connect()
    client = c
  } catch {
    // Discord isn't running or the id is wrong - stay silent.
    client = null
    ready = false
  } finally {
    connecting = false
  }
}

async function push(): Promise<void> {
  if (!ready || !client?.user) return
  try {
    if (!current || !current.playing) {
      await client.user.clearActivity()
      return
    }
    await client.user.setActivity({
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
  void teardown()
}
