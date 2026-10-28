import { describe, it, expect } from 'vitest'
import { parseObsParams, obsParamsToSearchParams } from '../obs-params'

describe('parseObsParams', () => {
  it('returns an empty object for no params', () => {
    expect(parseObsParams('')).toEqual({})
    expect(parseObsParams('?s=abc')).toEqual({})
  })

  it('parses every supported key', () => {
    const p = parseObsParams(
      '?align=center&shadow=1&anim=0&before=0&after=2&size=56&otherSize=24&title=0&bg=%23000000',
    )
    expect(p).toEqual({
      align: 'center',
      shadow: true,
      anim: false,
      before: 0,
      after: 2,
      size: 56,
      otherSize: 24,
      title: false,
      bg: '#000000',
    })
  })

  it('accepts true/false as flag values', () => {
    expect(parseObsParams('shadow=true&anim=false')).toEqual({ shadow: true, anim: false })
  })

  it('drops invalid values instead of throwing', () => {
    const p = parseObsParams('?align=middle&shadow=yes&before=-1&after=abc&size=5&otherSize=9999&title=2&bg=url(x)')
    expect(p).toEqual({})
  })

  it('accepts rgba() backgrounds and rejects quotes / semicolons', () => {
    expect(parseObsParams('bg=rgba(0, 0, 0, 0.5)').bg).toBe('rgba(0, 0, 0, 0.5)')
    expect(parseObsParams('bg=red;color:blue').bg).toBeUndefined()
    expect(parseObsParams("bg='red'").bg).toBeUndefined()
    expect(parseObsParams('bg=url(x)').bg).toBeUndefined()
    expect(parseObsParams('bg=%23fff').bg).toBe('#fff')
    expect(parseObsParams('bg=transparent').bg).toBe('transparent')
  })

  it('round-trips through obsParamsToSearchParams', () => {
    const params = { align: 'right' as const, shadow: false, before: 1, size: 40, bg: 'transparent' }
    const q = obsParamsToSearchParams(params)
    expect(q.toString()).toBe('align=right&shadow=0&before=1&size=40&bg=transparent')
    expect(parseObsParams(q.toString())).toEqual(params)
  })

  it('skips undefined keys when serialising', () => {
    expect(obsParamsToSearchParams({}).toString()).toBe('')
  })
})
