import { describe, it, expect } from 'vitest'
import { removeCenterChannel } from '../vocal-removal'

const SR = 44100

const sine = (freq: number, amp: number, seconds = 1) =>
  Float32Array.from({ length: SR * seconds }, (_, i) => amp * Math.sin((2 * Math.PI * freq * i) / SR))

/** RMS of the second half, after the filters have settled. */
const rms = (a: Float32Array) => {
  const tail = a.subarray(a.length / 2)
  return Math.sqrt(tail.reduce((s, v) => s + v * v, 0) / tail.length)
}

/** Amplitude of one frequency in the second half (single-bin DFT). */
const toneAmp = (a: Float32Array, freq: number) => {
  const start = a.length / 2
  let re = 0
  let im = 0
  for (let i = start; i < a.length; i++) {
    re += a[i] * Math.cos((2 * Math.PI * freq * i) / SR)
    im += a[i] * Math.sin((2 * Math.PI * freq * i) / SR)
  }
  return (2 * Math.hypot(re, im)) / (a.length - start)
}

const peak = (a: Float32Array) => a.reduce((p, v) => Math.max(p, Math.abs(v)), 0)

const add = (a: Float32Array, b: Float32Array) => a.map((v, i) => v + b[i])

describe('removeCenterChannel', () => {
  it('returns mono input unchanged', () => {
    const mono = [new Float32Array([0.1, 0.2])]
    expect(removeCenterChannel(mono, SR)).toBe(mono)
  })

  it('removes a centered vocal-band tone but keeps a centered bass tone', () => {
    const mix = add(sine(1000, 0.4), sine(60, 0.4))
    const [l] = removeCenterChannel([mix, mix.slice()], SR)
    expect(toneAmp(l, 1000)).toBeLessThan(0.01)
    expect(toneAmp(l, 60)).toBeGreaterThan(0.35)
  })

  it('keeps hard-panned content and its stereo image', () => {
    const guitar = sine(1000, 0.5)
    const [l, r] = removeCenterChannel([guitar, new Float32Array(guitar.length)], SR)
    expect(rms(l)).toBeGreaterThan(rms(r) * 0.9)
    // Left and right are opposite in the vocal band (side signal only)
    expect(rms(add(l, r))).toBeLessThan(rms(l) * 0.1)
  })

  it('restores the original loudness when it can', () => {
    const left = add(sine(1000, 0.3), sine(440, 0.2))
    const right = sine(1000, 0.3)
    const [l, r] = removeCenterChannel([left, right], SR)
    const outRms = Math.hypot(rms(l), rms(r))
    const inRms = Math.hypot(rms(left), rms(right))
    // Capped by the original peak, but far louder than the raw (L−R)/2
    expect(outRms).toBeGreaterThan(inRms * 0.4)
    expect(peak(l)).toBeLessThanOrEqual(Math.max(peak(left), peak(right)) + 1e-6)
  })

  it('never boosts by more than 4×', () => {
    const left = sine(1000, 0.5)
    const right = sine(1000, 0.495)
    const [l] = removeCenterChannel([left, right], SR)
    // raw side amplitude is 0.0025, plus ~-60 dB mid leakage through the filters
    expect(toneAmp(l, 1000)).toBeLessThanOrEqual(0.0025 * 4 * 1.2)
  })

  it('handles channels of different length by using the shorter one', () => {
    const out = removeCenterChannel([new Float32Array([1, 1, 1]), new Float32Array([0, 0])], SR)
    expect(out[0].length).toBe(2)
  })

  it('returns silence for silent input without dividing by zero', () => {
    const out = removeCenterChannel([new Float32Array(3), new Float32Array(3)], SR)
    expect(Array.from(out[0])).toEqual([0, 0, 0])
  })

  it('ignores channels beyond the first two', () => {
    const out = removeCenterChannel([sine(1000, 0.5), sine(1000, 0.5), sine(1000, 0.9)], SR)
    expect(out).toHaveLength(2)
  })

  it('returns two distinct arrays so the worklet can transfer both buffers back', () => {
    const [l, r] = removeCenterChannel([new Float32Array([1, 0]), new Float32Array([0, 1])], SR)
    expect(l).not.toBe(r)
    expect(l.buffer).not.toBe(r.buffer)
  })
})
