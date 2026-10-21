import type { Track } from '@shared/types'
import { playableUrl } from '@shared/media'

export type EngineEvent = 'play' | 'pause' | 'time' | 'duration' | 'ended' | 'error' | 'loaded'

/**
 * Wraps playback with two local-file audio elements so tracks can crossfade.
 *
 * Local files run through the Web Audio graph (each element → gain → master →
 * destination + analyser), which is what makes a sample-accurate crossfade
 * possible. Remote streams stay on the native output path - routing a
 * cross-origin stream through Web Audio would silence it - so streams never
 * crossfade and simply report no analyser data.
 */
export class PlayerEngine {
  private readonly fileEls: [HTMLAudioElement, HTMLAudioElement]
  private readonly streamEl: HTMLAudioElement
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private mix: GainNode | null = null
  private panner: PannerNode | null = null
  private analyserNode: AnalyserNode | null = null
  private eightD = false
  private rotationNodes: { osc: OscillatorNode[]; gains: GainNode[] } | null = null
  private readonly sources: (MediaElementAudioSourceNode | null)[] = [null, null]
  private readonly gains: (GainNode | null)[] = [null, null]
  private slot = 0
  private streamActive = false
  private currentId: string | null = null
  private nextTrack: Track | null = null
  private crossfadeSeconds = 0
  private crossfading = false
  private crossfadeTimer: number | null = null
  private crossfadeOutSlot: number | null = null
  private loadToken = 0
  private ticker: number | null = null
  private readonly handlers = new Map<EngineEvent, Set<() => void>>()
  private readonly crossfadeHandlers = new Set<(trackId: string) => void>()

  constructor() {
    const a = new Audio()
    const b = new Audio()
    for (const el of [a, b]) {
      el.preload = 'auto'
      // CORS mode is required for Web Audio to receive samples from lagu://.
      el.crossOrigin = 'anonymous'
    }
    this.fileEls = [a, b]
    this.streamEl = new Audio()
    this.streamEl.preload = 'metadata'
    this.wire(a)
    this.wire(b)
    this.wire(this.streamEl)
  }

  on(event: EngineEvent, cb: () => void): () => void {
    const set = this.handlers.get(event) ?? new Set()
    set.add(cb)
    this.handlers.set(event, set)
    return () => set.delete(cb)
  }

  /** Called when a crossfade hands playback to the next track. */
  onCrossfade(cb: (trackId: string) => void): () => void {
    this.crossfadeHandlers.add(cb)
    return () => this.crossfadeHandlers.delete(cb)
  }

  private emit(event: EngineEvent): void {
    this.handlers.get(event)?.forEach((cb) => cb())
  }

  private active(): HTMLAudioElement {
    return this.streamActive ? this.streamEl : this.fileEls[this.slot]
  }

  private wire(el: HTMLAudioElement): void {
    const guard = (fn: () => void) => () => {
      if (el === this.active()) fn()
    }
    el.addEventListener('play', guard(() => this.emit('play')))
    el.addEventListener('pause', guard(() => this.emit('pause')))
    el.addEventListener('timeupdate', guard(() => this.emit('time')))
    el.addEventListener('durationchange', guard(() => this.emit('duration')))
    el.addEventListener('loadedmetadata', guard(() => this.emit('loaded')))
    el.addEventListener('ended', guard(() => this.emit('ended')))
    el.addEventListener('error', guard(() => this.emit('error')))
    el.addEventListener('seeking', guard(() => this.emit('time')))
  }

  get analyser(): AnalyserNode | null {
    return this.analyserNode
  }

  get currentTime(): number {
    return this.active().currentTime || 0
  }

  get duration(): number {
    const d = this.active().duration
    return Number.isFinite(d) ? d : 0
  }

  get paused(): boolean {
    return this.active().paused
  }

  get currentTrackId(): string | null {
    return this.currentId
  }

  get isCrossfading(): boolean {
    return this.crossfading
  }

  private ensureGraph(slot: number): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.analyserNode = this.ctx.createAnalyser()
      this.analyserNode.fftSize = 1024
      this.analyserNode.smoothingTimeConstant = 0.75
      this.master.connect(this.ctx.destination)
      this.master.connect(this.analyserNode)

      this.mix = this.ctx.createGain()
      this.panner = this.ctx.createPanner()
      this.panner.panningModel = 'HRTF'
      this.panner.distanceModel = 'inverse'
      this.panner.refDistance = 1
      this.panner.rolloffFactor = 0.5
      this.panner.connect(this.master)
      this.applyRouting()
    }
    if (!this.sources[slot]) {
      const source = this.ctx.createMediaElementSource(this.fileEls[slot])
      const gain = this.ctx.createGain()
      gain.gain.value = 1
      source.connect(gain)
      gain.connect(this.mix as GainNode)
      this.sources[slot] = source
      this.gains[slot] = gain
    }
  }

  /** Route the mix either straight to the master or through the 8D panner. */
  private applyRouting(): void {
    if (!this.mix || !this.master || !this.panner) return
    try {
      this.mix.disconnect()
    } catch {
      /* not connected yet */
    }
    if (this.eightD) {
      this.mix.connect(this.panner)
      this.startRotation()
    } else {
      this.mix.connect(this.master)
      this.stopRotation()
    }
  }

  private startRotation(): void {
    if (!this.ctx || !this.panner || this.rotationNodes) return
    if (typeof this.panner.positionX === 'undefined') return
    const ctx = this.ctx
    const panner = this.panner
    // One full revolution every ~12 seconds, driven at audio rate so the
    // position changes smoothly (no per-tick steps = no clicks/pops).
    const freq = 1 / 12
    const radius = 1.8

    const sine = ctx.createOscillator()
    sine.type = 'sine'
    sine.frequency.value = freq

    const cosine = ctx.createOscillator()
    cosine.frequency.value = freq
    // A "cosine" wave: the first harmonic as a real (cosine) term.
    cosine.setPeriodicWave(
      ctx.createPeriodicWave(Float32Array.from([0, 1]), Float32Array.from([0, 0]))
    )

    const gainX = ctx.createGain()
    gainX.gain.value = radius
    const gainZ = ctx.createGain()
    gainZ.gain.value = -radius

    panner.positionX.value = 0
    panner.positionY.value = 0
    panner.positionZ.value = 0

    sine.connect(gainX).connect(panner.positionX)
    cosine.connect(gainZ).connect(panner.positionZ)
    sine.start()
    cosine.start()

    this.rotationNodes = { osc: [sine, cosine], gains: [gainX, gainZ] }
  }

  private stopRotation(): void {
    const nodes = this.rotationNodes
    if (!nodes) return
    for (const osc of nodes.osc) {
      try {
        osc.stop()
      } catch {
        /* already stopped */
      }
      try {
        osc.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    for (const gain of nodes.gains) {
      try {
        gain.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    if (this.panner) {
      this.panner.positionX.value = 0
      this.panner.positionZ.value = 0
    }
    this.rotationNodes = null
  }

  async load(track: Track, autoplay: boolean): Promise<void> {
    const token = ++this.loadToken
    this.cancelCrossfade()
    this.nextTrack = null
    this.stopAll()

    this.streamActive = track.source === 'url'
    if (this.streamActive) {
      this.streamEl.src = playableUrl(track)
      this.streamEl.load()
    } else {
      this.ensureGraph(this.slot)
      const gain = this.gains[this.slot]
      if (gain && this.ctx) {
        gain.gain.cancelScheduledValues(this.ctx.currentTime)
        gain.gain.setValueAtTime(1, this.ctx.currentTime)
      }
      const el = this.fileEls[this.slot]
      el.src = playableUrl(track)
      el.load()
    }
    this.currentId = track.id

    if (!autoplay) return
    try {
      if (this.ctx && this.ctx.state === 'suspended' && !this.streamActive) await this.ctx.resume()
      if (token !== this.loadToken) return
      await this.active().play()
      this.startTicker()
    } catch (err) {
      if (token !== this.loadToken) return
      throw err
    }
  }

  async play(): Promise<void> {
    try {
      if (this.ctx && this.ctx.state === 'suspended' && !this.streamActive) await this.ctx.resume()
      await this.active().play()
      this.startTicker()
    } catch (err) {
      this.emit('error')
      throw err
    }
  }

  pause(): void {
    // Mid-crossfade the outgoing track is still audible on the other element;
    // finish the fade now so pausing silences everything.
    if (this.crossfading) this.finishCrossfade()
    this.active().pause()
    this.stopTicker()
  }

  private stopAll(): void {
    for (const el of [...this.fileEls, this.streamEl]) {
      try {
        el.pause()
      } catch {
        /* ignore */
      }
    }
    this.stopTicker()
  }

  stop(): void {
    this.stopAll()
    this.cancelCrossfade()
    this.nextTrack = null
    this.loadToken += 1
    this.currentId = null
  }

  seek(seconds: number): void {
    if (!Number.isFinite(seconds)) return
    try {
      this.active().currentTime = Math.max(0, seconds)
      this.emit('time')
    } catch {
      /* not seekable yet */
    }
  }

  setVolume(volume: number): void {
    const v = Math.min(1, Math.max(0, volume))
    this.fileEls[0].volume = v
    this.fileEls[1].volume = v
    this.streamEl.volume = v
  }

  setMuted(muted: boolean): void {
    this.fileEls[0].muted = muted
    this.fileEls[1].muted = muted
    this.streamEl.muted = muted
  }

  setCrossfade(seconds: number): void {
    this.crossfadeSeconds = Math.max(0, Math.min(20, seconds))
  }

  /** Enable/disable the rotating 8D spatial effect (local files only). */
  set8D(enabled: boolean): void {
    if (this.eightD === enabled) return
    this.eightD = enabled
    this.applyRouting()
  }

  /** Preload / remember the track to blend into. */
  setNextTrack(track: Track | null): void {
    this.nextTrack = track
    if (!track || track.source === 'url' || this.crossfadeSeconds <= 0 || this.crossfading) return
    const inSlot = 1 - this.slot
    const el = this.fileEls[inSlot]
    const url = playableUrl(track)
    if (el.src !== url) {
      try {
        el.src = url
        el.load()
      } catch {
        /* ignore */
      }
    }
  }

  // --- crossfade ------------------------------------------------------------
  private startTicker(): void {
    if (this.ticker != null) return
    this.ticker = window.setInterval(() => this.tick(), 200)
  }

  private stopTicker(): void {
    if (this.ticker != null) {
      window.clearInterval(this.ticker)
      this.ticker = null
    }
  }

  private tick(): void {
    if (this.crossfading || this.streamActive || this.crossfadeSeconds <= 0) return
    const next = this.nextTrack
    if (!next || !this.currentId) return
    const dur = this.duration
    if (dur <= 0) return
    // Never crossfade a track shorter than the crossfade window (would skip it).
    if (dur <= this.crossfadeSeconds) return
    if (
      dur - this.currentTime <= this.crossfadeSeconds &&
      this.currentTime > 0.3 &&
      dur - this.currentTime > 0.05
    ) {
      void this.startCrossfade(next)
    }
  }

  private async startCrossfade(next: Track): Promise<void> {
    if (this.crossfading) return
    if (!this.ctx) return
    const token = this.loadToken
    this.crossfading = true
    this.nextTrack = null

    const outSlot = this.slot
    const inSlot = 1 - outSlot
    this.ensureGraph(inSlot)
    const inEl = this.fileEls[inSlot]
    const url = playableUrl(next)
    if (inEl.src !== url) {
      inEl.src = url
      inEl.load()
    }

    const now = this.ctx.currentTime
    const duration = this.crossfadeSeconds
    const outGain = this.gains[outSlot]
    const inGain = this.gains[inSlot]
    if (outGain) {
      outGain.gain.cancelScheduledValues(now)
      outGain.gain.setValueAtTime(outGain.gain.value, now)
      outGain.gain.linearRampToValueAtTime(0.0001, now + duration)
    }
    if (inGain) {
      inGain.gain.cancelScheduledValues(now)
      inGain.gain.setValueAtTime(0.0001, now)
      inGain.gain.linearRampToValueAtTime(1, now + duration)
    }

    try {
      await inEl.play()
    } catch (err) {
      console.error('[lagu] crossfade play failed', err)
      if (token !== this.loadToken) return
      // Keep the current track playing; it will advance normally when it ends.
      try {
        inEl.pause()
      } catch {
        /* ignore */
      }
      this.resetGain(outSlot)
      this.crossfading = false
      return
    }
    // A load/stop happened while waiting for play(); it owns playback now.
    if (token !== this.loadToken) return
    // The user paused while the incoming element was starting; don't flip the
    // active slot or resume a track they just stopped.
    if (!this.crossfading) {
      try {
        inEl.pause()
      } catch {
        /* ignore */
      }
      this.resetGain(inSlot)
      return
    }

    this.slot = inSlot
    this.currentId = next.id
    this.crossfadeOutSlot = outSlot
    this.crossfadeHandlers.forEach((cb) => cb(next.id))

    this.crossfadeTimer = window.setTimeout(() => this.finishCrossfade(), duration * 1000 + 60)
  }

  /** Stop the outgoing element and settle both gains at full volume. */
  private finishCrossfade(): void {
    if (this.crossfadeTimer != null) {
      window.clearTimeout(this.crossfadeTimer)
      this.crossfadeTimer = null
    }
    const outSlot = this.crossfadeOutSlot
    this.crossfadeOutSlot = null
    if (outSlot != null) {
      try {
        const out = this.fileEls[outSlot]
        out.pause()
        out.removeAttribute('src')
        out.load()
      } catch {
        /* ignore */
      }
      this.resetGain(outSlot)
    }
    this.resetGain(this.slot)
    this.crossfading = false
  }

  /**
   * Drop a pending crossfade cleanup without touching the element sources, so
   * a track preloaded into the other slot after a skip is not wiped.
   */
  private cancelCrossfade(): void {
    if (this.crossfadeTimer != null) {
      window.clearTimeout(this.crossfadeTimer)
      this.crossfadeTimer = null
    }
    if (this.crossfadeOutSlot != null) this.resetGain(this.crossfadeOutSlot)
    this.crossfadeOutSlot = null
    this.crossfading = false
  }

  private resetGain(slot: number): void {
    const g = this.gains[slot]
    if (g && this.ctx) {
      g.gain.cancelScheduledValues(this.ctx.currentTime)
      g.gain.setValueAtTime(1, this.ctx.currentTime)
    }
  }
}

/**
 * Single shared engine. `createMediaElementSource` may only be called once per
 * element, so the engine must be a module singleton rather than per-component.
 */
export const engine = new PlayerEngine()
