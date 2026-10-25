import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlaybackStore } from '../usePlaybackStore'

const revoke = vi.fn()

beforeEach(() => {
  URL.revokeObjectURL = revoke
  usePlaybackStore.setState({ audioFileObjectUrl: null })
  usePlaybackStore.getState().reset()
  revoke.mockClear()
})

describe('usePlaybackStore', () => {
  it('revokes the previous object URL when replaced', () => {
    usePlaybackStore.getState().setAudioFileObjectUrl('blob:a')
    expect(revoke).not.toHaveBeenCalled()

    usePlaybackStore.getState().setAudioFileObjectUrl('blob:b')
    expect(revoke).toHaveBeenCalledWith('blob:a')
    expect(usePlaybackStore.getState().audioFileObjectUrl).toBe('blob:b')
  })

  it('reset revokes the current URL and restores defaults', () => {
    const store = usePlaybackStore.getState()
    store.setAudioFileObjectUrl('blob:a')
    store.setStatus('PLAYING')
    store.setVolume(30)

    usePlaybackStore.getState().reset()

    expect(revoke).toHaveBeenCalledWith('blob:a')
    const state = usePlaybackStore.getState()
    expect(state.audioFileObjectUrl).toBeNull()
    expect(state.status).toBe('IDLE')
    expect(state.volume).toBe(100)
  })

  it('toggleMute flips muted', () => {
    usePlaybackStore.getState().toggleMute()
    expect(usePlaybackStore.getState().muted).toBe(true)
    usePlaybackStore.getState().toggleMute()
    expect(usePlaybackStore.getState().muted).toBe(false)
  })
})
