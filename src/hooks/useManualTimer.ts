import { useRef, useCallback, useMemo } from 'react'
import { usePlaybackStore } from '@/stores/usePlaybackStore'

// Time is derived on demand from performance.now(); the sync engine's tick
// polls getCurrentTime() and pushes it to the store while playing.
export function useManualTimer() {
  const baseTimeRef = useRef(0) // accumulated time at last start/seek
  const startedAtRef = useRef(0) // performance.now() when last started
  const isPlayingRef = useRef(false)

  const getCurrentTime = useCallback((): number => {
    if (!isPlayingRef.current) return baseTimeRef.current
    return baseTimeRef.current + (performance.now() - startedAtRef.current) / 1000
  }, [])

  const start = useCallback(() => {
    if (isPlayingRef.current) return
    isPlayingRef.current = true
    startedAtRef.current = performance.now()
    usePlaybackStore.getState().setStatus('PLAYING')
  }, [])

  const pause = useCallback(() => {
    if (!isPlayingRef.current) return
    baseTimeRef.current = getCurrentTime()
    isPlayingRef.current = false
    usePlaybackStore.getState().setCurrentTime(baseTimeRef.current)
    usePlaybackStore.getState().setStatus('PAUSED')
  }, [getCurrentTime])

  const reset = useCallback(() => {
    isPlayingRef.current = false
    baseTimeRef.current = 0
    usePlaybackStore.getState().setCurrentTime(0)
    usePlaybackStore.getState().setStatus('IDLE')
  }, [])

  const seek = useCallback((delta: number) => {
    baseTimeRef.current = Math.max(0, getCurrentTime() + delta)
    startedAtRef.current = performance.now()
    usePlaybackStore.getState().setCurrentTime(baseTimeRef.current)
  }, [getCurrentTime])

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause()
    } else {
      start()
    }
  }, [start, pause])

  return useMemo(
    () => ({
      start,
      pause,
      reset,
      seek,
      getCurrentTime,
      togglePlay,
      get isPlaying() {
        return isPlayingRef.current
      },
    }),
    [start, pause, reset, seek, getCurrentTime, togglePlay],
  )
}
