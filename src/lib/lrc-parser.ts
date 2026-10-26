import type { LyricLine, LyricWord } from '@/types'

export interface ParseResult {
  lyrics: LyricLine[]
  title: string | null
}

const LINE_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g
const WORD_TAG = /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>/g

function tagToSeconds(min: string, sec: string, frac: string | undefined): number {
  let ms = 0
  if (frac) {
    ms = frac.length === 3 ? parseInt(frac) : parseInt(frac) * 10
  }
  return parseInt(min) * 60 + parseInt(sec) + ms / 1000
}

/**
 * Parse LRC format text into an array of timed lyric lines.
 * Supports multiple time tags on the same line and Enhanced LRC
 * inline `<mm:ss.xx>` word tags.
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
    // Skip metadata tags
    if (/^\[(?:ti|ar|al|by|offset|re|ve):/i.test(line)) continue

    const times: number[] = []
    let match: RegExpExecArray | null
    LINE_TAG.lastIndex = 0
    while ((match = LINE_TAG.exec(line)) !== null) {
      times.push(tagToSeconds(match[1], match[2], match[3]))
    }

    // Extract text (everything after the last time tag)
    const rawText = line.replace(LINE_TAG, '')

    // Word timing only makes sense for a single line time: with repeated
    // line tags the absolute word times could belong to only one of them.
    const enhanced = times.length === 1 ? parseWords(rawText, times[0]) : null
    const textPart = enhanced ? enhanced.text : rawText.trim()

    for (const t of times) {
      const entry: LyricLine = { time: t, text: textPart }
      if (enhanced) {
        entry.words = enhanced.words
        if (enhanced.endTime !== undefined) entry.endTime = enhanced.endTime
      }
      result.push(entry)
    }
  }

  // Sort by time (stable, so same-timestamp lines keep file order)
  result.sort((a, b) => a.time - b.time)
  return { lyrics: mergeSameTimestamp(result), title }
}

interface EnhancedLine {
  text: string
  words: LyricWord[]
  endTime?: number
}

/**
 * Split an Enhanced LRC line body on `<mm:ss.xx>` tags. Text before the first
 * tag starts at `lineTime`; a trailing tag with nothing after it is the line's
 * end time. Returns null when the line has no inline tags.
 */
function parseWords(body: string, lineTime: number): EnhancedLine | null {
  WORD_TAG.lastIndex = 0
  if (!WORD_TAG.test(body)) return null
  WORD_TAG.lastIndex = 0

  const segments: { time: number; text: string }[] = []
  let lastIndex = 0
  let lastTime = lineTime
  let match: RegExpExecArray | null
  while ((match = WORD_TAG.exec(body)) !== null) {
    segments.push({ time: lastTime, text: body.slice(lastIndex, match.index) })
    lastTime = tagToSeconds(match[1], match[2], match[3])
    lastIndex = match.index + match[0].length
  }
  segments.push({ time: lastTime, text: body.slice(lastIndex) })

  // Leading / trailing whitespace of the whole line is dropped so the joined
  // word texts equal the plain `text`.
  segments[0].text = segments[0].text.replace(/^\s+/, '')
  segments[segments.length - 1].text = segments[segments.length - 1].text.replace(/\s+$/, '')

  let endTime: number | undefined
  const last = segments[segments.length - 1]
  if (last.text === '' && segments.length > 1) {
    endTime = last.time
    segments.pop()
  }

  // Whitespace-only segments carry no word; fold their spacing into the previous word
  const words: LyricWord[] = []
  for (const seg of segments) {
    if (seg.text.trim() === '') {
      if (words.length > 0) words[words.length - 1].text += seg.text
      continue
    }
    words.push({ time: seg.time, text: seg.text })
  }

  const text = words.map((w) => w.text).join('').trim()
  if (words.length === 0) return { text: '', words: [] , endTime }
  if (endTime !== undefined && endTime < words[words.length - 1].time) endTime = undefined
  return { text, words, endTime }
}

/**
 * Collapse consecutive lines sharing a timestamp into one line. The first
 * non-empty text becomes the primary line; the rest become `subText`
 * (translation / romanization convention used by many LRC exporters).
 * Word timing is kept from the primary line only.
 */
function mergeSameTimestamp(sorted: LyricLine[]): LyricLine[] {
  const merged: LyricLine[] = []
  let i = 0
  while (i < sorted.length) {
    const time = sorted[i].time
    const texts: string[] = []
    let primary: LyricLine | null = null
    while (i < sorted.length && Math.abs(sorted[i].time - time) < 0.0005) {
      const entry = sorted[i]
      if (entry.text && !texts.includes(entry.text)) {
        texts.push(entry.text)
        if (!primary) primary = entry
      }
      i++
    }
    if (texts.length === 0 || !primary) {
      merged.push({ time, text: '' })
      continue
    }
    const line: LyricLine = { time, text: texts[0] }
    if (primary.words && primary.words.length > 0) line.words = primary.words
    if (primary.endTime !== undefined) line.endTime = primary.endTime
    if (texts.length > 1) line.subText = texts.slice(1).join('\n')
    merged.push(line)
  }
  return merged
}
