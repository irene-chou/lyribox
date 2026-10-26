/**
 * Center-channel cancellation ("去人聲").
 *
 * Most stereo mixes place the lead vocal dead center, i.e. identical in both
 * channels. Each channel is split into mid `(L + R) / 2` and side `(L − R) / 2`.
 * The mid part is dropped only inside the vocal band; below it (kick, bass) and
 * above it (cymbals, air) mid is kept, so the result keeps its low end and
 * stereo image instead of turning into thin, quiet "side only" audio.
 * Results still vary a lot with the mix — the UI must say so.
 */

/** Mid content below this frequency (Hz) is kept: kick drum and bass. */
export const VOCAL_BAND_LOW = 150
/** Mid content above this frequency (Hz) is kept: cymbals and air. */
export const VOCAL_BAND_HIGH = 7000

/** Never boost the result by more than this, even if it is very quiet. */
const MAX_GAIN = 4

type BiquadKind = 'lowpass' | 'highpass'

/** RBJ cookbook biquad (Q = 1/√2) applied in place. */
function biquad(data: Float32Array, kind: BiquadKind, freq: number, sampleRate: number): void {
  const w0 = (2 * Math.PI * Math.min(freq, sampleRate * 0.45)) / sampleRate
  const cos = Math.cos(w0)
  const alpha = Math.sin(w0) / Math.SQRT2
  const a0 = 1 + alpha
  const b1 = (kind === 'lowpass' ? 1 - cos : -(1 + cos)) / a0
  const b0 = (kind === 'lowpass' ? (1 - cos) / 2 : (1 + cos) / 2) / a0
  const b2 = b0
  const a1 = (-2 * cos) / a0
  const a2 = (1 - alpha) / a0

  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  for (let i = 0; i < data.length; i++) {
    const x = data[i]
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1
    x1 = x
    y2 = y1
    y1 = y
    data[i] = y
  }
}

/** 4th-order Linkwitz–Riley filter (two cascaded Butterworth biquads) in place. */
function linkwitzRiley(data: Float32Array, kind: BiquadKind, freq: number, sampleRate: number): void {
  biquad(data, kind, freq, sampleRate)
  biquad(data, kind, freq, sampleRate)
}

function peakOf(a: Float32Array): number {
  let p = 0
  for (let i = 0; i < a.length; i++) {
    const v = a[i] < 0 ? -a[i] : a[i]
    if (v > p) p = v
  }
  return p
}

function sumSquares(a: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * a[i]
  return s
}

/**
 * Apply center-channel cancellation to decoded per-channel sample data.
 * Mono input is returned unchanged (nothing to cancel). Multi-channel input
 * uses the first two channels and returns stereo. The result is scaled to the
 * original loudness (RMS), capped at MAX_GAIN and at the original peak.
 */
export function removeCenterChannel(channels: Float32Array[], sampleRate: number): Float32Array[] {
  if (channels.length < 2) return channels
  const left = channels[0]
  const right = channels[1]
  const length = Math.min(left.length, right.length)

  const low = new Float32Array(length)
  const side = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    low[i] = (left[i] + right[i]) / 2
    side[i] = (left[i] - right[i]) / 2
  }
  const high = low.slice()
  linkwitzRiley(low, 'lowpass', VOCAL_BAND_LOW, sampleRate)
  linkwitzRiley(high, 'highpass', VOCAL_BAND_HIGH, sampleRate)

  // Two distinct arrays: the worklet later transfers every channel's
  // ArrayBuffer back in one postMessage, and a duplicate buffer throws.
  const outL = new Float32Array(length)
  const outR = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const mid = low[i] + high[i]
    outL[i] = mid + side[i]
    outR[i] = mid - side[i]
  }

  const outEnergy = sumSquares(outL) + sumSquares(outR)
  const outPeak = Math.max(peakOf(outL), peakOf(outR))
  if (outEnergy === 0 || outPeak === 0) return [outL, outR]

  const originalEnergy = sumSquares(left.subarray(0, length)) + sumSquares(right.subarray(0, length))
  const originalPeak = Math.max(peakOf(left), peakOf(right))
  const gain = Math.min(Math.sqrt(originalEnergy / outEnergy), MAX_GAIN, originalPeak / outPeak)
  if (gain !== 1) {
    for (let i = 0; i < length; i++) {
      outL[i] *= gain
      outR[i] *= gain
    }
  }
  return [outL, outR]
}
