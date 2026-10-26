import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const youtube = { play: vi.fn(), pause: vi.fn(), seekTo: vi.fn(), getCurrentTime: vi.fn(() => 10), getDuration: vi.fn(() => 200) }
const localAudio = { play: vi.fn(), pause: vi.fn(), seekTo: vi.fn(), getCurrentTime: vi.fn(() => 20), getDuration: vi.fn(() => 300) }
const manual = { start: vi.fn(), pause: vi.fn(), seek: vi.fn(), getCurrentTime: vi.fn(() => 30) }

vi.mock('@/hooks/useYouTubePlayer', () => ({ useYouTubePlayer: () => youtube }))
vi.mock('@/hooks/useLocalAudioPlayer', () => ({ useLocalAudioPlayer: () => localAudio }))
vi.mock('@/hooks/useManualTimer', () => ({ useManualTimer: () => manual }))

const { usePlaybackEngine } = await import('../usePlaybackEngine')
const { useSongStore } = await import('@/stores/useSongStore')
const { usePlaybackStore } = await import('@/stores/usePlaybackStore')

const base = {
  id: 1,
  name: 'E',
  lrcText: '[00:01.00]a',
  offset: 0,
  pitch: 0,
  vocalRemoval: false,
  folderId: null,
  createdAt: 1,
  updatedAt: 1,
}

function loadYouTube() {
  useSongStore.getState().loadSong({ ...base, audioSource: 'youtube', youtubeId: 'yt', audioFileName: null })
}
function loadLocal(withFile = true) {
  useSongStore.getState().loadSong({ ...base, audioSource: 'local', youtubeId: null, audioFileName: 'a.mp3' })
  if (withFile) usePlaybackStore.getState().setAudioFileObjectUrl('blob:a')
}
function loadManual() {
  useSongStore.getState().loadSong({ ...base, audioSource: 'youtube', youtubeId: null, audioFileName: null })
}

beforeEach(() => {
  URL.revokeObjectURL = vi.fn()
  useSongStore.getState().clearSong()
  usePlaybackStore.getState().reset()
  for (const m of [youtube, localAudio, manual]) Object.values(m).forEach((fn) => fn.mockClear())
})

describe('usePlaybackEngine – routing', () => {
  it('drives the YouTube player for a YouTube song', () => {
    loadYouTube()
    const { result } = renderHook(() => usePlaybackEngine())
    result.current.play()
    result.current.pause()
    result.current.seekTo(42)
    expect(youtube.play).toHaveBeenCalled()
    expect(youtube.pause).toHaveBeenCalled()
    expect(youtube.seekTo).toHaveBeenCalledWith(42)
    expect(result.current.getCurrentTime()).toBe(10)
    expect(result.current.getDuration()).toBe(200)
    expect(localAudio.play).not.toHaveBeenCalled()
    expect(manual.start).not.toHaveBeenCalled()
  })

  it('drives the local player once a local file is loaded', () => {
    loadLocal()
    const { result } = renderHook(() => usePlaybackEngine())
    result.current.play()
    result.current.seekTo(5)
    expect(localAudio.play).toHaveBeenCalled()
    expect(localAudio.seekTo).toHaveBeenCalledWith(5)
    expect(result.current.getCurrentTime()).toBe(20)
    expect(result.current.getDuration()).toBe(300)
  })

  it('falls back to the manual timer when lyrics exist but no audio is available', () => {
    loadManual()
    const { result } = renderHook(() => usePlaybackEngine())
    result.current.play()
    result.current.pause()
    expect(manual.start).toHaveBeenCalled()
    expect(manual.pause).toHaveBeenCalled()
    expect(result.current.getCurrentTime()).toBe(30)
    expect(result.current.getDuration()).toBe(0)
  })

  it('uses the manual timer for a local song whose file has not been picked yet', () => {
    loadLocal(false)
    const { result } = renderHook(() => usePlaybackEngine())
    result.current.play()
    expect(manual.start).toHaveBeenCalled()
    expect(localAudio.play).not.toHaveBeenCalled()
  })

  it('routes to the local player (not manual) when there are no lyrics', () => {
    useSongStore.getState().loadSong({ ...base, lrcText: '', audioSource: 'local', youtubeId: null, audioFileName: null })
    const { result } = renderHook(() => usePlaybackEngine())
    result.current.play()
    expect(localAudio.play).toHaveBeenCalled()
  })
})

describe('usePlaybackEngine – seeking & toggling', () => {
  it('seekBy adds to the current time and never goes below zero', () => {
    loadYouTube()
    const { result } = renderHook(() => usePlaybackEngine())
    result.current.seekBy(5)
    expect(youtube.seekTo).toHaveBeenLastCalledWith(15)
    result.current.seekBy(-50)
    expect(youtube.seekTo).toHaveBeenLastCalledWith(0)

    loadLocal()
    result.current.seekBy(-5)
    expect(localAudio.seekTo).toHaveBeenLastCalledWith(15)
  })

  it('manual seekTo is expressed as a delta from the current time', () => {
    loadManual()
    const { result } = renderHook(() => usePlaybackEngine())
    result.current.seekTo(45)
    expect(manual.seek).toHaveBeenCalledWith(15)
    result.current.seekBy(-7)
    expect(manual.seek).toHaveBeenLastCalledWith(-7)
  })

  it('togglePlay pauses while playing and plays otherwise', () => {
    loadYouTube()
    const { result } = renderHook(() => usePlaybackEngine())
    result.current.togglePlay()
    expect(youtube.play).toHaveBeenCalledTimes(1)
    usePlaybackStore.getState().setStatus('PLAYING')
    result.current.togglePlay()
    expect(youtube.pause).toHaveBeenCalledTimes(1)
  })

  it('stopAll pauses every engine and marks playback idle', () => {
    loadYouTube()
    usePlaybackStore.getState().setStatus('PLAYING')
    const { result } = renderHook(() => usePlaybackEngine())
    result.current.stopAll()
    expect(youtube.pause).toHaveBeenCalled()
    expect(localAudio.pause).toHaveBeenCalled()
    expect(manual.pause).toHaveBeenCalled()
    expect(usePlaybackStore.getState().status).toBe('IDLE')
  })

  it('returns a stable object across re-renders', () => {
    const { result, rerender } = renderHook(() => usePlaybackEngine())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
