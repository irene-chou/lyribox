import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useSaveStatusStore } from '../useSaveStatusStore'

beforeEach(() => {
  vi.useFakeTimers()
  useSaveStatusStore.getState().reset()
})
afterEach(() => vi.useRealTimers())

describe('useSaveStatusStore', () => {
  it('goes pending → saving → saved → idle', () => {
    const s = useSaveStatusStore.getState()
    s.markPending()
    expect(useSaveStatusStore.getState().status).toBe('pending')
    s.markSaving()
    expect(useSaveStatusStore.getState().status).toBe('saving')
    s.markSaved()
    expect(useSaveStatusStore.getState().status).toBe('saved')
    vi.advanceTimersByTime(1500)
    expect(useSaveStatusStore.getState().status).toBe('idle')
  })

  it('a new pending save cancels the saved→idle timer', () => {
    useSaveStatusStore.getState().markSaved()
    vi.advanceTimersByTime(1000)
    useSaveStatusStore.getState().markPending()
    vi.advanceTimersByTime(1000)
    expect(useSaveStatusStore.getState().status).toBe('pending')
  })
})
