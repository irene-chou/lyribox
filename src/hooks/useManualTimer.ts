import { useRef, useCallback, useEffect, useMemo } from 'react'
import { usePlaybackStore } from '@/stores/usePlaybackStore'

function createTimerWorker(): { worker: Worker; blobUrl: string } {
  const blob = new Blob(
    [
      `
      let interval = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (interval) clearInterval(interval);
          interval = setInterval(function() {
            self.postMessage('tick');
          }, 50);
        } else if (e.data === 'stop') {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      };
    `,
    ],
    { type: 'application/javascript' },
  )
  const blobUrl = URL.createObjectURL(blob)
  return { worker: new Worker(blobUrl), blobUrl }
}

export function useManualTimer() {
  const workerRef = useRef<Worker | null>(null)
  const manualTimeRef = useRef(0)
  const lastTickRef = useRef(0)
  const isPlayingRef = useRef(false)

  useEffect(() => {
    const { worker, blobUrl } = createTimerWorker()
    workerRef.current = worker

    worker.onmessage = () => {
      if (!isPlayingRef.current) return

      const now = performance.now()
      const elapsed = (now - lastTickRef.current) / 1000
      lastTickRef.current = now

      // Displayed time is pushed by the sync engine
      manualTimeRef.current += elapsed
    }

    return () => {
      worker.postMessage('stop')
      worker.terminate()
      URL.revokeObjectURL(blobUrl)
      workerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (isPlayingRef.current) return
    isPlayingRef.current = true
    lastTickRef.current = performance.now()
    workerRef.current?.postMessage('start')
    usePlaybackStore.getState().setStatus('PLAYING')
  }, [])

  const pause = useCallback(() => {
    if (!isPlayingRef.current) return
    isPlayingRef.current = false
    workerRef.current?.postMessage('stop')
    usePlaybackStore.getState().setCurrentTime(manualTimeRef.current)
    usePlaybackStore.getState().setStatus('PAUSED')
  }, [])

  const reset = useCallback(() => {
    isPlayingRef.current = false
    workerRef.current?.postMessage('stop')
    manualTimeRef.current = 0
    usePlaybackStore.getState().setCurrentTime(0)
    usePlaybackStore.getState().setStatus('IDLE')
  }, [])

  const seek = useCallback((delta: number) => {
    manualTimeRef.current = Math.max(0, manualTimeRef.current + delta)
    usePlaybackStore.getState().setCurrentTime(manualTimeRef.current)
  }, [])

  const getCurrentTime = useCallback((): number => {
    return manualTimeRef.current
  }, [])

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
