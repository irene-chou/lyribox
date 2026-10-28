/**
 * Helpers for the 打軸 (timing) editor: a line-oriented view of an LRC
 * document where each lyric line may or may not have a timestamp yet.
 */

export interface TimingLine {
  /** Seconds, or null when the line has not been stamped yet. */
  time: number | null
  text: string
}

export interface TimingDocument {
  /** Metadata lines such as `[ti:...]`, re-emitted verbatim at the top. */
  meta: string[]
  lines: TimingLine[]
}

const META_RE = /^\[(?:ti|ar|al|by|offset|re|ve|length|au):/i
const TIME_TAG_RE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g

function round2(seconds: number): number {
  return Math.round(seconds * 100) / 100
}

/** Format seconds as a `[mm:ss.xx]` LRC time tag. */
export function formatLrcTimestamp(seconds: number): string {
  return `[${formatTimestampValue(seconds)}]`
}

/** Format seconds as `mm:ss.xx` (no brackets), for the editable input. */
export function formatTimestampValue(seconds: number): string {
  const s = Math.max(0, round2(seconds))
  const m = Math.floor(s / 60)
  const rest = s - m * 60
  const whole = Math.floor(rest)
  const cs = Math.round((rest - whole) * 100)
  // Guard against 59.995 → "60.00"
  if (cs === 100) return formatTimestampValue(m * 60 + whole + 1)
  return `${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

/**
 * Parse a user-typed timestamp (`mm:ss.xx`, `m:ss`, `mm:ss:xx`, with or
 * without brackets). Returns null when it is not a valid timestamp.
 */
export function parseTimestampInput(input: string): number | null {
  const m = input.trim().match(/^\[?(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]?$/)
  if (!m) return null
  const min = parseInt(m[1])
  const sec = parseInt(m[2])
  if (sec >= 60) return null
  let ms = 0
  if (m[3]) {
    ms = m[3].length === 3 ? parseInt(m[3]) : m[3].length === 2 ? parseInt(m[3]) * 10 : parseInt(m[3]) * 100
  }
  return round2(min * 60 + sec + ms / 1000)
}

/** Split LRC (or plain) text into metadata and per-line timing entries. */
export function linesFromLrc(text: string): TimingDocument {
  const meta: string[] = []
  const lines: TimingLine[] = []
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n')
  // Drop a single trailing empty line produced by a terminating newline
  if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') rawLines.pop()

  for (const raw of rawLines) {
    if (META_RE.test(raw)) {
      meta.push(raw)
      continue
    }
    let time: number | null = null
    let match: RegExpExecArray | null
    TIME_TAG_RE.lastIndex = 0
    while ((match = TIME_TAG_RE.exec(raw)) !== null) {
      // Use the first tag as this line's time; extra tags are dropped
      if (time === null) {
        const ms = match[3] ? (match[3].length === 3 ? parseInt(match[3]) : parseInt(match[3]) * 10) : 0
        time = round2(parseInt(match[1]) * 60 + parseInt(match[2]) + ms / 1000)
      }
    }
    const lineText = raw.replace(TIME_TAG_RE, '').trim()
    lines.push({ time, text: lineText })
  }
  return { meta, lines }
}

/** Serialize back to LRC. Unstamped lines are written as plain text. */
export function linesToLrc(doc: TimingDocument): string {
  const out = [...doc.meta]
  for (const line of doc.lines) {
    out.push(line.time === null ? line.text : `${formatLrcTimestamp(line.time)}${line.text}`)
  }
  return out.join('\n')
}

/** Return a copy with `index` stamped at `seconds`. */
export function stampLine(lines: TimingLine[], index: number, seconds: number): TimingLine[] {
  return lines.map((l, i) => (i === index ? { ...l, time: Math.max(0, round2(seconds)) } : l))
}

/** Return a copy with this line and every following line unstamped. */
export function clearFrom(lines: TimingLine[], index: number): TimingLine[] {
  return lines.map((l, i) => (i >= index ? { ...l, time: null } : l))
}

/** Nudge a stamped line by `delta` seconds (no-op on unstamped lines). */
export function adjustLine(lines: TimingLine[], index: number, delta: number): TimingLine[] {
  return lines.map((l, i) =>
    i === index && l.time !== null ? { ...l, time: Math.max(0, round2(l.time + delta)) } : l,
  )
}

/** Return a copy with the text of `index` replaced. */
export function setLineText(lines: TimingLine[], index: number, text: string): TimingLine[] {
  return lines.map((l, i) => (i === index ? { ...l, text } : l))
}

/** Index of the first line without a timestamp, or -1 if all are stamped. */
export function firstUnstampedIndex(lines: TimingLine[]): number {
  return lines.findIndex((l) => l.time === null)
}
