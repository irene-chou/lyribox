import type { LyricLine } from '@/types'

/**
 * Index of the last line whose time is <= `time` (-1 if before the first line).
 * Assumes `lyrics` is sorted by time, as produced by parseLRC().
 */
export function findActiveLineIndex(lyrics: LyricLine[], time: number): number {
  let lo = 0
  let hi = lyrics.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (lyrics[mid].time <= time) lo = mid + 1
    else hi = mid
  }
  return lo - 1
}
