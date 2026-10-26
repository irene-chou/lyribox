/** Minimal shape of AudioBuffer we read; lets tests pass a plain object. */
export interface PeakSource {
  numberOfChannels: number
  length: number
  getChannelData(channel: number): Float32Array
}

/**
 * Downsample a decoded audio buffer into `buckets` peak values (max absolute
 * sample across all channels), normalized so the loudest bucket is 1.
 *
 * Synchronous on purpose: a 10-minute 44.1 kHz stereo file is ~53M samples
 * and takes well under 100 ms on the main thread, so a Worker is not worth
 * the extra plumbing.
 */
export function computePeaks(buffer: PeakSource, buckets = 400): Float32Array {
  const peaks = new Float32Array(buckets)
  if (buckets <= 0 || buffer.length === 0 || buffer.numberOfChannels === 0) return peaks

  const samplesPerBucket = buffer.length / buckets

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let b = 0; b < buckets; b++) {
      const start = Math.floor(b * samplesPerBucket)
      const end = b === buckets - 1 ? data.length : Math.floor((b + 1) * samplesPerBucket)
      let peak = peaks[b]
      for (let i = start; i < end; i++) {
        const v = data[i]
        const abs = v < 0 ? -v : v
        if (abs > peak) peak = abs
      }
      peaks[b] = peak
    }
  }

  let max = 0
  for (let b = 0; b < buckets; b++) if (peaks[b] > max) max = peaks[b]
  if (max > 0) {
    for (let b = 0; b < buckets; b++) peaks[b] /= max
  }

  return peaks
}
