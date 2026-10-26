import { useRef, useCallback, useEffect, useMemo } from 'react'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSongStore } from '@/stores/useSongStore'
import { createStretchPlayer, type StretchPlayer } from '@/lib/stretch-player'
import { computePeaks } from '@/lib/waveform'

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

  const loadFile = useCallback((objectUrl: string) => {
    const ctx = ensureAudioContext()
    const generation = ++loadGenerationRef.current

    stopTimeUpdates()
    void stopPlayback()
    savedPositionRef.current = 0
    durationRef.current = 0

    loadingRef.current = (async () => {
      const response = await fetch(objectUrl)
      const arrayBuffer = await response.arrayBuffer()
      const [audioBuffer, player] = await Promise.all([
        ctx.decodeAudioData(arrayBuffer),
        ensurePlayer(ctx),
      ])
      // A newer loadFile() superseded this one
      if (generation !== loadGenerationRef.current) return

      const channels = Array.from(
        { length: audioBuffer.numberOfChannels },
        (_, ch) => audioBuffer.getChannelData(ch),
      )
      await player.load(channels)
      await player.setSemitones(useSongStore.getState().pitch)
      if (generation !== loadGenerationRef.current) return

      durationRef.current = audioBuffer.duration
      usePlaybackStore.getState().setWaveform(computePeaks(audioBuffer))
      usePlaybackStore.getState().setDuration(audioBuffer.duration)
      usePlaybackStore.getState().setCurrentTime(0)
      usePlaybackStore.getState().setStatus('IDLE')
    })()
  }, [ensureAudioContext, ensurePlayer, stopPlayback, stopTimeUpdates])

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
