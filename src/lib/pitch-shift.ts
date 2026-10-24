/**
 * Phase vocoder pitch shift on a single channel. Preserves tempo while shifting
 * pitch by `semitones`.
 *
 * Must stay fully self-contained (no references to module scope): its source is
 * injected into an inline Blob Worker via Function.prototype.toString().
 */
export function pitchShiftChannel(input: Float32Array, semitones: number): Float32Array {
  const N = 2048 // FFT frame size
  const H = 256 // hop size (87.5% overlap)
  const TWO_PI = 2 * Math.PI
  const alpha = 2 ** (semitones / 12)
  const M = N / 2 + 1 // positive-frequency bins including DC and Nyquist
  const output = new Float32Array(input.length)

  // Precomputed FFT tables: bit-reversal permutation and twiddle factors
  const bitRev = new Uint32Array(N)
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1
    while (j & bit) { j ^= bit; bit >>= 1 }
    j ^= bit
    bitRev[i] = j
  }
  const cosTable = new Float64Array(N / 2)
  const sinTable = new Float64Array(N / 2)
  for (let i = 0; i < N / 2; i++) {
    cosTable[i] = Math.cos(TWO_PI * i / N)
    sinTable[i] = -Math.sin(TWO_PI * i / N)
  }

  // In-place radix-2 Cooley-Tukey FFT using the tables above
  const fft = (re: Float64Array, im: Float64Array, inverse: boolean) => {
    for (let i = 1; i < N; i++) {
      const j = bitRev[i]
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t
        t = im[i]; im[i] = im[j]; im[j] = t
      }
    }
    for (let len = 2; len <= N; len <<= 1) {
      const half = len >> 1
      const step = N / len
      for (let i = 0; i < N; i += len) {
        for (let k = 0; k < half; k++) {
          const cr = cosTable[k * step]
          const ci = inverse ? -sinTable[k * step] : sinTable[k * step]
          const a = i + k, b = a + half
          const br = re[b] * cr - im[b] * ci
          const bi = re[b] * ci + im[b] * cr
          re[b] = re[a] - br; im[b] = im[a] - bi
          re[a] += br; im[a] += bi
        }
      }
    }
    if (inverse) {
      for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N }
    }
  }

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

  for (let pos = 0; pos + N <= input.length; pos += H) {
    // Window input frame
    for (let i = 0; i < N; i++) { fRe[i] = input[pos + i] * win[i]; fIm[i] = 0 }
    fft(fRe, fIm, false)

    // Analysis: compute instantaneous frequency for each bin
    for (let k = 0; k < M; k++) {
      anlMag[k] = Math.hypot(fRe[k], fIm[k])
      const phase = Math.atan2(fIm[k], fRe[k])
      // Phase deviation from expected advance (2π * k * H / N), wrapped to [-π, π]
      let diff = phase - anlPhasePrev[k] - TWO_PI * k * H / N
      diff -= TWO_PI * Math.round(diff / TWO_PI)
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

    fft(oRe, oIm, true)

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
  return output
}

function createPitchWorker(): { worker: Worker; blobUrl: string } {
  const blob = new Blob(
    [
      `
      const pitchShiftChannel = ${pitchShiftChannel.toString()};
      self.onmessage = function(e) {
        const out = pitchShiftChannel(e.data.input, e.data.semitones);
        self.postMessage(out, [out.buffer]);
      };
    `,
    ],
    { type: 'application/javascript' },
  )
  const blobUrl = URL.createObjectURL(blob)
  return { worker: new Worker(blobUrl), blobUrl }
}

/**
 * Pitch-shift an AudioBuffer by `semitones` while preserving tempo.
 * Each channel is processed in its own Worker so the main thread stays responsive.
 * Returns null if aborted.
 */
export async function pitchShiftBuffer(
  src: AudioBuffer,
  semitones: number,
  ctx: AudioContext,
  signal: AbortSignal,
): Promise<AudioBuffer | null> {
  if (signal.aborted) return null

  const jobs = Array.from({ length: src.numberOfChannels }, () => createPitchWorker())
  const cleanup = () => {
    for (const { worker, blobUrl } of jobs) {
      worker.terminate()
      URL.revokeObjectURL(blobUrl)
    }
  }

  try {
    const aborted = new Promise<null>((resolve) => {
      signal.addEventListener('abort', () => resolve(null), { once: true })
    })
    const channels = Promise.all(
      jobs.map(({ worker }, ch) => new Promise<Float32Array<ArrayBuffer>>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent<Float32Array<ArrayBuffer>>) => resolve(e.data)
        worker.onerror = (e) => reject(new Error(e.message))
        // Copy: transferring getChannelData()'s buffer would detach the source
        const input = src.getChannelData(ch).slice()
        worker.postMessage({ input, semitones }, [input.buffer])
      })),
    )

    const result = await Promise.race([channels, aborted])
    if (!result) return null

    const out = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate)
    result.forEach((data, ch) => out.copyToChannel(data, ch))
    return out
  } finally {
    cleanup()
  }
}
