import { describe, it, expect } from 'vitest'
import { formatTimeTag, mergeTranslationLrc } from '../lrc-merge'
import { parseLRC } from '../lrc-parser'

describe('formatTimeTag', () => {
  it('formats seconds as [mm:ss.xx]', () => {
    expect(formatTimeTag(0)).toBe('[00:00.00]')
    expect(formatTimeTag(12.3)).toBe('[00:12.30]')
    expect(formatTimeTag(75.456)).toBe('[01:15.46]')
    expect(formatTimeTag(600)).toBe('[10:00.00]')
  })
})

describe('mergeTranslationLrc', () => {
  it('inserts a duplicate-timestamp line after an exactly matching primary line', () => {
    const primary = '[00:12.30]君の名前を呼ぶ\n[00:15.00]Next'
    const translation = '[00:12.30]呼喚你的名字'
    const { lrcText, matched, unmatched } = mergeTranslationLrc(primary, translation)
    expect(lrcText).toBe('[00:12.30]君の名前を呼ぶ\n[00:12.30]呼喚你的名字\n[00:15.00]Next')
    expect(matched).toBe(1)
    expect(unmatched).toBe(0)
  })

  it('round-trips through parseLRC as subText', () => {
    const { lrcText } = mergeTranslationLrc('[00:01.00]Orig', '[00:01.00]Trans')
    const { lyrics } = parseLRC(lrcText)
    expect(lyrics).toEqual([{ time: 1, text: 'Orig', subText: 'Trans' }])
  })

  it('matches within tolerance and uses the primary timestamp', () => {
    const { lrcText, matched } = mergeTranslationLrc('[00:10.00]A', '[00:10.25]a')
    expect(matched).toBe(1)
    expect(lrcText).toBe('[00:10.00]A\n[00:10.00]a')
  })

  it('drops translation lines outside tolerance', () => {
    const { lrcText, matched, unmatched } = mergeTranslationLrc('[00:10.00]A', '[00:10.50]a')
    expect(matched).toBe(0)
    expect(unmatched).toBe(1)
    expect(lrcText).toBe('[00:10.00]A')
  })

  it('respects a custom tolerance', () => {
    const { matched } = mergeTranslationLrc('[00:10.00]A', '[00:10.50]a', 1)
    expect(matched).toBe(1)
  })

  it('keeps only the nearest translation when several target one primary line', () => {
    const primary = '[00:10.00]A'
    const translation = '[00:09.80]far\n[00:10.05]near\n[00:10.20]other'
    const { lrcText, matched, unmatched } = mergeTranslationLrc(primary, translation)
    expect(lrcText).toBe('[00:10.00]A\n[00:10.00]near')
    expect(matched).toBe(1)
    expect(unmatched).toBe(2)
  })

  it('handles primary lines with multiple time tags', () => {
    const primary = '[00:10.00][00:30.00]Chorus'
    const translation = '[00:10.00]合唱\n[00:30.00]合唱'
    const { lrcText, matched } = mergeTranslationLrc(primary, translation)
    expect(matched).toBe(2)
    expect(lrcText).toBe('[00:10.00][00:30.00]Chorus\n[00:10.00]合唱\n[00:30.00]合唱')
    const { lyrics } = parseLRC(lrcText)
    expect(lyrics).toEqual([
      { time: 10, text: 'Chorus', subText: '合唱' },
      { time: 30, text: 'Chorus', subText: '合唱' },
    ])
  })

  it('preserves metadata and untimed lines of the primary and ignores translation metadata', () => {
    const primary = '[ti:Song]\n[ar:Artist]\n\n[00:01.00]A\nplain text'
    const translation = '[ti:翻譯]\n[00:01.00]a'
    const { lrcText } = mergeTranslationLrc(primary, translation)
    expect(lrcText).toBe('[ti:Song]\n[ar:Artist]\n\n[00:01.00]A\n[00:01.00]a\nplain text')
  })

  it('skips empty translation lines', () => {
    const { lrcText, matched, unmatched } = mergeTranslationLrc('[00:01.00]A', '[00:01.00]\n[00:01.00]   ')
    expect(lrcText).toBe('[00:01.00]A')
    expect(matched).toBe(0)
    expect(unmatched).toBe(0)
  })

  it('handles empty inputs', () => {
    expect(mergeTranslationLrc('', '')).toEqual({ lrcText: '', matched: 0, unmatched: 0 })
    expect(mergeTranslationLrc('[00:01.00]A', '')).toEqual({ lrcText: '[00:01.00]A', matched: 0, unmatched: 0 })
    expect(mergeTranslationLrc('', '[00:01.00]a')).toEqual({ lrcText: '', matched: 0, unmatched: 1 })
  })
})
