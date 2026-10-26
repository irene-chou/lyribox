import { useEffect, useRef, useCallback } from 'react'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { findActiveLineIndex } from '@/lib/lyrics-sync'

function createSyncWorker(): { worker: Worker; blobUrl: string } {
  const blob = new Blob(
    [
      `
      let interval = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (interval) clearInterval(interval);
          interval = setInterval(function() {
            self.postMessage('tick');
          }, 80);
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

interface UseSyncEngineOptions {
  getCurrentTime: () => number
}

export function useSyncEngine({ getCurrentTime }: UseSyncEngineOptions) {
  const workerRef = useRef<Worker | null>(null)
  const getCurrentTimeRef = useRef(getCurrentTime)
  getCurrentTimeRef.current = getCurrentTime

  // Initialize worker — runs once (getCurrentTime accessed via ref)
  useEffect(() => {
    const { worker, blobUrl } = createSyncWorker()
    workerRef.current = worker

    worker.onmessage = () => {
      const rawTime = getCurrentTimeRef.current()
      // Single source of truth for displayed time while playing (~12.5Hz)
      usePlaybackStore.getState().setCurrentTime(rawTime)

      const { lyrics, offset } = useSongStore.getState()
      if (!lyrics.length) return

      const currentTime = rawTime + offset

      const newIndex = findActiveLineIndex(lyrics, currentTime)

      const sync = useSyncStore.getState()
      if (newIndex !== sync.currentLineIndex) {
        sync.setCurrentLineIndex(newIndex)
      }

      // Word-level timing needs the time itself, not just the line index.
      // Only publish it while the active line has words to keep OBS traffic low.
      const hasWords = newIndex >= 0 && (lyrics[newIndex].words?.length ?? 0) > 0
      if (hasWords) {
        sync.setSyncTime(currentTime)
      } else if (sync.syncTime !== null) {
        sync.setSyncTime(null)
      }
    }

    return () => {
      worker.postMessage('stop')
      worker.terminate()
      URL.revokeObjectURL(blobUrl)
      workerRef.current = null
    }
  }, [])

  const startSync = useCallback(() => {
    workerRef.current?.postMessage('start')
    useSyncStore.getState().setSyncing(true)
  }, [])

  const stopSync = useCallback(() => {
    workerRef.current?.postMessage('stop')
    useSyncStore.getState().setSyncing(false)
  }, [])

  // Auto-start/stop sync based on playback status
  useEffect(() => {
    const unsub = usePlaybackStore.subscribe((state, prevState) => {
      if (state.status === prevState.status) return

      if (state.status === 'PLAYING') {
        startSync()
      } else {
        stopSync()
      }
    })

    return unsub
  }, [startSync, stopSync])

  return { startSync, stopSync }
}
