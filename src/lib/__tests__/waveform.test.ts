import { describe, it, expect } from 'vitest'
import { computePeaks, type PeakSource } from '../waveform'

function fakeBuffer(channels: number[][]): PeakSource {
  const data = channels.map((c) => Float32Array.from(c))
  return {
    numberOfChannels: data.length,
    length: data[0]?.length ?? 0,
    getChannelData: (ch) => data[ch],
  }
}

/** Float32Array loses precision on values like 0.2, so compare approximately. */
function expectClose(actual: Float32Array, expected: number[]) {
  expect(actual).toHaveLength(expected.length)
  expected.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 5))
}

describe('computePeaks', () => {
  it('returns the requested number of buckets', () => {
    const peaks = computePeaks(fakeBuffer([new Array(1000).fill(0.5)]), 50)
    expect(peaks).toHaveLength(50)
  })

  it('takes the max absolute value per bucket and normalizes to 1', () => {
    // 8 samples, 4 buckets → pairs
    const peaks = computePeaks(fakeBuffer([[0.1, -0.2, 0.4, 0.3, -1.0, 0.5, 0.0, 0.25]]), 4)
    expectClose(peaks, [0.2, 0.4, 1.0, 0.25])
  })

  it('merges channels by taking the loudest sample across them', () => {
    const peaks = computePeaks(fakeBuffer([[0.1, 0.1], [0.5, 0.0]]), 2)
    expectClose(peaks, [1.0, 0.2])
  })

  it('handles sample counts that do not divide evenly into buckets', () => {
    const peaks = computePeaks(fakeBuffer([[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]]), 3)
    expect(peaks[0]).toBe(1)
    expect(peaks[1]).toBe(0)
    // Last bucket absorbs the remainder so the final sample is never dropped
    expect(peaks[2]).toBe(1)
  })

  it('returns zeros for silence instead of dividing by zero', () => {
    const peaks = computePeaks(fakeBuffer([[0, 0, 0, 0]]), 2)
    expect(Array.from(peaks)).toEqual([0, 0])
  })

  it('returns zeros for an empty buffer', () => {
    const peaks = computePeaks(fakeBuffer([[]]), 3)
    expect(Array.from(peaks)).toEqual([0, 0, 0])
  })
})
