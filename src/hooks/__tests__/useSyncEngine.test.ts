import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSyncEngine } from '../useSyncEngine'
import { useSongStore } from '@/stores/useSongStore'
import { usePlaybackStore } from '@/stores/usePlaybackStore'
import { useSyncStore } from '@/stores/useSyncStore'

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((e: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  url: string
  constructor(url: string) {
    this.url = url
    FakeWorker.instances.push(this)
  }
  tick() {
    this.onmessage?.({ data: 'tick' } as MessageEvent)
  }
}

const song = {
  id: 1,
  name: 'Sync',
  lrcText: '[00:01.00]a\n[00:05.00]b\n[00:10.00]c',
  offset: 0,
  pitch: 0,
  vocalRemoval: false,
  audioSource: 'youtube' as const,
  youtubeId: null,
  audioFileName: null,
  folderId: null,
  createdAt: 1,
  updatedAt: 1,
}

let time = 0

beforeEach(() => {
  FakeWorker.instances = []
  vi.stubGlobal('Worker', FakeWorker)
  URL.createObjectURL = vi.fn(() => 'blob:sync-worker')
  URL.revokeObjectURL = vi.fn()
  useSongStore.getState().clearSong()
  usePlaybackStore.getState().reset()
  useSyncStore.getState().reset()
  time = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mount() {
  const hook = renderHook(() => useSyncEngine({ getCurrentTime: () => time }))
  return { worker: FakeWorker.instances[0], ...hook }
}

describe('useSyncEngine', () => {
  it('creates one inline worker from a blob URL', () => {
    mount()
    expect(FakeWorker.instances).toHaveLength(1)
    expect(FakeWorker.instances[0].url).toBe('blob:sync-worker')
  })

  it('starts the worker when playback starts and stops it otherwise', () => {
    const { worker } = mount()
    act(() => usePlaybackStore.getState().setStatus('PLAYING'))
    expect(worker.postMessage).toHaveBeenLastCalledWith('start')
    expect(useSyncStore.getState().isSyncing).toBe(true)

    act(() => usePlaybackStore.getState().setStatus('PAUSED'))
    expect(worker.postMessage).toHaveBeenLastCalledWith('stop')
    expect(useSyncStore.getState().isSyncing).toBe(false)
  })

  it('ignores playback store changes that do not change the status', () => {
    const { worker } = mount()
    act(() => usePlaybackStore.getState().setCurrentTime(3))
    act(() => usePlaybackStore.getState().setVolume(50))
    expect(worker.postMessage).not.toHaveBeenCalled()
  })

  it('on each tick publishes the time and the active line (with offset applied)', () => {
    const { worker } = mount()
    useSongStore.getState().loadSong({ ...song, offset: 0.5 })

    time = 4.6 // 4.6 + 0.5 = 5.1 → line "b"
    act(() => worker.tick())
    expect(usePlaybackStore.getState().currentTime).toBe(4.6)
    expect(useSyncStore.getState().currentLineIndex).toBe(1)

    time = 0.2
    act(() => worker.tick())
    expect(useSyncStore.getState().currentLineIndex).toBe(-1)
  })

  it('does not touch the line index when the same line is still active', () => {
    const { worker } = mount()
    useSongStore.getState().loadSong(song)
    const setIndex = vi.spyOn(useSyncStore.getState(), 'setCurrentLineIndex')
    time = 2
    act(() => worker.tick())
    act(() => worker.tick())
    expect(setIndex).toHaveBeenCalledTimes(1)
  })

  it('only updates the time when no lyrics are loaded', () => {
    const { worker } = mount()
    time = 7
    act(() => worker.tick())
    expect(usePlaybackStore.getState().currentTime).toBe(7)
    expect(useSyncStore.getState().currentLineIndex).toBe(-1)
  })

  it('exposes manual startSync / stopSync', () => {
    const { worker, result } = mount()
    act(() => result.current.startSync())
    expect(worker.postMessage).toHaveBeenLastCalledWith('start')
    act(() => result.current.stopSync())
    expect(worker.postMessage).toHaveBeenLastCalledWith('stop')
  })

  it('terminates the worker and revokes the blob URL on unmount', () => {
    const { worker, unmount } = mount()
    unmount()
    expect(worker.postMessage).toHaveBeenLastCalledWith('stop')
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sync-worker')
  })
})
