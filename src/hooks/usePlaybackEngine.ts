import { useCallback, useMemo } from 'react'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useYouTubePlayer } from './useYouTubePlayer'
import { useLocalAudioPlayer } from './useLocalAudioPlayer'
import { useManualTimer } from './useManualTimer'

export function usePlaybackEngine() {
  const youtube = useYouTubePlayer()
  const localAudio = useLocalAudioPlayer()
  const manual = useManualTimer()

  const getActiveEngine = useCallback(() => {
    const { audioSource, youtubeId, lyrics } = useSongStore.getState()
    const { audioFileObjectUrl } = usePlaybackStore.getState()

    const hasAudio =
      (audioSource === 'youtube' && !!youtubeId) ||
      (audioSource === 'local' && !!audioFileObjectUrl)

    if (!hasAudio && lyrics.length > 0) return 'manual'
    if (audioSource === 'local') return 'local'
    return 'youtube'
  }, [])

  const play = useCallback(() => {
    const engine = getActiveEngine()
    switch (engine) {
      case 'youtube':
        youtube.play()
        break
      case 'local':
        localAudio.play()
        break
      case 'manual':
        manual.start()
        break
    }
  }, [getActiveEngine, youtube, localAudio, manual])

  const pause = useCallback(() => {
    const engine = getActiveEngine()
    switch (engine) {
      case 'youtube':
        youtube.pause()
        break
      case 'local':
        localAudio.pause()
        break
      case 'manual':
        manual.pause()
        break
    }
  }, [getActiveEngine, youtube, localAudio, manual])

  const togglePlay = useCallback(() => {
    const { status } = usePlaybackStore.getState()
    if (status === 'PLAYING') {
      pause()
    } else {
      play()
    }
  }, [play, pause])

  const seekTo = useCallback(
    (seconds: number) => {
      const engine = getActiveEngine()
      switch (engine) {
        case 'youtube':
          youtube.seekTo(seconds)
          break
        case 'local':
          localAudio.seekTo(seconds)
          break
        case 'manual': {
          // Manual timer doesn't have seekTo, calculate delta
          const current = manual.getCurrentTime()
          manual.seek(seconds - current)
          break
        }
      }
    },
    [getActiveEngine, youtube, localAudio, manual],
  )

  const seekBy = useCallback(
    (delta: number) => {
      const engine = getActiveEngine()
      switch (engine) {
        case 'youtube': {
          const t = youtube.getCurrentTime() + delta
          youtube.seekTo(Math.max(0, t))
          break
        }
        case 'local': {
          const t = localAudio.getCurrentTime() + delta
          localAudio.seekTo(Math.max(0, t))
          break
        }
        case 'manual':
          manual.seek(delta)
          break
      }
    },
    [getActiveEngine, youtube, localAudio, manual],
  )

  const getCurrentTime = useCallback((): number => {
    const engine = getActiveEngine()
    switch (engine) {
      case 'youtube':
        return youtube.getCurrentTime()
      case 'local':
        return localAudio.getCurrentTime()
      case 'manual':
        return manual.getCurrentTime()
    }
  }, [getActiveEngine, youtube, localAudio, manual])

  const getDuration = useCallback((): number => {
    const engine = getActiveEngine()
    switch (engine) {
      case 'youtube':
        return youtube.getDuration()
      case 'local':
        return localAudio.getDuration()
      case 'manual':
        return 0 // manual has no known duration
    }
  }, [getActiveEngine, youtube, localAudio])

  // Stop all engines (used when clearing/switching songs)
  const stopAll = useCallback(() => {
    youtube.pause()
    localAudio.pause()
    manual.pause()
    usePlaybackStore.getState().setStatus('IDLE')
  }, [youtube, localAudio, manual])

  return useMemo(
    () => ({
      play,
      pause,
      togglePlay,
      seekTo,
      seekBy,
      getCurrentTime,
      getDuration,
      stopAll,
      youtube,
      localAudio,
      manual,
    }),
    [play, pause, togglePlay, seekTo, seekBy, getCurrentTime, getDuration, stopAll, youtube, localAudio, manual],
  )
}
