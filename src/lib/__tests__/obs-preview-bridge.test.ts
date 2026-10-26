import { describe, it, expect, vi, beforeEach } from 'vitest'
import { publishToPreview, subscribePreview, _resetPreviewBridge } from '../obs-preview-bridge'

describe('obs-preview-bridge', () => {
  beforeEach(() => _resetPreviewBridge())

  it('delivers published messages to subscribers', () => {
    const fn = vi.fn()
    subscribePreview(fn)
    publishToPreview('SYNC_UPDATE', { currentLineIndex: 3 })
    expect(fn).toHaveBeenCalledWith({ type: 'SYNC_UPDATE', data: { currentLineIndex: 3 } })
  })

  it('stops delivering after unsubscribe', () => {
    const fn = vi.fn()
    const unsub = subscribePreview(fn)
    unsub()
    publishToPreview('OFFSET', { offset: 1 })
    expect(fn).not.toHaveBeenCalled()
  })

  it('supports multiple subscribers and null data', () => {
    const a = vi.fn()
    const b = vi.fn()
    subscribePreview(a)
    subscribePreview(b)
    publishToPreview('REQUEST_STATE', null)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledWith({ type: 'REQUEST_STATE', data: null })
  })
})
