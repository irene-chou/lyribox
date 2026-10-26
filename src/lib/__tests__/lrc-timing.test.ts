import { describe, it, expect } from 'vitest'
import {
  adjustLine,
  clearFrom,
  firstUnstampedIndex,
  formatLrcTimestamp,
  formatTimestampValue,
  linesFromLrc,
  linesToLrc,
  parseTimestampInput,
  setLineText,
  stampLine,
} from '../lrc-timing'
import { parseLRC } from '../lrc-parser'

describe('formatLrcTimestamp', () => {
  it('formats with two-digit minutes, seconds and centiseconds', () => {
    expect(formatLrcTimestamp(0)).toBe('[00:00.00]')
    expect(formatLrcTimestamp(12.5)).toBe('[00:12.50]')
    expect(formatLrcTimestamp(83.456)).toBe('[01:23.46]')
    expect(formatLrcTimestamp(600.004)).toBe('[10:00.00]')
  })

  it('clamps negatives to zero and rolls 59.995 into the next second', () => {
    expect(formatLrcTimestamp(-3)).toBe('[00:00.00]')
    expect(formatTimestampValue(59.995)).toBe('01:00.00')
  })
})

describe('parseTimestampInput', () => {
  it('accepts mm:ss.xx with or without brackets', () => {
    expect(parseTimestampInput('01:23.45')).toBe(83.45)
    expect(parseTimestampInput('[01:23.45]')).toBe(83.45)
    expect(parseTimestampInput(' 1:5 ')).toBe(65)
  })

  it('normalises 1- and 3-digit fractions and colon separators', () => {
    expect(parseTimestampInput('00:01.5')).toBe(1.5)
    expect(parseTimestampInput('00:01.500')).toBe(1.5)
    expect(parseTimestampInput('00:01:50')).toBe(1.5)
  })

  it('rejects garbage and seconds >= 60', () => {
    expect(parseTimestampInput('abc')).toBeNull()
    expect(parseTimestampInput('01:60.00')).toBeNull()
    expect(parseTimestampInput('')).toBeNull()
  })
})

describe('linesFromLrc / linesToLrc', () => {
  it('splits plain text into unstamped lines', () => {
    const { meta, lines } = linesFromLrc('第一句\n第二句\n')
    expect(meta).toEqual([])
    expect(lines).toEqual([
      { time: null, text: '第一句' },
      { time: null, text: '第二句' },
    ])
  })

  it('keeps metadata separate and reads the first time tag of each line', () => {
    const { meta, lines } = linesFromLrc('[ti:Song]\n[ar:Me]\n[00:12.50]Hello\n[00:20.00][00:40.00]Chorus\nNo time yet')
    expect(meta).toEqual(['[ti:Song]', '[ar:Me]'])
    expect(lines).toEqual([
      { time: 12.5, text: 'Hello' },
      { time: 20, text: 'Chorus' },
      { time: null, text: 'No time yet' },
    ])
  })

  it('handles CRLF input', () => {
    expect(linesFromLrc('a\r\nb').lines.map((l) => l.text)).toEqual(['a', 'b'])
  })

  it('round-trips a document and keeps unstamped lines as plain text', () => {
    const src = '[ti:Song]\n[00:12.50]Hello\nNot yet\n[01:00.00]Bye'
    const doc = linesFromLrc(src)
    expect(linesToLrc(doc)).toBe(src)
  })

  it('serialises stamped output that parseLRC understands', () => {
    const doc = linesFromLrc('一\n二\n三')
    let lines = stampLine(doc.lines, 0, 1.234)
    lines = stampLine(lines, 1, 5.5)
    const lrc = linesToLrc({ meta: ['[ti:T]'], lines })
    const { lyrics, title } = parseLRC(lrc)
    expect(title).toBe('T')
    expect(lyrics).toEqual([
      { time: 1.23, text: '一' },
      { time: 5.5, text: '二' },
    ])
  })
})

describe('line operations', () => {
  const base = [
    { time: 1, text: 'a' },
    { time: 2, text: 'b' },
    { time: 3, text: 'c' },
  ]

  it('stampLine replaces only the target line and never goes negative', () => {
    expect(stampLine(base, 1, 9.999)[1]).toEqual({ time: 10, text: 'b' })
    expect(stampLine(base, 0, -1)[0].time).toBe(0)
    expect(stampLine(base, 1, 9)[0]).toBe(base[0])
  })

  it('clearFrom unstamps the target and everything after it', () => {
    expect(clearFrom(base, 1).map((l) => l.time)).toEqual([1, null, null])
  })

  it('adjustLine nudges stamped lines, clamps at 0 and ignores unstamped ones', () => {
    expect(adjustLine(base, 2, -0.1)[2].time).toBe(2.9)
    expect(adjustLine(base, 0, -5)[0].time).toBe(0)
    const unstamped = [{ time: null, text: 'x' }]
    expect(adjustLine(unstamped, 0, 0.1)[0].time).toBeNull()
  })

  it('setLineText and firstUnstampedIndex', () => {
    expect(setLineText(base, 2, 'z')[2]).toEqual({ time: 3, text: 'z' })
    expect(firstUnstampedIndex(base)).toBe(-1)
    expect(firstUnstampedIndex(clearFrom(base, 1))).toBe(1)
  })
})
