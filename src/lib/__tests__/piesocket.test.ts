import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getSessionId, getChannelName, getOBSUrl, observeReconnects } from '../piesocket'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

describe('getSessionId', () => {
  it('creates a UUID on first use and persists it', () => {
    const id = getSessionId()
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(localStorage.getItem('lb-session-id')).toBe(id)
  })

  it('returns the same id on subsequent calls', () => {
    expect(getSessionId()).toBe(getSessionId())
  })

  it('reuses an id already stored', () => {
    localStorage.setItem('lb-session-id', 'existing-id')
    expect(getSessionId()).toBe('existing-id')
  })

  it('falls back to a random string when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {})
    const id = getSessionId()
    expect(id).toMatch(/^[a-z0-9]{1,8}$/)
    expect(localStorage.getItem('lb-session-id')).toBe(id)
  })
})

describe('getChannelName', () => {
  it('prefixes the session id', () => {
    localStorage.setItem('lb-session-id', 'abc')
    expect(getChannelName()).toBe('lyribox-abc')
  })
})

describe('getOBSUrl', () => {
  it('points at obs.html next to the app with the session id', () => {
    localStorage.setItem('lb-session-id', 'sid')
    window.history.replaceState({}, '', '/lyribox/index.html?x=1')
    expect(getOBSUrl()).toBe(`${window.location.origin}/lyribox/obs.html?s=sid`)
  })

  it('handles a directory path without a file name', () => {
    localStorage.setItem('lb-session-id', 'sid')
    window.history.replaceState({}, '', '/lyribox/')
    expect(getOBSUrl()).toBe(`${window.location.origin}/lyribox/obs.html?s=sid`)
  })
})

describe('observeReconnects', () => {
  it('runs the callback after the original onOpen on every reconnect', () => {
    const original = vi.fn()
    const channel = { onOpen: original } as unknown as PieSocketChannel
    const onReopen = vi.fn()

    observeReconnects(channel, onReopen)
    channel.onOpen('evt')
    channel.onOpen('evt2')

    expect(original).toHaveBeenCalledTimes(2)
    expect(original).toHaveBeenLastCalledWith('evt2')
    expect(onReopen).toHaveBeenCalledTimes(2)
    expect(original.mock.invocationCallOrder[0]).toBeLessThan(onReopen.mock.invocationCallOrder[0])
  })
})
