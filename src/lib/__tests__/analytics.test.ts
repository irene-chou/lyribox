import { describe, it, expect, afterEach, vi } from 'vitest'
import { track } from '../analytics'

const w = window as unknown as { umami?: { track: (name: string, data?: unknown) => void } }

afterEach(() => {
  delete w.umami
})

describe('track', () => {
  it('is a no-op when Umami is not injected', () => {
    expect(() => track('song_load', { source: 'youtube' })).not.toThrow()
  })

  it('forwards events to Umami with the lyribox_ prefix', () => {
    const umamiTrack = vi.fn()
    w.umami = { track: umamiTrack }
    track('obs_url_copy', { n: 1 })
    expect(umamiTrack).toHaveBeenCalledWith('lyribox_obs_url_copy', { n: 1 })
  })

  it('never lets an analytics error escape', () => {
    w.umami = {
      track: () => {
        throw new Error('boom')
      },
    }
    expect(() => track('shortcuts_open')).not.toThrow()
  })
})
