import type { LyricLine, LyricWord } from '@/types'

/**
 * Index of the last word whose time is <= `time` (-1 if before the first word).
 */
export function findActiveWordIndex(words: LyricWord[], time: number): number {
  let idx = -1
  for (let i = 0; i < words.length; i++) {
    if (words[i].time <= time) idx = i
    else break
  }
  return idx
}

/**
 * Fill progress (0..1) of word `index` at `time`. The word ends where the next
 * word starts, or at `endTime`; a last word without an end fills instantly.
 */
export function wordProgress(words: LyricWord[], index: number, time: number, endTime?: number): number {
  const word = words[index]
  if (!word) return 0
  const end = index + 1 < words.length ? words[index + 1].time : endTime
  if (end === undefined || end <= word.time) return 1
  const p = (time - word.time) / (end - word.time)
  return p < 0 ? 0 : p > 1 ? 1 : p
}

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
