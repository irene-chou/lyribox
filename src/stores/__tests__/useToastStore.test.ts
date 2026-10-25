import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToastStore, toast } from '../useToastStore'

beforeEach(() => {
  vi.useFakeTimers()
  useToastStore.setState({ toasts: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToastStore', () => {
  it('shows and auto-dismisses after the duration', () => {
    toast('hi', { duration: 1000 })
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(999)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('keeps at most three toasts', () => {
    toast('1')
    toast('2')
    toast('3')
    toast('4')
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['2', '3', '4'])
  })

  it('toasts with an action stay longer by default', () => {
    toast('undo?', { actionLabel: '復原', onAction: () => {} })
    vi.advanceTimersByTime(4500)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(1500)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('dismiss removes immediately and cancels the timer', () => {
    const id = toast('x', { duration: 1000 })
    useToastStore.getState().dismiss(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
    vi.advanceTimersByTime(2000) // no throw, nothing to remove
  })

  it('variant helpers set the variant', () => {
    toast.success('ok')
    toast.error('bad')
    const variants = useToastStore.getState().toasts.map((t) => t.variant)
    expect(variants).toEqual(['success', 'error'])
  })
})
