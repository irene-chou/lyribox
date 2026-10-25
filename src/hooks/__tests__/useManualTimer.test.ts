import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useManualTimer } from '../useManualTimer'
import { usePlaybackStore } from '@/stores/usePlaybackStore'

let now = 0

beforeEach(() => {
  now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  usePlaybackStore.getState().reset()
})

function setup() {
  return renderHook(() => useManualTimer()).result
}

describe('useManualTimer', () => {
  it('advances while playing and freezes on pause', () => {
    const timer = setup()
    act(() => timer.current.start())
    expect(usePlaybackStore.getState().status).toBe('PLAYING')

    now = 2500
    expect(timer.current.getCurrentTime()).toBeCloseTo(2.5)

    act(() => timer.current.pause())
    expect(usePlaybackStore.getState().status).toBe('PAUSED')
    expect(usePlaybackStore.getState().currentTime).toBeCloseTo(2.5)

    now = 10000
    expect(timer.current.getCurrentTime()).toBeCloseTo(2.5)
  })

  it('resumes from the paused position', () => {
    const timer = setup()
    act(() => timer.current.start())
    now = 1000
    act(() => timer.current.pause())
    now = 5000
    act(() => timer.current.start())
    now = 6000
    expect(timer.current.getCurrentTime()).toBeCloseTo(2)
  })

  it('seeks relative to current time and clamps at 0', () => {
    const timer = setup()
    act(() => timer.current.start())
    now = 3000
    act(() => timer.current.seek(2))
    expect(timer.current.getCurrentTime()).toBeCloseTo(5)
    now = 4000
    expect(timer.current.getCurrentTime()).toBeCloseTo(6)

    act(() => timer.current.seek(-100))
    expect(timer.current.getCurrentTime()).toBe(0)
  })

  it('reset returns to zero and IDLE', () => {
    const timer = setup()
    act(() => timer.current.start())
    now = 3000
    act(() => timer.current.reset())
    expect(timer.current.getCurrentTime()).toBe(0)
    expect(timer.current.isPlaying).toBe(false)
    expect(usePlaybackStore.getState().status).toBe('IDLE')
  })
})
