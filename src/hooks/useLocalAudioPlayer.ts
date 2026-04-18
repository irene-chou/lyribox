import { useRef, useCallback, useEffect, useMemo } from 'react'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSongStore } from '@/stores/useSongStore'
import { pitchShiftBuffer } from '@/lib/pitch-shift'

export function useLocalAudioPlayer() {
  const audioBufferRef = useRef<AudioBuffer | null>(null)  // original decoded buffer
  const effectiveBufferRef = useRef<AudioBuffer | null>(null)  // buffer in use (may be pitch-shifted)
  const pitchCacheRef = useRef<{ semitones: number; buffer: AudioBuffer } | null>(null)
  const pitchProcessingRef = useRef(false)
  const pitchAbortRef = useRef<AbortController | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const savedPositionRef = useRef(0)
  const rafIdRef = useRef(0)
  const loadingRef = useRef<Promise<void> | null>(null)

  // AudioBufferSourceNode playback state
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const startContextTimeRef = useRef(0)
  const startOffsetRef = useRef(0)

  const stopTimeUpdatesRef = useRef(() => {})

  const stopTimeUpdates = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current)
  }, [])

  stopTimeUpdatesRef.current = stopTimeUpdates

  const startTimeUpdates = useCallback(() => {
    const update = () => {
      const buffer = effectiveBufferRef.current
      const ctx = audioCtxRef.current
      if (!buffer || !ctx || !sourceNodeRef.current) return

      const time = startOffsetRef.current + (ctx.currentTime - startContextTimeRef.current)
      usePlaybackStore.getState().setCurrentTime(time)

      if (time >= buffer.duration) {
        stopTimeUpdatesRef.current()
        try { sourceNodeRef.current.stop() } catch { /* already stopped */ }
        sourceNodeRef.current = null
        savedPositionRef.current = 0
        usePlaybackStore.getState().setStatus('ENDED')
        return
      }
      rafIdRef.current = requestAnimationFrame(update)
    }
    rafIdRef.current = requestAnimationFrame(update)
  }, [])

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }, [])

  const destroySourceNode = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop() } catch { /* already stopped */ }
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
  }, [])

  const createSourceNode = useCallback((offset: number) => {
    const ctx = audioCtxRef.current
    const buffer = effectiveBufferRef.current
    if (!ctx || !buffer) return false

    destroySourceNode()

    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain()
      gainNodeRef.current.connect(ctx.destination)
    }
    const { volume, muted } = usePlaybackStore.getState()
    gainNodeRef.current.gain.value = muted ? 0 : volume / 100

    const clampedOffset = Math.max(0, Math.min(buffer.duration, offset))
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(gainNodeRef.current)
    source.start(0, clampedOffset)
    sourceNodeRef.current = source
    startContextTimeRef.current = ctx.currentTime
    startOffsetRef.current = clampedOffset
    return true
  }, [destroySourceNode])

  // Sync volume/muted from store to GainNode
  useEffect(() => {
    let prevVolume = usePlaybackStore.getState().volume
    let prevMuted = usePlaybackStore.getState().muted

    const unsub = usePlaybackStore.subscribe((state) => {
      if (state.volume === prevVolume && state.muted === prevMuted) return
      prevVolume = state.volume
      prevMuted = state.muted
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = state.muted ? 0 : state.volume / 100
      }
    })
    return unsub
  }, [])

  // When pitch changes: cancel ongoing processing, invalidate effective buffer,
  // stop playback (user must click play again to trigger re-processing).
  useEffect(() => {
    let prevPitch = useSongStore.getState().pitch

    const unsub = useSongStore.subscribe((state) => {
      if (state.pitch === prevPitch) return
      prevPitch = state.pitch

      // Cancel any in-flight processing
      pitchAbortRef.current?.abort()
      pitchAbortRef.current = null
      pitchProcessingRef.current = false

      // Invalidate effective buffer
      effectiveBufferRef.current = state.pitch === 0 ? audioBufferRef.current : null

      const status = usePlaybackStore.getState().status
      if (status !== 'PLAYING' && status !== 'PAUSED') return

      // Save current position before teardown
      if (sourceNodeRef.current) {
        const ctx = audioCtxRef.current
        if (ctx) {
          savedPositionRef.current = startOffsetRef.current + (ctx.currentTime - startContextTimeRef.current)
        }
      }
      stopTimeUpdates()
      destroySourceNode()
      audioCtxRef.current?.suspend()
      usePlaybackStore.getState().setStatus('PAUSED')
    })
    return unsub
  }, [stopTimeUpdates, destroySourceNode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pitchAbortRef.current?.abort()
      stopTimeUpdates()
      destroySourceNode()
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect()
        gainNodeRef.current = null
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }
  }, [stopTimeUpdates, destroySourceNode])

  const loadFile = useCallback((objectUrl: string) => {
    const ctx = ensureAudioContext()

    // Cancel any ongoing pitch processing for the old file
    pitchAbortRef.current?.abort()
    pitchAbortRef.current = null
    pitchProcessingRef.current = false
    pitchCacheRef.current = null
    effectiveBufferRef.current = null

    destroySourceNode()
    stopTimeUpdates()
    savedPositionRef.current = 0

    loadingRef.current = (async () => {
      const response = await fetch(objectUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      audioBufferRef.current = audioBuffer

      // Pitch=0: effective buffer is the original; otherwise defer until play()
      const pitch = useSongStore.getState().pitch
      effectiveBufferRef.current = pitch === 0 ? audioBuffer : null

      usePlaybackStore.getState().setDuration(audioBuffer.duration)
      usePlaybackStore.getState().setCurrentTime(0)
      usePlaybackStore.getState().setStatus('IDLE')
    })()
  }, [ensureAudioContext, destroySourceNode, stopTimeUpdates])

  const play = useCallback(async () => {
    // Prevent re-entry while pitch processing is in progress
    if (pitchProcessingRef.current) return

    // Wait for any pending file load to finish
    if (loadingRef.current) {
      await loadingRef.current
      loadingRef.current = null
    }

    const ctx = ensureAudioContext()

    // Resume immediately while still in the user-gesture context.
    // Must happen before any await that yields to the event loop,
    // otherwise the browser may refuse resume() due to autoplay policy.
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    const pitch = useSongStore.getState().pitch

    // Ensure we have an effective buffer to play from
    if (!effectiveBufferRef.current) {
      if (pitch === 0) {
        effectiveBufferRef.current = audioBufferRef.current
      } else {
        // Check cache first
        if (pitchCacheRef.current?.semitones === pitch) {
          effectiveBufferRef.current = pitchCacheRef.current.buffer
        } else {
          // Offline phase vocoder processing
          if (!audioBufferRef.current) return

          pitchProcessingRef.current = true
          const abort = new AbortController()
          pitchAbortRef.current = abort

          let processed: AudioBuffer | null = null
          try {
            processed = await pitchShiftBuffer(audioBufferRef.current, pitch, ctx, abort.signal)
          } catch {
            // Processing failed (e.g. out of memory); bail out cleanly
            return
          } finally {
            pitchProcessingRef.current = false
            pitchAbortRef.current = null
          }

          if (!processed) return // aborted (pitch changed mid-processing)

          pitchCacheRef.current = { semitones: pitch, buffer: processed }
          effectiveBufferRef.current = processed
        }
      }
    }

    if (!effectiveBufferRef.current) return

    const created = createSourceNode(savedPositionRef.current)
    if (!created) return

    // Resume again in case pause() was called during processing
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume()
    }

    startTimeUpdates()
    usePlaybackStore.getState().setStatus('PLAYING')
  }, [ensureAudioContext, createSourceNode, startTimeUpdates])

  const pause = useCallback(() => {
    if (sourceNodeRef.current) {
      const ctx = audioCtxRef.current
      if (ctx) {
        savedPositionRef.current = startOffsetRef.current + (ctx.currentTime - startContextTimeRef.current)
      }
      try { sourceNodeRef.current.stop() } catch { /* already stopped */ }
      sourceNodeRef.current = null
    }
    audioCtxRef.current?.suspend()
    stopTimeUpdates()
    usePlaybackStore.getState().setStatus('PAUSED')
  }, [stopTimeUpdates])

  const seekTo = useCallback((seconds: number) => {
    const buffer = effectiveBufferRef.current
    if (!buffer) return
    const clamped = Math.max(0, Math.min(buffer.duration, seconds))
    savedPositionRef.current = clamped
    usePlaybackStore.getState().setCurrentTime(clamped)

    const status = usePlaybackStore.getState().status
    if (status !== 'PLAYING' && status !== 'PAUSED') return

    // Recreate source at new position; time-update RAF continues seamlessly
    createSourceNode(clamped)
    if (status === 'PAUSED') audioCtxRef.current?.suspend()
  }, [createSourceNode])

  const getCurrentTime = useCallback((): number => {
    if (sourceNodeRef.current) {
      const ctx = audioCtxRef.current
      if (ctx) {
        return startOffsetRef.current + (ctx.currentTime - startContextTimeRef.current)
      }
    }
    return savedPositionRef.current
  }, [])

  const getDuration = useCallback((): number => {
    return (effectiveBufferRef.current ?? audioBufferRef.current)?.duration ?? 0
  }, [])

  return useMemo(
    () => ({
      loadFile,
      play,
      pause,
      seekTo,
      getCurrentTime,
      getDuration,
    }),
    [loadFile, play, pause, seekTo, getCurrentTime, getDuration],
  )
}
