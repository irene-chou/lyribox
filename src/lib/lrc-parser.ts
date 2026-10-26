import type { LyricLine } from '@/types'

export interface ParseResult {
  lyrics: LyricLine[]
  title: string | null
}

// Matches [mm:ss.xx], [mm:ss:xx] and [mm:ss]
const TIME_TAG_SOURCE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/.source

/** True for LRC metadata lines such as [ti:], [ar:], [offset:]. */
export function isMetadataLine(line: string): boolean {
  return /^\[(?:ti|ar|al|by|offset|re|ve):/i.test(line)
}

/** Extract every time tag on a line (in seconds) plus the remaining text. */
export function parseTimeTags(line: string): { times: number[]; text: string } {
  const regex = new RegExp(TIME_TAG_SOURCE, 'g')
  const times: number[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(line)) !== null) {
    const min = parseInt(match[1])
    const sec = parseInt(match[2])
    let ms = 0
    if (match[3]) {
      const msStr = match[3]
      ms = msStr.length === 3 ? parseInt(msStr) : parseInt(msStr) * 10
    }
    times.push(min * 60 + sec + ms / 1000)
  }
  const text = line.replace(new RegExp(TIME_TAG_SOURCE, 'g'), '').trim()
  return { times, text }
}

/**
 * Parse LRC format text into an array of timed lyric lines.
 * Supports multiple time tags on the same line.
 */
export function parseLRC(text: string): ParseResult {
  const lines = text.split('\n')
  const result: LyricLine[] = []
  let title: string | null = null

  // Extract [ti:] for song title
  for (const line of lines) {
    const tiMatch = line.match(/^\[ti:\s*(.+?)\s*\]/i)
    if (tiMatch) {
      title = tiMatch[1]
      break
    }
  }

  for (const line of lines) {
    if (isMetadataLine(line)) continue

    const { times, text } = parseTimeTags(line)
    for (const t of times) {
      result.push({ time: t, text })
    }
  }

  // Sort by time (stable, so same-timestamp lines keep file order)
  result.sort((a, b) => a.time - b.time)
  return { lyrics: mergeSameTimestamp(result), title }
}

/**
 * Collapse consecutive lines sharing a timestamp into one line. The first
 * non-empty text becomes the primary line; the rest become `subText`
 * (translation / romanization convention used by many LRC exporters).
 */
function mergeSameTimestamp(sorted: LyricLine[]): LyricLine[] {
  const merged: LyricLine[] = []
  let i = 0
  while (i < sorted.length) {
    const time = sorted[i].time
    const texts: string[] = []
    while (i < sorted.length && Math.abs(sorted[i].time - time) < 0.0005) {
      const text = sorted[i].text
      if (text && !texts.includes(text)) texts.push(text)
      i++
    }
    if (texts.length === 0) {
      merged.push({ time, text: '' })
    } else if (texts.length === 1) {
      merged.push({ time, text: texts[0] })
    } else {
      merged.push({ time, text: texts[0], subText: texts.slice(1).join('\n') })
    }
  }
  return merged
}
