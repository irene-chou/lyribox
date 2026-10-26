import { describe, it, expect } from 'vitest'
import { buildObsUrl } from '../piesocket'

describe('buildObsUrl', () => {
  const base = 'https://example.com/lyribox/'

  it('builds the plain URL when no params are given', () => {
    expect(buildObsUrl(base, 'abc123')).toBe('https://example.com/lyribox/obs.html?s=abc123')
    expect(buildObsUrl(base, 'abc123', {})).toBe('https://example.com/lyribox/obs.html?s=abc123')
  })

  it('appends preset params after the session id', () => {
    expect(buildObsUrl(base, 'abc', { before: 0, after: 0, size: 56, align: 'center', title: false })).toBe(
      'https://example.com/lyribox/obs.html?s=abc&align=center&before=0&after=0&size=56&title=0',
    )
  })

  it('encodes the session id and colour values', () => {
    expect(buildObsUrl(base, 'a b', { bg: '#000' })).toBe('https://example.com/lyribox/obs.html?s=a%20b&bg=%23000')
  })
})
