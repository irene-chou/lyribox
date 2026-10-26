/**
 * Thin wrapper around a Signalsmith Stretch AudioWorkletNode.
 *
 * The node holds the decoded sample buffers itself and plays them back with a
 * real-time pitch shift, so changing the key never requires reprocessing.
 */

export interface StretchSchedule {
  output?: number
  active?: boolean
  input?: number
  rate?: number
  semitones?: number
  tonalityHz?: number
  formantSemitones?: number
  formantCompensation?: boolean
  formantBaseHz?: number
}

/** The subset of the StretchNode API we rely on (see signalsmith-stretch README). */
export interface StretchNodeLike {
  inputTime: number
  addBuffers(buffers: Float32Array[]): Promise<number>
  dropBuffers(toSeconds?: number): Promise<unknown>
  schedule(change: StretchSchedule): Promise<unknown>
  setUpdateInterval(seconds: number, callback?: (inputTime: number) => void): Promise<unknown>
  connect(destination: AudioNode): AudioNode
  disconnect(): void
}

interface Clock {
  readonly currentTime: number
}

/**
 * Channels that share an ArrayBuffer are copied so each has its own. The
 * worklet's dropBuffers() transfers every channel buffer back in one message
 * and a duplicate in that list throws inside the worklet, which never replies.
 */
export function withDistinctBuffers(channels: Float32Array[]): Float32Array[] {
  const seen = new Set<ArrayBufferLike>()
  return channels.map((ch) => {
    if (seen.has(ch.buffer)) return ch.slice()
    seen.add(ch.buffer)
    return ch
  })
}

export class StretchPlayer {
  private playing = false
  private lastInputTime = 0
  private lastInputAt = 0
  // The worklet answers requests in order and cannot tell interleaved calls
  // apart, so every node operation goes through this chain. Without it, a
  // buffer swap racing a new file load leaves a promise that never settles.
  private queue: Promise<unknown> = Promise.resolve()

  private readonly node: StretchNodeLike
  private readonly clock: Clock

  constructor(node: StretchNodeLike, clock: Clock) {
    this.node = node
    this.clock = clock
  }

  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    const next = this.queue.then(op, op)
    this.queue = next.catch(() => undefined)
    return next
  }

  /** Replace the node's sample buffers with the given per-channel data. */
  load(channels: Float32Array[]): Promise<void> {
    return this.enqueue(async () => {
      await this.node.dropBuffers()
      await this.node.addBuffers(withDistinctBuffers(channels))
      this.playing = false
      this.lastInputTime = 0
      this.lastInputAt = this.clock.currentTime
    })
  }

  start(offset: number, semitones: number): Promise<void> {
    this.playing = true
    this.lastInputTime = offset
    this.lastInputAt = this.clock.currentTime
    return this.enqueue(async () => {
      await this.node.schedule({ active: true, input: offset, rate: 1, semitones })
    })
  }

  stop(): Promise<void> {
    if (this.playing) {
      // Freeze the interpolated position at the moment of stopping.
      this.lastInputTime = this.getCurrentTime()
      this.lastInputAt = this.clock.currentTime
      this.playing = false
    }
    return this.enqueue(async () => {
      await this.node.schedule({ active: false })
    })
  }

  /** Change pitch in place; playback position and state are untouched. */
  setSemitones(semitones: number): Promise<void> {
    return this.enqueue(async () => {
      await this.node.schedule({ semitones })
    })
  }

  /** Called with the worklet's reported input time and the context time it arrived. */
  handleTimeUpdate(inputTime: number, at: number): void {
    this.lastInputTime = inputTime
    this.lastInputAt = at
  }

  getCurrentTime(): number {
    if (!this.playing) return this.lastInputTime
    return this.lastInputTime + (this.clock.currentTime - this.lastInputAt)
  }

  isPlaying(): boolean {
    return this.playing
  }

  connect(destination: AudioNode): void {
    this.node.connect(destination)
  }

  disconnect(): void {
    this.node.disconnect()
  }
}

type StretchFactory = (
  ctx: AudioContext,
  options?: AudioWorkletNodeOptions,
) => Promise<StretchNodeLike>

let factoryPromise: Promise<StretchFactory> | null = null

/**
 * Load the Signalsmith Stretch library (WASM + worklet, ~110KB) on first use.
 * Imported by URL so the bundler leaves the self-stringifying worklet code intact.
 */
async function loadFactory(): Promise<StretchFactory> {
  if (!factoryPromise) {
    factoryPromise = (async () => {
      const { default: url } = await import('signalsmith-stretch?url')
      const mod = await import(/* @vite-ignore */ url)
      return mod.default as StretchFactory
    })()
  }
  return factoryPromise
}

/**
 * Create a stereo StretchPlayer on the given context. Mono input is handled by
 * the worklet (it reuses channel 0 for both outputs).
 */
export async function createStretchPlayer(ctx: AudioContext): Promise<StretchPlayer> {
  const factory = await loadFactory()
  // Keep one (unconnected) input: with `numberOfInputs: 0` the worklet's idle
  // path in signalsmith-stretch 1.3.2 reads `inputList[0].length` on undefined,
  // the processor throws on its first process() call and is dead for good —
  // no error surfaces on the main thread, playback is simply silent.
  const node = await factory(ctx, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  })
  const player = new StretchPlayer(node, ctx)
  await node.setUpdateInterval(0.05, (inputTime) => {
    player.handleTimeUpdate(inputTime, ctx.currentTime)
  })
  return player
}
