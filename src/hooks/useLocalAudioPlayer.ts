import { useRef, useCallback, useEffect, useMemo } from 'react'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSongStore } from '@/stores/useSongStore'
import { createStretchPlayer, type StretchPlayer } from '@/lib/stretch-player'
import { computePeaks } from '@/lib/waveform'
import { removeCenterChannel } from '@/lib/vocal-removal'

/**
 * Local file playback through a Signalsmith Stretch worklet. The worklet owns
 * the decoded samples and applies the pitch shift in real time, so changing the
 * key while playing is seamless and never needs reprocessing.
 */
export function useLocalAudioPlayer() {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const playerRef = useRef<StretchPlayer | null>(null)
  const playerPromiseRef = useRef<Promise<StretchPlayer> | null>(null)

  const durationRef = useRef(0)
  const savedPositionRef = useRef(0)
  const rafIdRef = useRef(0)
  const loadingRef = useRef<Promise<void> | null>(null)
  const loadGenerationRef = useRef(0)
  const startingRef = useRef(false)

  // Decoded samples of the current file. The side (去人聲) version is computed
  // lazily on first use and cached until the next file loads.
  const originalChannelsRef = useRef<Float32Array[] | null>(null)
  const sideChannelsRef = useRef<Float32Array[] | null>(null)
  const loadedVariantRef = useRef<'original' | 'side'>('original')
  const swappingRef = useRef<Promise<void> | null>(null)

  const stopTimeUpdates = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current)
  }, [])

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }, [])

  const ensureGain = useCallback((ctx: AudioContext) => {
    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain()
      gainNodeRef.current.connect(ctx.destination)
    }
    const { volume, muted } = usePlaybackStore.getState()
    gainNodeRef.current.gain.value = muted ? 0 : volume / 100
    return gainNodeRef.current
  }, [])

  // Create the stretch node once per AudioContext (loads WASM on first use)
  const ensurePlayer = useCallback((ctx: AudioContext) => {
    if (!playerPromiseRef.current) {
      playerPromiseRef.current = createStretchPlayer(ctx).then((player) => {
        player.connect(ensureGain(ctx))
        playerRef.current = player
        return player
      })
    }
    return playerPromiseRef.current
  }, [ensureGain])

  const getCurrentTime = useCallback((): number => {
    const player = playerRef.current
    if (player?.isPlaying()) return Math.min(player.getCurrentTime(), durationRef.current)
    return savedPositionRef.current
  }, [])

  const stopPlayback = useCallback(async () => {
    const player = playerRef.current
    if (!player) return
    savedPositionRef.current = getCurrentTime()
    await player.stop()
  }, [getCurrentTime])

  // Watches for end-of-buffer; displayed time is pushed by the sync engine
  const startTimeUpdates = useCallback(() => {
    const update = () => {
      const player = playerRef.current
      if (!player?.isPlaying()) return

      if (player.getCurrentTime() >= durationRef.current) {
        stopTimeUpdates()
        void player.stop()
        savedPositionRef.current = 0
        usePlaybackStore.getState().setCurrentTime(durationRef.current)
        usePlaybackStore.getState().setStatus('ENDED')
        return
      }
      rafIdRef.current = requestAnimationFrame(update)
    }
    rafIdRef.current = requestAnimationFrame(update)
  }, [stopTimeUpdates])

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

  // Pitch changes apply live, even mid-playback
  useEffect(() => {
    let prevPitch = useSongStore.getState().pitch

    const unsub = useSongStore.subscribe((state) => {
      if (state.pitch === prevPitch) return
      prevPitch = state.pitch
      void playerRef.current?.setSemitones(state.pitch)
    })
    return unsub
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeUpdates()
      playerRef.current?.disconnect()
      playerRef.current = null
      playerPromiseRef.current = null
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect()
        gainNodeRef.current = null
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }
  }, [stopTimeUpdates])

  /** Channels to feed the worklet for the current 去人聲 setting. */
  const channelsFor = useCallback((vocalRemoval: boolean): Float32Array[] | null => {
    const original = originalChannelsRef.current
    if (!original) return null
    if (!vocalRemoval) return original
    if (!sideChannelsRef.current) sideChannelsRef.current = removeCenterChannel(original)
    return sideChannelsRef.current
  }, [])

  /**
   * Swap the worklet's buffers between the original and side versions while
   * keeping the playback position and play/pause state.
   */
  const applyVocalRemoval = useCallback(
    (vocalRemoval: boolean) => {
      const run = async () => {
        if (swappingRef.current) await swappingRef.current
        if (loadingRef.current) await loadingRef.current

        const player = playerRef.current
        const generation = loadGenerationRef.current
        const variant = vocalRemoval ? 'side' : 'original'
        if (!player || durationRef.current === 0 || loadedVariantRef.current === variant) return

        const channels = channelsFor(vocalRemoval)
        if (!channels || generation !== loadGenerationRef.current) return

        const wasPlaying = player.isPlaying()
        const position = getCurrentTime()
        stopTimeUpdates()
        await player.load(channels)
        if (generation !== loadGenerationRef.current) return
        loadedVariantRef.current = variant
        savedPositionRef.current = position

        // Re-check the store: pause() may have run while buffers were swapping
        if (wasPlaying && usePlaybackStore.getState().status === 'PLAYING') {
          await player.start(position, useSongStore.getState().pitch)
          startTimeUpdates()
        }
      }
      const promise = run().finally(() => {
        if (swappingRef.current === promise) swappingRef.current = null
      })
      swappingRef.current = promise
    },
    [channelsFor, getCurrentTime, startTimeUpdates, stopTimeUpdates],
  )

  // 去人聲 toggles swap buffers live; a new file picks up the flag in loadFile
  useEffect(() => {
    let prev = useSongStore.getState().vocalRemoval

    const unsub = useSongStore.subscribe((state) => {
      if (state.vocalRemoval === prev) return
      prev = state.vocalRemoval
      applyVocalRemoval(state.vocalRemoval)
    })
    return unsub
  }, [applyVocalRemoval])

  const loadFile = useCallback((objectUrl: string) => {
    const ctx = ensureAudioContext()
    const generation = ++loadGenerationRef.current

    stopTimeUpdates()
    void stopPlayback()
    savedPositionRef.current = 0
    durationRef.current = 0
    originalChannelsRef.current = null
    sideChannelsRef.current = null

    loadingRef.current = (async () => {
      const response = await fetch(objectUrl)
      const arrayBuffer = await response.arrayBuffer()
      const [audioBuffer, player] = await Promise.all([
        ctx.decodeAudioData(arrayBuffer),
        ensurePlayer(ctx),
      ])
      // A newer loadFile() superseded this one
      if (generation !== loadGenerationRef.current) return

      const original = Array.from(
        { length: audioBuffer.numberOfChannels },
        (_, ch) => audioBuffer.getChannelData(ch),
      )
      originalChannelsRef.current = original
      const vocalRemoval = useSongStore.getState().vocalRemoval
      loadedVariantRef.current = vocalRemoval ? 'side' : 'original'
      await player.load(channelsFor(vocalRemoval) ?? original)
      await player.setSemitones(useSongStore.getState().pitch)
      if (generation !== loadGenerationRef.current) return

      durationRef.current = audioBuffer.duration
      usePlaybackStore.getState().setWaveform(computePeaks(audioBuffer))
      usePlaybackStore.getState().setDuration(audioBuffer.duration)
      usePlaybackStore.getState().setCurrentTime(0)
      usePlaybackStore.getState().setStatus('IDLE')
    })()
  }, [channelsFor, ensureAudioContext, ensurePlayer, stopPlayback, stopTimeUpdates])

  const play = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true
    try {
      const ctx = ensureAudioContext()

      // Resume while still in the user-gesture context (autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      if (loadingRef.current) {
        await loadingRef.current
        loadingRef.current = null
      }
      if (swappingRef.current) await swappingRef.current

      const player = playerRef.current
      if (!player || durationRef.current === 0) return

      // Resume again in case pause() ran while we were waiting
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      const offset = Math.max(0, Math.min(durationRef.current, savedPositionRef.current))
      await player.start(offset, useSongStore.getState().pitch)
      startTimeUpdates()
      usePlaybackStore.getState().setStatus('PLAYING')
    } finally {
      startingRef.current = false
    }
  }, [ensureAudioContext, startTimeUpdates])

  const pause = useCallback(() => {
    stopTimeUpdates()
    void stopPlayback()
    audioCtxRef.current?.suspend()
    usePlaybackStore.getState().setCurrentTime(savedPositionRef.current)
    usePlaybackStore.getState().setStatus('PAUSED')
  }, [stopPlayback, stopTimeUpdates])

  const seekTo = useCallback((seconds: number) => {
    if (durationRef.current === 0) return
    const clamped = Math.max(0, Math.min(durationRef.current, seconds))
    savedPositionRef.current = clamped
    usePlaybackStore.getState().setCurrentTime(clamped)

    const player = playerRef.current
    if (player?.isPlaying()) {
      void player.start(clamped, useSongStore.getState().pitch)
    }
  }, [])

  const getDuration = useCallback((): number => durationRef.current, [])

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
