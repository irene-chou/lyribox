import { isMetadataLine, parseTimeTags } from './lrc-parser'

export interface MergeResult {
  /** New LRC text with translation lines inserted as duplicate-timestamp lines. */
  lrcText: string
  /** Translation lines attached to a primary line within tolerance. */
  matched: number
  /** Translation lines dropped (no primary tag close enough, or a closer one won the slot). */
  unmatched: number
}

/** Format seconds as an LRC time tag [mm:ss.xx]. */
export function formatTimeTag(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 100))
  const min = Math.floor(total / 6000)
  const sec = Math.floor((total % 6000) / 100)
  const cs = total % 100
  return `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}]`
}

interface Slot {
  time: number
  translation?: string
  diff: number
}

interface PrimaryLine {
  raw: string
  slots: Slot[]
}

/**
 * Merge a separate translation / romanization LRC into the primary LRC.
 *
 * Each translation line is attached to the nearest primary time tag within
 * `toleranceSec` (one translation per tag; the closest wins). The result
 * repeats that timestamp on a following line so `parseLRC` turns it into
 * `subText`. Metadata and untimed lines of the primary are preserved as-is;
 * unmatched translation lines are dropped.
 */
export function mergeTranslationLrc(
  primaryLrc: string,
  translationLrc: string,
  toleranceSec = 0.3,
): MergeResult {
  const primaryLines: PrimaryLine[] = primaryLrc.split('\n').map((raw) => {
    if (isMetadataLine(raw)) return { raw, slots: [] }
    const { times } = parseTimeTags(raw)
    return { raw, slots: times.map((time) => ({ time, diff: Infinity })) }
  })
  const slots = primaryLines.flatMap((l) => l.slots)

  let matched = 0
  let unmatched = 0

  for (const raw of translationLrc.split('\n')) {
    if (isMetadataLine(raw)) continue
    const { times, text } = parseTimeTags(raw)
    if (times.length === 0 || !text) continue

    for (const t of times) {
      let best: Slot | null = null
      let bestDiff = Infinity
      for (const slot of slots) {
        const diff = Math.abs(slot.time - t)
        if (diff < bestDiff) {
          bestDiff = diff
          best = slot
        }
      }
      if (!best || bestDiff > toleranceSec + 1e-9) {
        unmatched++
        continue
      }
      if (best.translation !== undefined) {
        // Slot already taken: keep whichever translation is closer.
        if (bestDiff < best.diff) {
          best.translation = text
          best.diff = bestDiff
        }
        unmatched++
        continue
      }
      best.translation = text
      best.diff = bestDiff
      matched++
    }
  }

  const out: string[] = []
  for (const line of primaryLines) {
    out.push(line.raw)
    for (const slot of line.slots) {
      if (slot.translation) out.push(`${formatTimeTag(slot.time)}${slot.translation}`)
    }
  }

  return { lrcText: out.join('\n'), matched, unmatched }
}
