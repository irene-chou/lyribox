/**
 * Center-channel cancellation ("去人聲").
 *
 * Most stereo mixes place the lead vocal dead center, i.e. identical in both
 * channels. Each channel is split into mid `(L + R) / 2` and side `(L − R) / 2`.
 * The side signal (stereo-panned instruments, reverb) is kept and brought up to
 * the original peak; of the mid only the lowest band is kept (kick, bass) so the
 * result is not thin. Mid highs are dropped on purpose: they carry the vocal's
 * sibilance and, in lossy files, codec noise that sounds like distortion once
 * the rest of the vocal is gone. Results still vary a lot with the mix — the UI
 * must say so.
 */

/** Mid content below this frequency (Hz) is kept: kick drum and bass. */
export const BASS_CUTOFF = 120

/** Never boost the side signal by more than this, even if it is very quiet. */
const MAX_GAIN = 4

/** RBJ cookbook low-pass biquad (Q = 1/√2) applied in place. */
function lowpass(data: Float32Array, freq: number, sampleRate: number): void {
  const w0 = (2 * Math.PI * Math.min(freq, sampleRate * 0.45)) / sampleRate
  const cos = Math.cos(w0)
  const alpha = Math.sin(w0) / Math.SQRT2
  const a0 = 1 + alpha
  const b1 = (1 - cos) / a0
  const b0 = b1 / 2
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

/** 4th-order Linkwitz–Riley low-pass (two cascaded Butterworth biquads) in place. */
function linkwitzRileyLowpass(data: Float32Array, freq: number, sampleRate: number): void {
  lowpass(data, freq, sampleRate)
  lowpass(data, freq, sampleRate)
}

function peakOf(a: Float32Array): number {
  let p = 0
  for (let i = 0; i < a.length; i++) {
    const v = a[i] < 0 ? -a[i] : a[i]
    if (v > p) p = v
  }
  return p
}

/**
 * Apply center-channel cancellation to decoded per-channel sample data.
 * Mono input is returned unchanged (nothing to cancel). Multi-channel input
 * uses the first two channels and returns stereo, never louder than the
 * original peak.
 */
export function removeCenterChannel(channels: Float32Array[], sampleRate: number): Float32Array[] {
  if (channels.length < 2) return channels
  const left = channels[0]
  const right = channels[1]
  const length = Math.min(left.length, right.length)

  const bass = new Float32Array(length)
  const side = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    bass[i] = (left[i] + right[i]) / 2
    side[i] = (left[i] - right[i]) / 2
  }
  linkwitzRileyLowpass(bass, BASS_CUTOFF, sampleRate)

  const originalPeak = Math.max(peakOf(left), peakOf(right))
  const sidePeak = peakOf(side)
  const sideGain = sidePeak > 0 ? Math.min(originalPeak / sidePeak, MAX_GAIN) : 1

  // Two distinct arrays: the worklet later transfers every channel's
  // ArrayBuffer back in one postMessage, and a duplicate buffer throws.
  const outL = new Float32Array(length)
  const outR = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const s = side[i] * sideGain
    outL[i] = bass[i] + s
    outR[i] = bass[i] - s
  }

  const outPeak = Math.max(peakOf(outL), peakOf(outR))
  if (outPeak > originalPeak && outPeak > 0) {
    const gain = originalPeak / outPeak
    for (let i = 0; i < length; i++) {
      outL[i] *= gain
      outR[i] *= gain
    }
  }
  return [outL, outR]
}
