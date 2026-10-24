import { describe, it, expect } from 'vitest'
import { pitchShiftChannel } from '../pitch-shift'

const SAMPLE_RATE = 44100

function sine(freq: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(SAMPLE_RATE * seconds))
  for (let i = 0; i < out.length; i++) out[i] = Math.sin(2 * Math.PI * freq * i / SAMPLE_RATE)
  return out
}

// Estimate dominant frequency from zero crossings over the middle of the signal
function estimateFreq(data: Float32Array): number {
  const start = Math.floor(data.length / 4)
  const end = Math.floor(data.length * 3 / 4)
  let crossings = 0
  for (let i = start + 1; i < end; i++) {
    if (data[i - 1] < 0 && data[i] >= 0) crossings++
  }
  return crossings / ((end - start) / SAMPLE_RATE)
}

describe('pitchShiftChannel', () => {
  it('preserves length', () => {
    const input = sine(440, 0.5)
    expect(pitchShiftChannel(input, 3).length).toBe(input.length)
  })

  it('keeps frequency at 0 semitones', () => {
    const freq = estimateFreq(pitchShiftChannel(sine(440, 1), 0))
    expect(freq).toBeGreaterThan(430)
    expect(freq).toBeLessThan(450)
  })

  it('shifts up an octave at +12 semitones', () => {
    const freq = estimateFreq(pitchShiftChannel(sine(440, 1), 12))
    expect(freq).toBeGreaterThan(860)
    expect(freq).toBeLessThan(900)
  })

  it('shifts down at negative semitones', () => {
    const freq = estimateFreq(pitchShiftChannel(sine(440, 1), -5))
    const expected = 440 * 2 ** (-5 / 12)
    expect(Math.abs(freq - expected)).toBeLessThan(10)
  })

  it('is self-contained so it can run from its source in a Worker', () => {
    const fn = new Function(`return (${pitchShiftChannel.toString()})`)() as typeof pitchShiftChannel
    const input = sine(440, 0.2)
    expect(fn(input, 2)).toEqual(pitchShiftChannel(input, 2))
  })
})
