import { describe, it, expect } from 'vitest'
import { sideSignal, removeCenterChannel } from '../vocal-removal'

const peak = (a: Float32Array) => Math.max(...Array.from(a, Math.abs))

describe('sideSignal', () => {
  it('cancels a signal that is identical in both channels', () => {
    const l = new Float32Array([0.5, -0.3, 0.8])
    const r = new Float32Array([0.5, -0.3, 0.8])
    expect(Array.from(sideSignal(l, r))).toEqual([0, 0, 0])
  })

  it('keeps hard-panned content and normalizes to the original peak', () => {
    const l = new Float32Array([0.8, 0, 0.4])
    const r = new Float32Array([0, -0.8, 0])
    const out = sideSignal(l, r)
    // raw side = [0.4, 0.4, 0.2], peak 0.4 → scaled ×2 to match original peak 0.8
    expect(Array.from(out).map((v) => +v.toFixed(6))).toEqual([0.8, 0.8, 0.4])
  })

  it('never boosts by more than 4×', () => {
    // Nearly centered: side is tiny compared to the original
    const l = new Float32Array([1.0, 1.0])
    const r = new Float32Array([0.99, 0.99])
    const out = sideSignal(l, r)
    expect(peak(out)).toBeCloseTo(0.005 * 4, 6)
  })

  it('never exceeds the original peak', () => {
    const l = new Float32Array([0.6, -0.6, 0.1])
    const r = new Float32Array([-0.6, 0.6, -0.1])
    const out = sideSignal(l, r)
    expect(peak(out)).toBeLessThanOrEqual(0.6 + 1e-6)
  })

  it('handles channels of different length by using the shorter one', () => {
    const out = sideSignal(new Float32Array([1, 1, 1]), new Float32Array([0, 0]))
    expect(out.length).toBe(2)
  })

  it('returns silence for silent input without dividing by zero', () => {
    const out = sideSignal(new Float32Array(3), new Float32Array(3))
    expect(Array.from(out)).toEqual([0, 0, 0])
  })
})

describe('removeCenterChannel', () => {
  it('returns mono input unchanged', () => {
    const mono = [new Float32Array([0.1, 0.2])]
    expect(removeCenterChannel(mono)).toBe(mono)
  })

  it('returns two identical side channels for stereo input', () => {
    const out = removeCenterChannel([new Float32Array([0.8, 0]), new Float32Array([0, 0.8])])
    expect(out).toHaveLength(2)
    expect(out[0]).toBe(out[1])
    expect(Array.from(out[0]).map((v) => +v.toFixed(6))).toEqual([0.8, -0.8])
  })

  it('ignores channels beyond the first two', () => {
    const out = removeCenterChannel([
      new Float32Array([0.5]),
      new Float32Array([0.5]),
      new Float32Array([0.9]),
    ])
    expect(Array.from(out[0])).toEqual([0])
  })
})
