import { describe, it, expect } from 'vitest'
import { findActiveLineIndex, findActiveWordIndex, wordProgress } from '../lyrics-sync'

const lyrics = [
  { time: 1, text: 'a' },
  { time: 2, text: 'b' },
  { time: 2, text: 'b2' },
  { time: 5, text: 'c' },
]

describe('findActiveLineIndex', () => {
  it('returns -1 for empty lyrics', () => {
    expect(findActiveLineIndex([], 3)).toBe(-1)
  })

  it('returns -1 before the first line', () => {
    expect(findActiveLineIndex(lyrics, 0.5)).toBe(-1)
  })

  it('activates a line exactly at its timestamp', () => {
    expect(findActiveLineIndex(lyrics, 1)).toBe(0)
  })

  it('returns the line between timestamps', () => {
    expect(findActiveLineIndex(lyrics, 4.9)).toBe(2)
  })

  it('picks the last of duplicate timestamps', () => {
    expect(findActiveLineIndex(lyrics, 2)).toBe(2)
  })

  it('returns the last line after the end', () => {
    expect(findActiveLineIndex(lyrics, 100)).toBe(3)
  })
})

describe('findActiveWordIndex', () => {
  const words = [
    { time: 10, text: 'a ' },
    { time: 10.5, text: 'b ' },
    { time: 11, text: 'c' },
  ]
  it('returns -1 before the first word', () => {
    expect(findActiveWordIndex(words, 9.9)).toBe(-1)
  })
  it('returns the last word whose time <= t', () => {
    expect(findActiveWordIndex(words, 10)).toBe(0)
    expect(findActiveWordIndex(words, 10.7)).toBe(1)
    expect(findActiveWordIndex(words, 99)).toBe(2)
  })
})

describe('wordProgress', () => {
  const words = [
    { time: 10, text: 'a ' },
    { time: 10.5, text: 'b ' },
    { time: 11, text: 'c' },
  ]
  it('interpolates between this word and the next', () => {
    expect(wordProgress(words, 0, 10.25)).toBeCloseTo(0.5)
    expect(wordProgress(words, 0, 9)).toBe(0)
    expect(wordProgress(words, 0, 12)).toBe(1)
  })
  it('uses endTime for the last word', () => {
    expect(wordProgress(words, 2, 11.5, 12)).toBeCloseTo(0.5)
  })
  it('fills the last word instantly without endTime', () => {
    expect(wordProgress(words, 2, 11)).toBe(1)
  })
  it('returns 0 for an out-of-range index', () => {
    expect(wordProgress(words, 5, 11)).toBe(0)
  })
})
