import { useRef, useCallback, useEffect, useMemo } from 'react'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { toast } from '@/stores/useToastStore'

let apiLoaded = false
let apiLoading = false
const apiReadyCallbacks: (() => void)[] = []

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve()
  if (apiLoading) {
    return new Promise((resolve) => {
      apiReadyCallbacks.push(resolve)
    })
  }

  apiLoading = true
  return new Promise((resolve) => {
    apiReadyCallbacks.push(resolve)

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true
      apiLoading = false
      prev?.()
      apiReadyCallbacks.forEach((cb) => cb())
      apiReadyCallbacks.length = 0
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
}

export function useYouTubePlayer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const isReadyRef = useRef(false)
  const videoIdRef = useRef<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch (e) {
          console.debug('YT player destroy:', e)
        }
        playerRef.current = null
        isReadyRef.current = false
      }
    }
  }, [])

  const createPlayer = useCallback(
    (videoId: string) => {
      if (!containerRef.current) return

      // Destroy existing player
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch (e) {
          console.debug('YT player destroy:', e)
        }
        playerRef.current = null
        isReadyRef.current = false
      }

      // Create a fresh div for the player
      const el = document.createElement('div')
      el.id = 'yt-player-instance'
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(el)

      videoIdRef.current = videoId

      playerRef.current = new YT.Player(el, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            isReadyRef.current = true
            const p = playerRef.current
            if (p) {
              usePlaybackStore.getState().setDuration(p.getDuration())
            }
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            const store = usePlaybackStore.getState()
            switch (event.data) {
              case YT.PlayerState.PLAYING:
                store.setStatus('PLAYING')
                store.setDuration(event.target.getDuration())
                break
              case YT.PlayerState.PAUSED:
                store.setStatus('PAUSED')
                break
              case YT.PlayerState.ENDED:
                store.setStatus('ENDED')
                break
              case YT.PlayerState.UNSTARTED:
              case YT.PlayerState.CUED:
                store.setStatus('IDLE')
                break
            }
          },
          onError: (event: YT.OnErrorEvent) => {
            const code = event.data
            // Errors 101, 150, 153 = embed not allowed
            if (code === 101 || code === 150 || code === 153) {
              toast.error('此 YouTube 影片不允許嵌入播放，請更換影片或改用本地音檔。')
            }
            // Destroy the player to free resources
            if (playerRef.current) {
              try {
                playerRef.current.destroy()
              } catch {
                // ignore
              }
              playerRef.current = null
              isReadyRef.current = false
            }
          },
        },
      })
    },
    [],
  )

  const loadVideo = useCallback(
    async (videoId: string) => {
      await loadYouTubeAPI()
      createPlayer(videoId)
    },
    [createPlayer],
  )

  const play = useCallback(() => {
    if (playerRef.current && isReadyRef.current) {
      playerRef.current.playVideo()
    }
  }, [])

  const pause = useCallback(() => {
    if (playerRef.current && isReadyRef.current) {
      playerRef.current.pauseVideo()
    }
  }, [])

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current && isReadyRef.current) {
      playerRef.current.seekTo(seconds, true)
    }
  }, [])

  const getCurrentTime = useCallback((): number => {
    if (playerRef.current && isReadyRef.current) {
      return playerRef.current.getCurrentTime()
    }
    return 0
  }, [])

  const getDuration = useCallback((): number => {
    if (playerRef.current && isReadyRef.current) {
      return playerRef.current.getDuration()
    }
    return 0
  }, [])

  const destroy = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.destroy()
      } catch {
        // ignore
      }
      playerRef.current = null
      isReadyRef.current = false
    }
  }, [])

  return useMemo(
    () => ({
      containerRef,
      loadVideo,
      play,
      pause,
      seekTo,
      getCurrentTime,
      getDuration,
      destroy,
      get isReady() {
        return isReadyRef.current
      },
    }),
    [loadVideo, play, pause, seekTo, getCurrentTime, getDuration, destroy],
  )
}
