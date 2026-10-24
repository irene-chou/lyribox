import { describe, it, expect } from 'vitest'
import { findActiveLineIndex } from '../lyrics-sync'

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
