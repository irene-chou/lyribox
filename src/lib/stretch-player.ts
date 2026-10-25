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

export class StretchPlayer {
  private playing = false
  private lastInputTime = 0
  private lastInputAt = 0

  private readonly node: StretchNodeLike
  private readonly clock: Clock

  constructor(node: StretchNodeLike, clock: Clock) {
    this.node = node
    this.clock = clock
  }

  /** Replace the node's sample buffers with the given per-channel data. */
  async load(channels: Float32Array[]): Promise<void> {
    await this.node.dropBuffers()
    await this.node.addBuffers(channels)
    this.playing = false
    this.lastInputTime = 0
    this.lastInputAt = this.clock.currentTime
  }

  async start(offset: number, semitones: number): Promise<void> {
    this.playing = true
    this.lastInputTime = offset
    this.lastInputAt = this.clock.currentTime
    await this.node.schedule({ active: true, input: offset, rate: 1, semitones })
  }

  async stop(): Promise<void> {
    if (this.playing) {
      // Freeze the interpolated position at the moment of stopping.
      this.lastInputTime = this.getCurrentTime()
      this.lastInputAt = this.clock.currentTime
      this.playing = false
    }
    await this.node.schedule({ active: false })
  }

  /** Change pitch in place; playback position and state are untouched. */
  async setSemitones(semitones: number): Promise<void> {
    await this.node.schedule({ semitones })
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
