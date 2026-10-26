/**
 * Center-channel cancellation ("去人聲").
 *
 * Most stereo mixes place the lead vocal dead center, i.e. identical in both
 * channels. Subtracting one channel from the other removes everything that is
 * centered and leaves the "side" signal (stereo-panned instruments, reverb).
 * Results vary a lot with the mix — the UI must say so.
 */

/** Never boost the side signal by more than this, even if it is very quiet. */
const MAX_GAIN = 4

/**
 * Side signal `(L − R) / 2`, scaled so its peak matches the original peak (but
 * never boosted by more than MAX_GAIN and never above the original peak).
 */
export function sideSignal(left: Float32Array, right: Float32Array): Float32Array {
  const length = Math.min(left.length, right.length)
  const out = new Float32Array(length)
  let originalPeak = 0
  let sidePeak = 0
  for (let i = 0; i < length; i++) {
    const l = left[i]
    const r = right[i]
    const side = (l - r) / 2
    out[i] = side
    const al = l < 0 ? -l : l
    const ar = r < 0 ? -r : r
    const as = side < 0 ? -side : side
    if (al > originalPeak) originalPeak = al
    if (ar > originalPeak) originalPeak = ar
    if (as > sidePeak) sidePeak = as
  }
  if (sidePeak === 0 || originalPeak === 0) return out

  const gain = Math.min(originalPeak / sidePeak, MAX_GAIN)
  if (gain !== 1) {
    for (let i = 0; i < length; i++) out[i] *= gain
  }
  return out
}

/**
 * Apply center-channel cancellation to decoded per-channel sample data.
 * Mono input is returned unchanged (nothing to cancel). Multi-channel input
 * uses the first two channels; the result is always stereo with identical
 * channels so it plays back as centered "side" audio.
 */
export function removeCenterChannel(channels: Float32Array[]): Float32Array[] {
  if (channels.length < 2) return channels
  const side = sideSignal(channels[0], channels[1])
  return [side, side]
}
