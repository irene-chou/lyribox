const TWO_PI = 2 * Math.PI

// In-place Cooley-Tukey FFT (radix-2, DIT)
function fftInPlace(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length
  // Bit-reversal permutation
  let j = 0
  for (let i = 1; i < n; i++) {
    let bit = n >> 1
    while (j & bit) { j ^= bit; bit >>= 1 }
    j ^= bit
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t
      t = im[i]; im[i] = im[j]; im[j] = t
    }
  }
  // Butterfly passes
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1
    const ang = (inverse ? TWO_PI : -TWO_PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < half; k++) {
        const ar = re[i + k], ai = im[i + k]
        const br = re[i + k + half] * cr - im[i + k + half] * ci
        const bi = re[i + k + half] * ci + im[i + k + half] * cr
        re[i + k] = ar + br; im[i + k] = ai + bi
        re[i + k + half] = ar - br; im[i + k + half] = ai - bi
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n }
  }
}

function wrapPhase(p: number): number {
  while (p > Math.PI) p -= TWO_PI
  while (p < -Math.PI) p += TWO_PI
  return p
}

// Phase vocoder pitch shift on a single channel, with periodic async yields.
// Preserves tempo while shifting pitch by `semitones`.
async function processChannel(
  input: Float32Array,
  output: Float32Array,
  semitones: number,
  N: number,
  H: number,
  signal: AbortSignal,
): Promise<void> {
  const alpha = 2 ** (semitones / 12)
  const M = N / 2 + 1 // positive-frequency bins including DC and Nyquist

  // Hann window
  const win = new Float64Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(TWO_PI * i / N)

  // Overlap-add normalization (sum of win^2 contributions per sample)
  const normFactor = new Float64Array(output.length)

  // Phase vocoder state
  const anlPhasePrev = new Float64Array(M)
  const synPhase = new Float64Array(M)

  // Per-frame scratch arrays
  const fRe = new Float64Array(N), fIm = new Float64Array(N)
  const oRe = new Float64Array(N), oIm = new Float64Array(N)
  const anlMag = new Float64Array(M), trueBinFreq = new Float64Array(M)
  const outMag = new Float64Array(M), outFreq = new Float64Array(M)

  let frame = 0
  for (let pos = 0; pos + N <= input.length; pos += H, frame++) {
    if (signal.aborted) return
    // Yield to event loop every 64 frames (~370ms of audio) to keep UI responsive
    if (frame % 64 === 0 && frame > 0) await new Promise(r => setTimeout(r, 0))

    // Window input frame
    for (let i = 0; i < N; i++) { fRe[i] = input[pos + i] * win[i]; fIm[i] = 0 }
    fftInPlace(fRe, fIm, false)

    // Analysis: compute instantaneous frequency for each bin
    for (let k = 0; k < M; k++) {
      anlMag[k] = Math.hypot(fRe[k], fIm[k])
      const phase = Math.atan2(fIm[k], fRe[k])
      // Phase deviation from expected advance (2π * k * H / N)
      const diff = wrapPhase(phase - anlPhasePrev[k] - TWO_PI * k * H / N)
      anlPhasePrev[k] = phase
      // True instantaneous frequency in fractional bin units
      trueBinFreq[k] = k + diff * N / (TWO_PI * H)
    }

    // Scatter input bins to pitch-shifted output bins (highest magnitude wins)
    outMag.fill(0); outFreq.fill(0)
    for (let k = 0; k < M; k++) {
      const nk = Math.round(k * alpha)
      if (nk < M && anlMag[k] > outMag[nk]) {
        outMag[nk] = anlMag[k]
        outFreq[nk] = trueBinFreq[k] * alpha
      }
    }

    // Synthesis: accumulate phase and reconstruct spectrum
    oRe.fill(0); oIm.fill(0)
    for (let nk = 0; nk < M; nk++) {
      synPhase[nk] += H * TWO_PI * outFreq[nk] / N
      oRe[nk] = outMag[nk] * Math.cos(synPhase[nk])
      oIm[nk] = outMag[nk] * Math.sin(synPhase[nk])
    }
    // Conjugate mirror for real-valued output
    for (let k = 1; k < N / 2; k++) { oRe[N - k] = oRe[k]; oIm[N - k] = -oIm[k] }
    oIm[0] = 0; oIm[N / 2] = 0

    fftInPlace(oRe, oIm, true)

    // Overlap-add with synthesis window
    for (let i = 0; i < N; i++) {
      const n = pos + i
      if (n < output.length) {
        output[n] += oRe[i] * win[i]
        normFactor[n] += win[i] * win[i]
      }
    }
  }

  // Normalize by overlap envelope (handles edge samples automatically)
  for (let i = 0; i < output.length; i++) {
    if (normFactor[i] > 1e-8) output[i] /= normFactor[i]
  }
}

/**
 * Pitch-shift an AudioBuffer by `semitones` while preserving tempo.
 * Uses a phase vocoder (FFT-based) — avoids WSOLA artifacts on processed audio.
 * Returns null if aborted.
 */
export async function pitchShiftBuffer(
  src: AudioBuffer,
  semitones: number,
  ctx: AudioContext,
  signal: AbortSignal,
): Promise<AudioBuffer | null> {
  const N = 2048 // FFT frame size
  const H = 256  // hop size (87.5% overlap)

  const out = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate)

  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    if (signal.aborted) return null
    await processChannel(src.getChannelData(ch), out.getChannelData(ch), semitones, N, H, signal)
  }

  return signal.aborted ? null : out
}
