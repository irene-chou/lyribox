import { describe, it, expect } from 'vitest'
import { parseLRC } from '../lrc-parser'

describe('parseLRC', () => {
  it('parses standard LRC lines', () => {
    const lrc = '[00:12.34]Hello world\n[00:15.00]Second line'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics).toHaveLength(2)
    expect(lyrics[0]).toEqual({ time: 12.34, text: 'Hello world' })
    expect(lyrics[1]).toEqual({ time: 15, text: 'Second line' })
  })

  it('extracts title from [ti:] tag', () => {
    const lrc = '[ti:My Song]\n[00:01.00]First line'
    const { title, lyrics } = parseLRC(lrc)
    expect(title).toBe('My Song')
    expect(lyrics).toHaveLength(1)
  })

  it('skips metadata tags (ar, al, by, offset, re, ve)', () => {
    const lrc = '[ti:Title]\n[ar:Artist]\n[al:Album]\n[by:Tool]\n[00:01.00]Line'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics).toHaveLength(1)
    expect(lyrics[0].text).toBe('Line')
  })

  it('handles multiple time tags on one line', () => {
    const lrc = '[00:10.00][01:20.00]Repeated chorus'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics).toHaveLength(2)
    expect(lyrics[0]).toEqual({ time: 10, text: 'Repeated chorus' })
    expect(lyrics[1]).toEqual({ time: 80, text: 'Repeated chorus' })
  })

  it('handles mm:ss format without milliseconds', () => {
    const lrc = '[01:30]No ms'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics[0].time).toBe(90)
  })

  it('handles 3-digit milliseconds', () => {
    const lrc = '[00:05.123]Three digit ms'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics[0].time).toBeCloseTo(5.123)
  })

  it('handles 2-digit milliseconds (centiseconds)', () => {
    const lrc = '[00:05.50]Two digit ms'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics[0].time).toBeCloseTo(5.5)
  })

  it('handles colon separator for milliseconds', () => {
    const lrc = '[00:05:50]Colon ms'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics[0].time).toBeCloseTo(5.5)
  })

  it('sorts output by time', () => {
    const lrc = '[00:30.00]Second\n[00:10.00]First\n[00:20.00]Middle'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics.map((l) => l.text)).toEqual(['First', 'Middle', 'Second'])
  })

  it('returns empty array for empty input', () => {
    const { lyrics, title } = parseLRC('')
    expect(lyrics).toHaveLength(0)
    expect(title).toBeNull()
  })

  it('handles lines with only time tags and no text', () => {
    const lrc = '[00:05.00]'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics).toHaveLength(1)
    expect(lyrics[0].text).toBe('')
  })

  it('handles lines with no time tags', () => {
    const lrc = 'This is just text\n[00:01.00]With time'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics).toHaveLength(1)
    expect(lyrics[0].text).toBe('With time')
  })

  it('handles large minute values', () => {
    const lrc = '[120:00.00]Two hours in'
    const { lyrics } = parseLRC(lrc)
    expect(lyrics[0].time).toBe(7200)
  })

  describe('same-timestamp merging (translation / romanization)', () => {
    it('merges a following line with the same timestamp into subText', () => {
      const lrc = '[00:12.30]君の名前を呼ぶ\n[00:12.30]呼喚你的名字\n[00:15.00]Next'
      const { lyrics } = parseLRC(lrc)
      expect(lyrics).toHaveLength(2)
      expect(lyrics[0]).toEqual({ time: 12.3, text: '君の名前を呼ぶ', subText: '呼喚你的名字' })
      expect(lyrics[1]).toEqual({ time: 15, text: 'Next' })
    })

    it('joins three or more same-timestamp lines with newlines', () => {
      const lrc = '[00:01.00]原文\n[00:01.00]翻譲\n[00:01.00]romaji'
      const { lyrics } = parseLRC(lrc)
      expect(lyrics).toHaveLength(1)
      expect(lyrics[0].subText).toBe('翻譲\nromaji')
    })

    it('treats differently formatted but equal timestamps as the same', () => {
      const lrc = '[00:01.50]A\n[00:01.500]B'
      const { lyrics } = parseLRC(lrc)
      expect(lyrics).toHaveLength(1)
      expect(lyrics[0].subText).toBe('B')
    })

    it('promotes the first non-empty text to the primary line', () => {
      const lrc = '[00:01.00]\n[00:01.00]Hello'
      const { lyrics } = parseLRC(lrc)
      expect(lyrics).toHaveLength(1)
      expect(lyrics[0]).toEqual({ time: 1, text: 'Hello' })
    })

    it('keeps a single empty line when all same-timestamp lines are empty', () => {
      const lrc = '[00:01.00]\n[00:01.00]'
      const { lyrics } = parseLRC(lrc)
      expect(lyrics).toEqual([{ time: 1, text: '' }])
    })

    it('does not produce subText when the duplicate text is identical', () => {
      const lrc = '[00:01.00][00:01.00]Same'
      const { lyrics } = parseLRC(lrc)
      expect(lyrics).toEqual([{ time: 1, text: 'Same' }])
    })

    it('keeps the original order when merging after sort', () => {
      const lrc = '[00:20.00]Late\n[00:10.00]Orig\n[00:10.00]Trans'
      const { lyrics } = parseLRC(lrc)
      expect(lyrics.map((l) => l.text)).toEqual(['Orig', 'Late'])
      expect(lyrics[0].subText).toBe('Trans')
    })
  })
})
